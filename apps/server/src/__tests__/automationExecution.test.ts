// Filled-in integration test (not a generated stub) for automation execution — the scheduler
// added 2026-08-27 that finally runs Automation rows instead of just storing them (see
// AutomationExecutorService.ts, automationScheduling.ts). Exercises the real LEAD_CREATED path
// through the actual HTTP surface (landing-page submission), matching acquisitionPath.test.ts's
// minimal recipe for triggering a real Contact + Lead, then calls runDueAutomations() directly
// (bypassing the real setInterval) to make execution deterministic in tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db, issueSid } from '@project/db'
import { runDueAutomations } from '../services/AutomationExecutorService'
import { scheduleAutomationRuns } from '../lib/automationScheduling'

const app = buildTestApp()

// Minimal recipe from acquisitionPath.test.ts's "no prior tracked click" case — the shortest
// real path to a genuine LEAD_CREATED event, since Lead has no direct create endpoint.
async function submitLead(email: string): Promise<{ contactId: string; leadId: string }> {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Automation Test Template',
      isSystem: true,
      schema: { sections: [], themeTokens: [] },
    },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: 'Automation test form',
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
    },
  })
  const formId = formRes.json().data.id

  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'Automation Test Page',
      slug: `automation-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      formId,
    },
  })
  const page = pageRes.json().data

  await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/publish`,
    headers: asAuth(testUserId),
  })

  const submitRes = await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/submissions`,
    payload: { sessionId: issueSid().token, data: { email } },
  })
  expect(submitRes.statusCode).toBe(201)
  const result = submitRes.json().data
  return { contactId: result.contactId, leadId: result.leadId }
}

describe('automation execution', () => {
  it('LEAD_CREATED -> SEND_EMAIL fires when due: EXECUTED run, SENT log, EMAIL_SENT interaction', async () => {
    const automation = await db.automation.create({
      data: {
        businessId: testBusinessId,
        name: 'Welcome email',
        trigger: 'LEAD_CREATED',
        waitDays: 0,
        action: 'SEND_EMAIL',
        isActive: true,
      },
    })

    const { contactId } = await submitLead('welcome@example.com')

    const run = await db.automationRun.findFirstOrThrow({
      where: { automationId: automation.id, contactId },
    })
    expect(run.status).toBe('PENDING')
    expect(run.runAt.getTime()).toBeLessThanOrEqual(Date.now())

    const result = await runDueAutomations()
    expect(result.processed).toBeGreaterThanOrEqual(1)
    expect(result.failed).toBe(0)

    const updatedRun = await db.automationRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(updatedRun.status).toBe('EXECUTED')

    const log = await db.automationLog.findFirstOrThrow({
      where: { automationId: automation.id, contactId },
    })
    expect(log.outcome).toBe('SENT')
    expect(log.action).toBe('SEND_EMAIL')

    const interaction = await db.interaction.findFirstOrThrow({
      where: { contactId, type: 'EMAIL_SENT' },
    })
    expect((interaction.metadata as { automationId?: string } | null)?.automationId).toBe(
      automation.id,
    )
  })

  it('a default stop condition (email opt-out) skips the run instead of sending', async () => {
    const automation = await db.automation.create({
      data: {
        businessId: testBusinessId,
        name: 'Opt-out test',
        trigger: 'LEAD_CREATED',
        waitDays: 0,
        action: 'SEND_EMAIL',
        isActive: true,
      },
    })

    const { contactId } = await submitLead('optout@example.com')
    await db.contact.update({
      where: { id: contactId },
      data: { emailEligible: false, emailOptOutAt: new Date() },
    })

    await runDueAutomations()

    const log = await db.automationLog.findFirstOrThrow({
      where: { automationId: automation.id, contactId },
    })
    expect(log.outcome).toBe('SKIPPED')
    expect(log.reasonSkipped).toBe('Contact is not email-eligible')

    const interaction = await db.interaction.findFirst({ where: { contactId, type: 'EMAIL_SENT' } })
    expect(interaction).toBeNull()
  })

  it('CHANGE_LEAD_STATUS action updates the lead stage', async () => {
    const automation = await db.automation.create({
      data: {
        businessId: testBusinessId,
        name: 'Auto-qualify',
        trigger: 'LEAD_CREATED',
        waitDays: 0,
        action: 'CHANGE_LEAD_STATUS',
        actionValue: { stage: 'CONTACTED' },
        isActive: true,
      },
    })

    const { leadId } = await submitLead('stage-change@example.com')
    await runDueAutomations()

    const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } })
    expect(lead.stage).toBe('CONTACTED')

    const log = await db.automationLog.findFirstOrThrow({ where: { automationId: automation.id } })
    expect(log.outcome).toBe('SENT')
  })

  it('scheduling the same trigger event twice does not create a duplicate AutomationRun', async () => {
    const automation = await db.automation.create({
      data: {
        businessId: testBusinessId,
        name: 'Dedup test',
        trigger: 'SALE_RECORDED',
        waitDays: 1,
        action: 'NOTIFY_USER',
        isActive: true,
      },
    })
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Dedup Contact' },
    })
    const args = {
      businessId: testBusinessId,
      trigger: 'SALE_RECORDED' as const,
      contactId: contact.id,
      triggerSourceId: 'fixed-source-id-for-dedup-test',
      triggerEventAt: new Date(),
    }

    await scheduleAutomationRuns(db, args)
    await scheduleAutomationRuns(db, args)

    const runs = await db.automationRun.findMany({
      where: { automationId: automation.id, contactId: contact.id },
    })
    expect(runs).toHaveLength(1)
  })

  it('a paused automation is skipped at execution time even though the run was already scheduled', async () => {
    const automation = await db.automation.create({
      data: {
        businessId: testBusinessId,
        name: 'Pause test',
        trigger: 'LEAD_CREATED',
        waitDays: 0,
        action: 'SEND_EMAIL',
        isActive: true,
      },
    })

    const { contactId } = await submitLead('paused@example.com')
    await db.automation.update({
      where: { id: automation.id },
      data: { isActive: false, pausedAt: new Date() },
    })

    await runDueAutomations()

    const log = await db.automationLog.findFirstOrThrow({
      where: { automationId: automation.id, contactId },
    })
    expect(log.outcome).toBe('SKIPPED')
    expect(log.reasonSkipped).toBe('Automation is paused')
  })
})
