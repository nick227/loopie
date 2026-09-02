import { db } from '@project/db'
import type { InteractionType } from '@prisma/client'

// Manually loggable via POST /contacts/{contactId}/interactions — everything else in
// InteractionType is a system-of-record event written by the code path that performed it
// (MessageService.send, form submission, sale creation, etc.), never by direct user input.
export const LOGGABLE_ACTIVITY_TYPES = [
  'CALL_LOGGED',
  'MEETING',
  'WEBINAR',
  'EVENT',
  'FOLLOW_UP',
  'NOTE',
] as const

// "Effort invested" — outbound activity only, not inbound replies or system events like
// FORM_SUBMITTED/PAGE_VIEWED/AD_CLICK. Drives both `contacted` and `lastTouchAt` on the card, and
// the work queue's own contacted/last-touch computation (see LeadService.queue).
export const OUTBOUND_TYPES: InteractionType[] = [
  'EMAIL_SENT',
  'TEXT_SENT',
  'SOCIAL_POST_SENT', // found live while wiring the channel-taxonomy slice — this was missing
  'CALL_LOGGED',
  'MEETING',
  'WEBINAR',
  'EVENT',
  'FOLLOW_UP',
]

function emptyCounts() {
  return { email: 0, text: 0, call: 0, meeting: 0, webinarEvent: 0 }
}

// Finds the contact's open lead (at most one, per the @@unique([contactId, openSlot]) guard), or
// falls back to their most recently created lead if none is currently open — a closed pipeline
// still has a card worth showing, not a blank one.
async function findCurrentLead(businessId: string, contactId: string) {
  const open = await db.lead.findFirst({ where: { businessId, contactId, openSlot: 'OPEN' } })
  if (open) return open
  return db.lead.findFirst({ where: { businessId, contactId }, orderBy: { createdAt: 'desc' } })
}

// Interaction has no leadId (adding one is a bigger, separately-justified schema change — see
// CLAUDE.md's CRM pipeline/activity slice), so a lead's own open window (openedAt through
// closedAt, or now if still open) is the pragmatic scope for "activity on this lead" — a contact
// with more than one lead over time (repeat purchases) won't have an old lead's effort double
// counted onto a new one.
export async function currentLeadCard(businessId: string, contactId: string) {
  const lead = await findCurrentLead(businessId, contactId)
  if (!lead) return null

  const window = {
    occurredAt: { gte: lead.openedAt, ...(lead.closedAt ? { lte: lead.closedAt } : {}) },
  }
  const rows = await db.interaction.groupBy({
    by: ['type'],
    where: { businessId, contactId, ...window },
    _count: { _all: true },
  })

  const counts = emptyCounts()
  for (const row of rows) {
    if (row.type === 'EMAIL_SENT') counts.email += row._count._all
    else if (row.type === 'TEXT_SENT') counts.text += row._count._all
    else if (row.type === 'CALL_LOGGED') counts.call += row._count._all
    else if (row.type === 'MEETING') counts.meeting += row._count._all
    else if (row.type === 'WEBINAR' || row.type === 'EVENT') counts.webinarEvent += row._count._all
  }

  const lastOutbound = await db.interaction.aggregate({
    where: { businessId, contactId, type: { in: OUTBOUND_TYPES }, ...window },
    _max: { occurredAt: true },
  })
  const lastTouchAt = lastOutbound._max?.occurredAt ?? null
  const contacted = lastTouchAt != null

  return {
    id: lead.id,
    stage: lead.stage,
    sourceType: lead.sourceType,
    openedAt: lead.openedAt.toISOString(),
    closedAt: lead.closedAt?.toISOString() ?? null,
    nextActionNote: lead.nextActionNote,
    nextActionAt: lead.nextActionAt?.toISOString() ?? null,
    contacted,
    lastTouchAt: lastTouchAt?.toISOString() ?? null,
    activityCounts: counts,
  }
}
