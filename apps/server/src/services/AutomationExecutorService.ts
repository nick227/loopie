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
    const [_, log] = await db.$transaction([
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

    try {
      const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
      await ActivityProjectionService.project(
        automation.businessId,
        'AutomationLog',
        log.id,
        'project',
        log,
        automation,
      )
    } catch (err) {
      console.error('Failed to project automation skipped', err)
    }

    return
  }

  await actionService.fireAction(automation, run, contact)
  const [_, sentLog] = await db.$transaction([
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

  try {
    const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
    await ActivityProjectionService.project(
      automation.businessId,
      'AutomationLog',
      sentLog.id,
      'project',
      sentLog,
      automation,
    )
  } catch (err) {
    console.error('Failed to project automation sent', err)
  }
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

      const automation = await db.automation.findUnique({ where: { id: run.automationId } })

      const failedLog = await db.automationLog
        .create({
          data: {
            automationId: run.automationId,
            contactId: run.contactId,
            action: automation?.action ?? 'NOTIFY_USER',
            outcome: 'FAILED',
            reasonSkipped: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error',
          },
        })
        .catch(() => null)

      if (failedLog && automation) {
        try {
          const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
          await ActivityProjectionService.project(
            automation.businessId,
            'AutomationLog',
            failedLog.id,
            'project',
            failedLog,
            automation,
          )
        } catch (projErr) {
          console.error('Failed to project automation error', projErr)
        }
      }

      await db.automationRun
        .update({ where: { id: run.id }, data: { status: 'CANCELED' } })
        .catch(() => {})
    }
  }

  return { processed: dueRuns.length, failed }
}
