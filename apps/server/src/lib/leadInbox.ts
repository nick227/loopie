import { db } from '@project/db'
import { InboxProjectionService } from '../services/InboxProjectionService'

// First real CRM event wired into Inbox (2026-08-28) — proves the "CRM is not a new thread type"
// read of the product's own omni-inbox direction: this posts *into* the contact's existing
// CONTACT thread (the same one their sent messages already land in via
// MessageService.send()/lib/adRunInbox.ts's find-or-create-by-contactId), not a separate CRM
// thread. If no thread exists yet for this contact (no message has ever been sent to them),
// InboxProjectionService.postMessage creates one — a stage change is a real, standalone
// Inbox-worthy event on its own, not conditional on a message having happened first.
const STAGE_LABEL: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  QUOTED: 'Quoted',
  WON: 'Won',
  LOST: 'Lost',
}

// Best-effort, non-blocking — same discipline as lib/adRunInbox.ts's notifyAdRunEvent. Posting an
// Inbox message must never be able to fail the stage-change write that triggered it.
export async function notifyLeadStageChanged(
  businessId: string,
  contactId: string,
  fromStage: string,
  toStage: string,
) {
  try {
    const contact = await db.contact.findUnique({
      where: { id: contactId },
      select: { name: true },
    })
    if (!contact) return
    await InboxProjectionService.postMessage({
      businessId,
      thread: { type: 'CONTACT', contactId },
      threadSubject: contact.name,
      kind: 'SYSTEM',
      direction: 'INTERNAL',
      messageSubject: 'Lead status changed',
      body: `Moved from ${STAGE_LABEL[fromStage] ?? fromStage} to ${STAGE_LABEL[toStage] ?? toStage}.`,
      meta: { contactId, fromStage, toStage },
    })
  } catch (err) {
    console.error('Failed to post Inbox message for lead status change', err)
  }
}
