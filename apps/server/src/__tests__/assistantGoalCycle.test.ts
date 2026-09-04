// Assistant goal cycle (Learn -> Act -> Review -> Grow) — the full roofing path end-to-end
// against the real HTTP app + live test DB, plus a shorter web-development traversal proving the
// taxonomy/playbook selection is data-driven, not roofing-specific. See
// docs/loopie-assistant-playbook-poc/05-poc-flow-fixtures.md (fixtures A, E, F, G).
import { describe, it, expect } from 'vitest'
import {
  buildTestApp,
  asAuth,
  testUserId,
  testBusinessId,
  testOtherUserId,
  testOtherBusinessId,
} from './helpers'
import { db } from '@project/db'

const app = buildTestApp()
const HOMEPAGE_TEMPLATE_ID = 'system-template-corporate-professional'

async function getNextAction(userId: string) {
  const res = await app.inject({
    method: 'GET',
    url: '/assistant/next-action',
    headers: asAuth(userId),
  })
  expect(res.statusCode).toBe(200)
  return res.json().data
}

async function answer(userId: string, questionKey: string, value: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/assistant/goal-cycle/answer',
    headers: asAuth(userId),
    payload: { questionKey, value },
  })
  expect(res.statusCode).toBe(200)
  return res.json().data
}

