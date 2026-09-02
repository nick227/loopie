import { db } from '@project/db'
import type { Channel, LeadStage } from '@prisma/client'
import { OUTBOUND_TYPES } from './leadCard'

// Funnel milestones — NOT_INTERESTED is an exit (like old LOST), not a stage a lead "reaches."
const PIPELINE_STAGES: LeadStage[] = ['NEW', 'UNDECIDED', 'INTERESTED', 'CLOSED']

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

function withinLeadWindow<T extends { occurredAt: Date }>(
  events: T[],
  lead: { openedAt: Date; closedAt: Date | null },
) {
  return events.filter(
    (e) => e.occurredAt >= lead.openedAt && (!lead.closedAt || e.occurredAt <= lead.closedAt),
  )
}

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
      avgTouchesBeforeInterested: null,
      avgTouchesBeforeClosed: null,
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
  const touchesBeforeInterested: number[] = []
  const touchesBeforeClosed: number[] = []
  let eligible1h = 0
  let within1h = 0
  let eligible24h = 0
  let within24h = 0

  for (const lead of leads) {
    const windowTouches = withinLeadWindow(touchesByContact.get(lead.contactId) ?? [], lead)
    const firstTouch = windowTouches[0]
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

    if (lead.stage === 'CLOSED' && lead.closedAt) {
      touchesBeforeClosed.push(windowTouches.length)
    }

    const windowStatusChanges = withinLeadWindow(
      statusChangesByContact.get(lead.contactId) ?? [],
      lead,
    )
    const firstInterested = windowStatusChanges.find(
      (s) =>
        s.metadata &&
        typeof s.metadata === 'object' &&
        (s.metadata as { stage?: string }).stage === 'INTERESTED',
    )
    if (firstInterested) {
      touchesBeforeInterested.push(
        windowTouches.filter((t) => t.occurredAt <= firstInterested.occurredAt).length,
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
        ? totalLeads
        : leads.filter(
            (l) => l.stage !== 'NOT_INTERESTED' && PIPELINE_STAGES.indexOf(l.stage) >= idx,
          ).length
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
      within1hPct: eligible1h ? (within1h / eligible1h) * 100 : 0,
      within24hPct: eligible24h ? (within24h / eligible24h) * 100 : 0,
    },
    avgTouchesBeforeInterested: average(touchesBeforeInterested),
    avgTouchesBeforeClosed: average(touchesBeforeClosed),
    channelMix,
    overdueFollowUpRate: openLeads.length ? (overdueCount / openLeads.length) * 100 : 0,
    stageConversion,
  }
}
