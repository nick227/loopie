import { db } from '@project/db'
import type { Channel, LeadStage } from '@prisma/client'
import { OUTBOUND_TYPES } from './leadCard'

// The funnel order insights reports against — LOST is deliberately excluded (see stageConversion
// below): it isn't a milestone a lead "reaches," it's an exit, and this schema keeps no
// stage-history table to know how far a since-lost lead actually got.
const PIPELINE_STAGES: LeadStage[] = ['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'PROPOSAL', 'WON']

// Outbound-effort channels only — FORM (inbound) and REFERRAL (not tied to any Interaction type
// today) aren't "how are we reaching out," so they're excluded from this specific report even
// though both are valid Channel enum values elsewhere (the ChannelProvider catalog).
const INSIGHTS_CHANNELS: Channel[] = [
  'EMAIL',
  'TEXT',
  'SOCIAL',
  'CALL',
  'MEETING',
  'WEBINAR',
  'EVENT',
]

function median(sorted: number[]) {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function average(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// Correlates a flat list of timestamped events against one lead's own open window
// [openedAt, closedAt ?? +Infinity) — the same window-scoping discipline used throughout the CRM
// pipeline/activity slice (Interaction has no leadId; a contact's multiple leads over time must
// not bleed into each other's numbers).
function withinLeadWindow<T extends { occurredAt: Date }>(
  events: T[],
  lead: { openedAt: Date; closedAt: Date | null },
) {
  return events.filter(
    (e) => e.occurredAt >= lead.openedAt && (!lead.closedAt || e.occurredAt <= lead.closedAt),
  )
}

// Everything here is derived from Lead's own current-state fields and the existing Interaction
// timeline — no new state machine, no stage-history table. Computed all-time (no date-range
// filter yet); revisit only if a business's real usage makes an all-time number stop being useful.
export async function computeLeadInsights(businessId: string) {
  const leads = await db.lead.findMany({
    where: { businessId },
    select: {
      id: true,
      contactId: true,
      stage: true,
      openedAt: true,
      closedAt: true,
      openSlot: true,
      nextActionAt: true,
    },
  })

  const totalLeads = leads.length
  if (totalLeads === 0) {
    return {
      totalLeads: 0,
      timeToFirstContact: { averageHours: null, medianHours: null, sampleSize: 0 },
      contactedWithin: { within1hPct: 0, within24hPct: 0 },
      avgTouchesBeforeEngaged: null,
      avgTouchesBeforeWon: null,
      channelMix: INSIGHTS_CHANNELS.map((channel) => ({ channel, count: 0, pct: 0 })),
      overdueFollowUpRate: 0,
      stageConversion: PIPELINE_STAGES.map((stage) => ({ stage, reachedCount: 0, pct: 0 })),
    }
  }

  const contactIds = [...new Set(leads.map((l) => l.contactId))]
  const earliestOpenedAt = leads.reduce(
    (min, l) => (l.openedAt < min ? l.openedAt : min),
    leads[0]!.openedAt,
  )

  const [outboundTouches, statusChanges, channelRows] = await Promise.all([
    db.interaction.findMany({
      where: {
        businessId,
        contactId: { in: contactIds },
        type: { in: OUTBOUND_TYPES },
        occurredAt: { gte: earliestOpenedAt },
      },
      select: { contactId: true, occurredAt: true },
      orderBy: { occurredAt: 'asc' },
    }),
    db.interaction.findMany({
      where: {
        businessId,
        contactId: { in: contactIds },
        type: 'STATUS_CHANGE',
        occurredAt: { gte: earliestOpenedAt },
      },
      select: { contactId: true, occurredAt: true, metadata: true },
      orderBy: { occurredAt: 'asc' },
    }),
    // Channel mix is a business-wide count, not scoped to any one lead's window — "how are we
    // actually communicating," not "effort on currently-tracked leads." Groups by the real
    // `channel` column (auto-tagged on write, backfilled for historical rows — see
    // scripts/backfillChannelProviders.ts) instead of re-deriving it from `type` by hand.
    db.interaction.groupBy({
      by: ['channel'],
      where: { businessId, channel: { in: INSIGHTS_CHANNELS } },
      _count: { _all: true },
    }),
  ])

  const touchesByContact = new Map<string, { occurredAt: Date }[]>()
  for (const t of outboundTouches) {
    const bucket = touchesByContact.get(t.contactId) ?? []
    bucket.push({ occurredAt: t.occurredAt })
    touchesByContact.set(t.contactId, bucket)
  }
  const statusChangesByContact = new Map<string, { occurredAt: Date; metadata: unknown }[]>()
  for (const s of statusChanges) {
    const bucket = statusChangesByContact.get(s.contactId) ?? []
    bucket.push({ occurredAt: s.occurredAt, metadata: s.metadata })
    statusChangesByContact.set(s.contactId, bucket)
  }

  const nowForWindow = new Date()
  const firstContactHours: number[] = []
  const touchesBeforeEngaged: number[] = []
  const touchesBeforeWon: number[] = []
  // Eligible = the lead is old enough to have had the full window to be contacted in — a lead
  // opened 10 minutes ago hasn't failed the 24h test yet, so it must not drag the rate down.
  // A lead that already WAS contacted within the window counts regardless of its current age
  // (it already earned the result); only a not-yet-contacted lead needs the eligibility check.
  let eligible1h = 0
  let within1h = 0
  let eligible24h = 0
  let within24h = 0

  for (const lead of leads) {
    const windowTouches = withinLeadWindow(touchesByContact.get(lead.contactId) ?? [], lead)
    const firstTouch = windowTouches[0] // already sorted ascending by the query's orderBy
    const ageHours = (nowForWindow.getTime() - lead.openedAt.getTime()) / 3_600_000
    if (firstTouch) {
      const hoursToContact = (firstTouch.occurredAt.getTime() - lead.openedAt.getTime()) / 3_600_000
      firstContactHours.push(hoursToContact)
      eligible1h++
      eligible24h++
      if (hoursToContact <= 1) within1h++
      if (hoursToContact <= 24) within24h++
    } else {
      if (ageHours >= 1) eligible1h++
      if (ageHours >= 24) eligible24h++
    }

    if (lead.stage === 'WON' && lead.closedAt) {
      touchesBeforeWon.push(windowTouches.length) // already bounded by closedAt via withinLeadWindow
    }

    const windowStatusChanges = withinLeadWindow(
      statusChangesByContact.get(lead.contactId) ?? [],
      lead,
    )
    const firstEngaged = windowStatusChanges.find(
      (s) =>
        s.metadata && typeof s.metadata === 'object' && (s.metadata as any).stage === 'ENGAGED',
    )
    if (firstEngaged) {
      touchesBeforeEngaged.push(
        windowTouches.filter((t) => t.occurredAt <= firstEngaged.occurredAt).length,
      )
    }
  }

  const totalChannelCount = channelRows.reduce((sum, r) => sum + r._count._all, 0)
  const channelMix = INSIGHTS_CHANNELS.map((channel) => {
    const count = channelRows.find((r) => r.channel === channel)?._count._all ?? 0
    return { channel, count, pct: totalChannelCount ? (count / totalChannelCount) * 100 : 0 }
  })

  const openLeads = leads.filter((l) => l.openSlot === 'OPEN')
  const overdueCount = openLeads.filter(
    (l) => l.nextActionAt && l.nextActionAt < nowForWindow,
  ).length

  const stageConversion = PIPELINE_STAGES.map((stage, idx) => {
    const reachedCount =
      stage === 'NEW'
        ? totalLeads // every lead was NEW once, including ones since lost — see the module comment
        : leads.filter((l) => l.stage !== 'LOST' && PIPELINE_STAGES.indexOf(l.stage) >= idx).length
    return { stage, reachedCount, pct: totalLeads ? (reachedCount / totalLeads) * 100 : 0 }
  })

  const sortedFirstContact = [...firstContactHours].sort((a, b) => a - b)

  return {
    totalLeads,
    timeToFirstContact: {
      averageHours: average(firstContactHours),
      medianHours: median(sortedFirstContact),
      sampleSize: firstContactHours.length,
    },
    contactedWithin: {
      // Denominator is leads old enough to have had the full window, not every lead ever — see
      // the eligible1h/eligible24h comment above.
      within1hPct: eligible1h ? (within1h / eligible1h) * 100 : 0,
      within24hPct: eligible24h ? (within24h / eligible24h) * 100 : 0,
    },
    avgTouchesBeforeEngaged: average(touchesBeforeEngaged),
    avgTouchesBeforeWon: average(touchesBeforeWon),
    channelMix,
    overdueFollowUpRate: openLeads.length ? (overdueCount / openLeads.length) * 100 : 0,
    stageConversion,
  }
}