// Satisfies the Business/Page/Advertising priority chain ahead of the GOAL_CYCLE slot so these
// tests exercise the Assistant's goal-cycle logic, not the already-covered chain above it
// (assistant.test.ts).
async function clearCrossProductChain(userId: string, businessId: string) {
  await app.inject({
    method: 'PATCH',
    url: '/business',
    headers: asAuth(userId),
    payload: {
      industry: 'Roofing',
      location: 'Austin, TX',
      phone: '555-0100',
      email: 'hi@example.com',
      description: 'We do roofing.',
      logoUrl: 'https://example.com/logo.png',
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(userId),
    payload: {
      templateId: HOMEPAGE_TEMPLATE_ID,
      name: 'Homepage',
      slug: `gc-homepage-${businessId}-${Date.now()}`,
    },
  })
  const pageId = pageRes.json().data.id
  await app.inject({
    method: 'POST',
    url: `/landing-pages/${pageId}/publish`,
    headers: asAuth(userId),
  })
  // Grab the real hosted URL the way the client would (via the assistant's own campaign_create
  // suggestion) rather than reconstructing it — PUBLIC_BASE_URL is environment-specific.
  const promoteAction = await getNextAction(userId)
  expect(promoteAction).toMatchObject({ type: 'ADVERTISING', actionId: 'campaign_create' })
  const campaignRes = await app.inject({
    method: 'POST',
    url: '/campaigns',
    headers: asAuth(userId),
    payload: { name: 'Promote homepage', destinationUrl: promoteAction.pageUrl },
  })
  const campaignId = campaignRes.json().data.id
  const creative = await db.creative.create({ data: { businessId, name: 'Homepage ad' } })
  await db.campaignCreative.create({ data: { campaignId, creativeId: creative.id } })
}

describe('assistant goal cycle', () => {
  it('walks the full Roofing path: Learn -> Act -> a sale signal enters Review -> Grow -> next Act cycle', async () => {
    await clearCrossProductChain(testUserId, testBusinessId)

    // --- LEARN: taxonomy ---
    let action = await getNextAction(testUserId)
    expect(action).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'learn_step' })
    expect(action.cycleId).toBeNull()
    expect(action.step.key).toBe('venture_family')

    action = await answer(testUserId, 'ventureFamily', 'LOCAL_SERVICES')
    expect(action.step).toMatchObject({ key: 'business_group' })

    action = await answer(testUserId, 'businessGroup', 'HOME_SERVICES')
    expect(action.step).toMatchObject({ key: 'venture_type' })
    expect(action.step.choices.map((c: any) => c.value)).toContain('ROOFING')

    action = await answer(testUserId, 'ventureType', 'ROOFING')
    expect(action.step).toMatchObject({ key: 'primary_goal' })

    // Answering primaryGoal creates the AssistantGoalCycle row.
    action = await answer(testUserId, 'primaryGoal', 'GET_MORE_CUSTOMERS')
    expect(action.cycleId).not.toBeNull()
    const cycleId = action.cycleId

    // --- LEARN: qualification (playbook-specific) ---
    // service_area is skipped: Business.location was already set above (the Reuse rule — known
    // fact -> skip question — reusing the canonical column, not a duplicate knowledge field).
    expect(action.step).toMatchObject({ key: 'target_customer' })

    action = await answer(testUserId, 'targetCustomer', 'HOMEOWNERS')
    expect(action.step).toMatchObject({ key: 'customer_goal' })

    action = await answer(testUserId, 'customerGoalBand', 'FOUR_TO_TEN')
    expect(action.step).toMatchObject({ key: 'weekly_time' })

    action = await answer(testUserId, 'weeklyGrowthTimeBand', 'TWO_TO_FIVE')
    expect(action.step).toMatchObject({ key: 'marketing_budget' })

    // --- LEARN done -> Act's plan preview ---
    action = await answer(testUserId, 'marketingBudgetBand', 'ONE_TO_FIVE_HUNDRED')
    expect(action).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'build_plan', cycleId })
    expect(action.plan.length).toBe(6)
    expect(action.plan.map((t: any) => t.templateId)).toContain('system-idea-contact-prospects')
    const contactStep = action.plan.find(
      (t: any) => t.templateId === 'system-idea-contact-prospects',
    )
    expect(contactStep.title).toBe('Contact 10 prospects') // FOUR_TO_TEN -> 10

    // --- Act: schedule the plan onto Calendar ---
    const scheduleRes = await app.inject({
      method: 'POST',
      url: '/assistant/goal-cycle/schedule-plan',
      headers: asAuth(testUserId),
      payload: { cycleId },
    })
    expect(scheduleRes.statusCode).toBe(200)

    const scheduled = await db.scheduledGoal.findMany({ where: { assistantGoalCycleId: cycleId } })
    expect(scheduled.length).toBe(6)
    expect(scheduled.every((g) => g.source === 'ASSISTANT_PLAYBOOK')).toBe(true)
    const cycleAfterSchedule = await db.assistantGoalCycle.findUniqueOrThrow({
      where: { id: cycleId },
    })
    expect(cycleAfterSchedule.phase).toBe('ACT')
    expect(cycleAfterSchedule.actStartedAt).not.toBeNull()

    // Nothing due for review yet, no signal -> the goal-cycle slot has nothing to show, so the
    // (already-satisfied) chain falls all the way through to the Calendar fallback.
    action = await getNextAction(testUserId)
    expect(action.type).toBe('CALENDAR')

    // --- A sale is recorded during the cycle (fixture E) -> signal + auto-advance to Review/Grow ---
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Jamie Homeowner' },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        stage: 'CLOSED',
        sourceType: 'MANUAL',
        openSlot: null,
        closedAt: new Date(),
      },
    })
    await db.sale.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        leadId: lead.id,
        amount: 4200,
        date: new Date(),
        productOrService: 'Roof replacement',
        sourceType: 'MANUAL',
      },
    })

    action = await getNextAction(testUserId)
    expect(action).toMatchObject({ type: 'SIGNAL', actionId: 'sale_recorded', cycleId })
    expect(action.signalSummary.headline).toBe('You made a sale.')

    const cycleAfterSale = await db.assistantGoalCycle.findUniqueOrThrow({ where: { id: cycleId } })
    expect(cycleAfterSale.phase).toBe('GROW')
    expect(cycleAfterSale.reviewOutcome).toBe('WORKING')

    // --- Grow: the next read (signal already shown once) presents the Grow directions ---
    action = await getNextAction(testUserId)
    expect(action).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'grow', cycleId })
    expect(action.growSummary.directions.map((d: any) => d.value)).toContain('DO_MORE')

    // --- Choosing "Do more of this" completes this cycle and starts the next Act cycle without
    // repeating any Learn question (fixture F). ---
    const growRes = await app.inject({
      method: 'POST',
      url: '/assistant/goal-cycle/grow',
      headers: asAuth(testUserId),
      payload: { cycleId, direction: 'DO_MORE' },
    })
    expect(growRes.statusCode).toBe(200)
    const nextAction = growRes.json().data
    expect(nextAction).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'build_plan' })
    expect(nextAction.cycleId).not.toBe(cycleId)
    expect(nextAction.plan.length).toBe(6)

    const completedCycle = await db.assistantGoalCycle.findUniqueOrThrow({ where: { id: cycleId } })
    expect(completedCycle.status).toBe('COMPLETED')
  })

  it('a materially different business (Web Development) resolves its own playbook and qualification questions', async () => {
    await clearCrossProductChain(testOtherUserId, testOtherBusinessId)

    let action = await answer(testOtherUserId, 'ventureFamily', 'PROFESSIONAL_SERVICES')
    expect(action.step).toMatchObject({ key: 'business_group' })

    action = await answer(testOtherUserId, 'businessGroup', 'DIGITAL_SERVICES')
    expect(action.step.choices.map((c: any) => c.value)).toContain('WEB_DEVELOPMENT')

    action = await answer(testOtherUserId, 'ventureType', 'WEB_DEVELOPMENT')
    action = await answer(testOtherUserId, 'primaryGoal', 'GET_MORE_CUSTOMERS')
    const cycleId = action.cycleId

    // Web development's own first qualification question — different choices than roofing's.
    expect(action.step.key).toBe('target_customer')
    expect(action.step.choices.map((c: any) => c.value)).toEqual([
      'INDIVIDUALS',
      'SMALL_BUSINESSES',
      'STARTUPS',
      'ENTERPRISES',
    ])

    action = await answer(testOtherUserId, 'targetCustomer', 'SMALL_BUSINESSES')
    expect(action.step).toMatchObject({ key: 'primary_offer' })
    action = await answer(testOtherUserId, 'primaryOffer', 'WEB_APPS')
    action = await answer(testOtherUserId, 'customerGoalBand', 'ONE_TO_THREE')
    action = await answer(testOtherUserId, 'weeklyGrowthTimeBand', 'FIVE_PLUS')

    expect(action).toMatchObject({ type: 'GOAL_CYCLE', actionId: 'build_plan', cycleId })
    // Shares 4 of 6 steps verbatim with the roofing playbook, proving template reuse across
    // verticals rather than a second task universe.
    expect(action.plan.map((t: any) => t.templateId)).toEqual(
      expect.arrayContaining([
        'system-idea-define-primary-offer',
        'system-idea-publish-homepage',
        'system-idea-first-audience',
        'system-idea-contact-prospects',
      ]),
    )
    expect(action.plan.map((t: any) => t.templateId)).toContain(
      'system-idea-send-proposal-to-interested',
    )
  })
})
