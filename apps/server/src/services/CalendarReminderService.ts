import { db } from '@project/db'
import { notifyGoalReminder } from '../lib/calendarInbox'

// Fires the one time-precise reminder a ScheduledGoal ever gets, the moment scheduledFor's
// instant arrives — only for goals with hasTime=true (see ScheduledGoal's own comment on why a
// quick-scheduled "this week" idea with no specific time never gets one). No repeat/overdue nudge
// cadence in this pass — reminderSentAt is a one-shot flag, matching the product spec's
// encouraging-not-punitive tone (a single on-time nudge, not escalating reminders).
export async function runDueGoalReminders(): Promise<{ sent: number }> {
  const due = await db.scheduledGoal.findMany({
    where: {
      status: 'SCHEDULED',
      hasTime: true,
      reminderSentAt: null,
      scheduledFor: { lte: new Date() },
    },
    take: 200,
  })

  let sent = 0
  for (const goal of due) {
    // Claim before notifying, not after: an overlapping tick or a restart mid-loop must not
    // double-send the same one-shot reminder. reminderSentAt is already the eligibility gate
    // above, so claiming it is just moving the write earlier and checking it actually landed.
    const claimed = await db.scheduledGoal.updateMany({
      where: { id: goal.id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    })
    if (claimed.count === 0) continue

    try {
      await notifyGoalReminder(goal.businessId, {
        id: goal.id,
        title: goal.title,
        subjectType: goal.subjectType,
        subjectId: goal.subjectId,
      })
      sent++
    } catch (err) {
      // A missed reminder is far less bad than a duplicate one (this is a one-shot encouraging
      // nudge, not a billed action) — log and move on rather than reverting the claim to retry.
      console.error(`[CalendarReminder] Failed to notify for goal ${goal.id}:`, err)
    }
  }
  return { sent }
}
