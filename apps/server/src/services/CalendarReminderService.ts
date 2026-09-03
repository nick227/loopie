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
    await notifyGoalReminder(goal.businessId, {
      id: goal.id,
      title: goal.title,
      subjectType: goal.subjectType,
      subjectId: goal.subjectId,
    })
    await db.scheduledGoal.update({ where: { id: goal.id }, data: { reminderSentAt: new Date() } })
    sent++
  }
  return { sent }
}
