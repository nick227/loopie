import { db } from '@project/db'
import { InboxProjectionService } from '../services/InboxProjectionService'

// Best-effort, non-blocking — same discipline as lib/leadInbox.ts's notifyLeadStageChanged.
// Posting a reminder must never be able to fail the poller run that triggered it. Routes into the
// contact's own thread for CRM-linked work (the same thread stage-change notices already land
// in), and into a per-business "Calendar" INTEGRATION thread — the InboxThreadType.SYSTEM /
// integrationPlatform slot the schema doc comment calls out as reserved-but-unused — for
// everything else.
export async function notifyGoalReminder(
  businessId: string,
  goal: { id: string; title: string; subjectType: string; subjectId: string | null },
) {
  try {
    const timeLabel = new Date().toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    const body = `You planned to ${lowerFirst(goal.title)}. It's about that time.`

    if (goal.subjectType === 'CRM' && goal.subjectId) {
      const lead = await db.lead.findUnique({
        where: { id: goal.subjectId },
        select: { contactId: true, contact: { select: { name: true } } },
      })
      if (lead) {
        await InboxProjectionService.postMessage({
          businessId,
          thread: { type: 'CONTACT', contactId: lead.contactId },
          threadSubject: lead.contact.name,
          kind: 'SYSTEM',
          direction: 'INTERNAL',
          messageSubject: 'Reminder',
          body,
          meta: { goalId: goal.id, timeLabel },
        })
        return
      }
    }

    await InboxProjectionService.postMessage({
      businessId,
      thread: { type: 'INTEGRATION', integrationPlatform: 'CALENDAR' },
      threadSubject: 'Calendar',
      kind: 'SYSTEM',
      direction: 'INTERNAL',
      messageSubject: 'Reminder',
      body,
      meta: { goalId: goal.id, timeLabel },
    })
  } catch (err) {
    console.error('Failed to post Calendar reminder', err)
  }
}

function lowerFirst(value: string): string {
  return value.length ? value[0]!.toLowerCase() + value.slice(1) : value
}
