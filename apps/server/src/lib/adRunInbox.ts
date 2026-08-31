import { InboxProjectionService } from '../services/InboxProjectionService'

// Every AdRun mutation this app performs that's actually worth telling a business owner about —
// see the product decision recorded 2026-08-28: routine successful syncs, every provider poll, and
// small spend fluctuations are audit-only (never reach here); these nine are the curated set.
export type AdRunInboxEvent =
  | { type: 'BUDGET_UPDATED'; fromMinor: number; toMinor: number; currency: string }
  | { type: 'SCHEDULE_UPDATED'; startIso: string; endIso: string | null }
  | {
      type: 'TARGETING_UPDATED'
      country: string
      locationNote: string | null
      radiusMiles: number | null
    }
  | { type: 'CREATIVE_REPLACED'; oldRevision: number; newRevision: number }
  | { type: 'DESTINATION_REPLACED'; pageName: string }
  | { type: 'REPLACEMENT_FAILED'; reason: string }
  | { type: 'PROVIDER_REJECTED'; reason: string | null }
  | { type: 'PROVIDER_LIMITED'; reason: string | null }
  | { type: 'DRIFT_DETECTED' }

function money(minor: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100)
}

function formatDay(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function targetingLine(country: string, locationNote: string | null, radiusMiles: number | null) {
  if (!locationNote) return country
  return `${locationNote}${radiusMiles ? ` · ${radiusMiles} mi` : ''} (${country})`
}

export function inboxMessageFor(
  event: AdRunInboxEvent,
  brand: string,
): { subject: string; body: string } {
  switch (event.type) {
    case 'BUDGET_UPDATED':
      return {
        subject: 'Ad budget updated',
        body: `${money(event.fromMinor, event.currency)}/day → ${money(event.toMinor, event.currency)}/day`,
      }
    case 'SCHEDULE_UPDATED':
      return {
        subject: 'Ad schedule updated',
        body: event.endIso
          ? `Now runs through ${formatDay(event.endIso)}`
          : `Now runs from ${formatDay(event.startIso)}, until manually stopped`,
      }
    case 'TARGETING_UPDATED':
      return {
        subject: 'Ad targeting updated',
        body: targetingLine(event.country, event.locationNote, event.radiusMiles),
      }
    case 'CREATIVE_REPLACED':
      return {
        subject: 'New ad version is live',
        body: `Revision ${event.newRevision} replaced revision ${event.oldRevision}. Previous version has stopped.`,
      }
    case 'DESTINATION_REPLACED':
      return { subject: 'Ad destination changed', body: `Now points to "${event.pageName}".` }
    case 'REPLACEMENT_FAILED':
      return {
        subject: "Replacement couldn't go live",
        body: `${event.reason} Your current version is still running.`,
      }
    case 'PROVIDER_REJECTED':
      return {
        subject: `${brand} rejected this ad`,
        body: event.reason
          ? `${event.reason} Review the issue and fix it.`
          : `${brand} didn't provide a reason. Check its Ads Manager for details.`,
      }
    case 'PROVIDER_LIMITED':
      return {
        subject: `${brand} limited delivery`,
        body: event.reason ?? 'Delivery is restricted — check the platform for details.',
      }
    case 'DRIFT_DETECTED':
      return {
        subject: `${brand} changed this ad outside LOOPIE`,
        body: 'Requested and live settings differ — check the Budget/Schedule/Targeting comparisons on this ad.',
      }
  }
}

// Best-effort, non-blocking — posting an Inbox message must never be able to fail the mutation
// that triggered it. Mirrors the exact swallow-and-log discipline the concurrent session's own
// ActivityProjectionService call sites already use.
export async function notifyAdRunEvent(
  businessId: string,
  advertisementId: string,
  platform: string,
  advertisementName: string,
  event: AdRunInboxEvent,
) {
  try {
    const { subject, body } = inboxMessageFor(event, platform)
    await InboxProjectionService.postMessage({
      businessId,
      thread: { type: 'ADVERTISEMENT', advertisementId, platform },
      threadSubject: `${platform} · ${advertisementName}`,
      kind: 'SYSTEM',
      direction: 'INTERNAL',
      messageSubject: subject,
      body,
      meta: { advertisementId, platform, event },
    })
  } catch (err) {
    console.error('Failed to post Inbox message for AdRun event', err)
  }
}
