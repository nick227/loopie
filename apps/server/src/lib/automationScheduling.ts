import type { Prisma, AutomationTrigger } from '@prisma/client'
import { isUniqueConflict } from './prismaError'

// Event-sourced scheduling: called from the exact call site where a trigger event already
// happens (lead created, message sent, lead status changed, sale recorded — see each call
// site for why polling for these would be unreliable). Creates a PENDING AutomationRun per
// matching active Automation; AutomationExecutorService's poller picks it up once `runAt`
// arrives. Idempotent — the (automationId, triggerSourceId) unique constraint means calling
// this twice for the same event (e.g. a retried request) is a safe no-op.
export async function scheduleAutomationRuns(
  tx: Prisma.TransactionClient,
  args: {
    businessId: string
    trigger: AutomationTrigger
    contactId: string
    leadId?: string | null
    triggerSourceId: string
    triggerEventAt: Date
  },
): Promise<void> {
  const automations = await tx.automation.findMany({
    where: { businessId: args.businessId, trigger: args.trigger, isActive: true },
  })
  if (automations.length === 0) return

  for (const automation of automations) {
    const runAt = new Date(args.triggerEventAt)
    runAt.setDate(runAt.getDate() + (automation.waitDays ?? 0))

    try {
      await tx.automationRun.create({
        data: {
          automationId: automation.id,
          contactId: args.contactId,
          leadId: args.leadId ?? null,
          triggerSourceId: args.triggerSourceId,
          triggerEventAt: args.triggerEventAt,
          runAt,
        },
      })
    } catch (err) {
      if (!isUniqueConflict(err)) throw err
    }
  }
}
