import { db } from '@project/db'
import type { Automation, AutomationRun, Contact, Lead } from '@prisma/client'

import { AutomationConditionService } from './AutomationConditionService'
import { AutomationActionService } from './AutomationActionService'

const conditionService = new AutomationConditionService()
const actionService = new AutomationActionService()

async function processRun(run: AutomationRun): Promise<void> {
  const automation = await db.automation.findUnique({ where: { id: run.automationId } })
  const contact = await db.contact.findUnique({ where: { id: run.contactId } })
  if (!automation || !contact) {
    // Parent row was hard-deleted between scheduling and execution — nothing sane to log against.
    await db.automationRun.update({ where: { id: run.id }, data: { status: 'CANCELED' } })
    return
  }
  const lead = run.leadId ? await db.lead.findUnique({ where: { id: run.leadId } }) : null

  const stopCheck = await conditionService.checkDefaultStopConditions(
    automation,
    run,
    contact,
    lead,
  )
  const evalResult = stopCheck.skip
    ? stopCheck
    : await conditionService.checkCondition(automation, contact, lead)

  if (evalResult.skip) {
    await db.$transaction([
      db.automationRun.update({ where: { id: run.id }, data: { status: 'SKIPPED' } }),
      db.automationLog.create({
        data: {
          automationId: automation.id,
          contactId: contact.id,
          action: automation.action,
          outcome: 'SKIPPED',
          reasonSkipped: evalResult.reason,
        },
      }),
    ])
    return
  }

  await actionService.fireAction(automation, run, contact)
  await db.$transaction([
    db.automationRun.update({ where: { id: run.id }, data: { status: 'EXECUTED' } }),
    db.automationLog.create({
      data: {
        automationId: automation.id,
        contactId: contact.id,
        action: automation.action,
        outcome: 'SENT',
      },
    }),
  ])
}

// Pollable entrypoint — called on a timer from index.ts, and directly (bypassing the timer) in
// tests. One bad run can't take down the tick: failures are caught, logged, and counted, not
// thrown.
export async function runDueAutomations(): Promise<{ processed: number; failed: number }> {
  const dueRuns = await db.automationRun.findMany({
    where: { status: 'PENDING', runAt: { lte: new Date() } },
  })

  let failed = 0
  for (const run of dueRuns) {
    try {
      await processRun(run)
    } catch (err) {
      failed++
      await db.automationLog
        .create({
          data: {
            automationId: run.automationId,
            contactId: run.contactId,
            action:
              (await db.automation.findUnique({ where: { id: run.automationId } }))?.action ??
              'NOTIFY_USER',
            outcome: 'FAILED',
            reasonSkipped: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error',
          },
        })
        .catch(() => {})
      await db.automationRun
        .update({ where: { id: run.id }, data: { status: 'CANCELED' } })
        .catch(() => {})
    }
  }

  return { processed: dueRuns.length, failed }
}
