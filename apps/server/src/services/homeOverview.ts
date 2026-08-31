import { db } from '@project/db'
import type { InteractionType, SourceType } from '@prisma/client'
import { ACTIVE_SALE_WHERE } from '../lib/salePredicates'
import { buildLivePresence } from './livePresence'

const OUTBOUND_TYPES: InteractionType[] = ['EMAIL_SENT', 'TEXT_SENT', 'SOCIAL_POST_SENT']
const CONVERSATION_TYPES: InteractionType[] = ['REPLY', ...OUTBOUND_TYPES]
const FEED_INTERACTION_TYPES: InteractionType[] = [
  'REPLY',
  'STATUS_CHANGE',
  'CALL_LOGGED',
  'QUOTE_SENT',
]
const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000

type ActivityCategory = 'PERSON' | 'BUSINESS' | 'NEEDS_ATTENTION'

type HomeActivity = {
  id: string
  category: ActivityCategory
  eventType: string
  text: string
  detail: string | null
  occurredAt: string
  sourceLabel: string | null
  objectType: string
  objectId: string
  href: string
  actionLabel: string | null
}

function localDay(now: Date, offsetMinutes: number) {
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const day = shifted.getUTCDate()
  const start = new Date(Date.UTC(year, month, day) - offsetMinutes * 60_000)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return {
    start,
    end,
    localDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  }
}

// Same shift-then-truncate-then-unshift pattern as localDay(), aligned to a Monday week start
// instead of a calendar day.
function localWeek(now: Date, offsetMinutes: number) {
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000)
  const day = shifted.getUTCDay() // 0=Sun..6=Sat
  const mondayOffset = (day + 6) % 7 // days since the most recent Monday
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const date = shifted.getUTCDate() - mondayOffset
  const start = new Date(Date.UTC(year, month, date) - offsetMinutes * 60_000)
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  return { start, end }
}

// Null (not 0 or Infinity) when there's no prior-week baseline — the frontend renders "New"
// rather than a fabricated percentage.
function weeklyDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function timezoneLabel(offsetMinutes: number) {
  if (offsetMinutes === 0) return 'UTC'
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(offsetMinutes)
  return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}

function metadataValue(metadata: unknown, keys: string[]) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const row = metadata as Record<string, unknown>
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function compact(value: string | null | undefined, max = 120) {
  if (!value) return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized
}

function sourceLabel(sourceType: SourceType, sourceAdRun?: { platform: string } | null) {
  if (sourceAdRun) return sourceAdRun.platform[0] + sourceAdRun.platform.slice(1).toLowerCase()
  const labels: Record<SourceType, string> = {
    MESSAGE: 'Message',
    DEPLOYMENT: 'Advertisement',
    AD_RUN: 'Advertisement',
    AD_UNIT: 'LOOPIE',
    MANUAL: 'Manual',
    IMPORT: 'Import',
  }
  return labels[sourceType]
}

function activity(
  row: Omit<HomeActivity, 'detail' | 'sourceLabel' | 'actionLabel'> &
    Partial<Pick<HomeActivity, 'detail' | 'sourceLabel' | 'actionLabel'>>,
): HomeActivity {
  return { detail: null, sourceLabel: null, actionLabel: null, ...row }
}

export async function buildHomeOverview(businessId: string, rawOffsetMinutes = 0) {
  const offsetMinutes = Math.max(-840, Math.min(840, Math.trunc(rawOffsetMinutes || 0)))
  const now = new Date()
  const lookback = new Date(now.getTime() - LOOKBACK_MS)
  const { start, end, localDate } = localDay(now, offsetMinutes)

  const [
    business,
    conversationContacts,
    newLeadRows,
    reach,
    responses,
    spendAgg,
    leadsToday,
    revenueAgg,
    feedInteractions,
    formSubmissions,
    recentLeads,
    recentSales,
    recentMessages,
    publishedPages,
    failedRuns,
    recentImports,
    externalEvents,
    ambiguousMatches,
    automationLogs,
    integrationIssues,
    followUpsDue,
    automationErrors,
    openLeads,
    failedMessages,
    scheduledMessages,
    publishedPageCount,
    activeAutomations,
    platformRunFailureCount,
  ] = await Promise.all([
    db.business.findUniqueOrThrow({ where: { id: businessId }, select: { name: true } }),
    db.contact.findMany({
      where: { businessId, deletedAt: null, interactions: { some: { type: 'REPLY' } } },
      select: {
        id: true,
        name: true,
        interactions: {
          where: { type: { in: CONVERSATION_TYPES } },
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: {
            id: true,
            type: true,
            metadata: true,
            occurredAt: true,
            sourceAdRun: { select: { platform: true } },
          },
        },
      },
    }),
    db.lead.findMany({
      where: { businessId, stage: 'NEW', openSlot: 'OPEN' },
      orderBy: { openedAt: 'asc' },
      select: {
        id: true,
        contactId: true,
        sourceType: true,
        openedAt: true,
        contact: {
          select: {
            name: true,
            interactions: {
              where: { type: { in: OUTBOUND_TYPES } },
              orderBy: { occurredAt: 'desc' },
              take: 1,
              select: { occurredAt: true },
            },
          },
        },
        sourceAdRun: { select: { platform: true } },
      },
    }),
    db.interaction.count({
      where: { businessId, type: { in: OUTBOUND_TYPES }, occurredAt: { gte: start, lt: end } },
    }),
    db.interaction.count({
      where: { businessId, type: 'REPLY', occurredAt: { gte: start, lt: end } },
    }),
    db.adSpend.aggregate({
      where: { businessId, periodStart: { gte: start, lt: end } },
      _sum: { reportedAmountMinor: true },
    }),
    db.lead.count({ where: { businessId, createdAt: { gte: start, lt: end } } }),
    db.sale.aggregate({
      where: { businessId, ...ACTIVE_SALE_WHERE, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    db.interaction.findMany({
      where: { businessId, type: { in: FEED_INTERACTION_TYPES }, occurredAt: { gte: lookback } },
      orderBy: { occurredAt: 'desc' },
      take: 16,
      include: { contact: { select: { name: true } }, sourceAdRun: { select: { platform: true } } },
    }),
    db.formSubmission.findMany({
      where: { businessId, createdAt: { gte: lookback } },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        form: { select: { name: true } },
        contact: { select: { name: true } },
        landingPage: { select: { name: true } },
      },
    }),
    db.lead.findMany({
      where: { businessId, createdAt: { gte: lookback } },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        contact: { select: { name: true, source: true } },
        sourceAdRun: { select: { platform: true } },
      },
    }),
    db.sale.findMany({
      where: { businessId, ...ACTIVE_SALE_WHERE, createdAt: { gte: lookback } },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { contact: { select: { name: true } }, externalEvents: { select: { id: true } } },
    }),
    db.message.findMany({
      where: {
        businessId,
        status: { in: ['SCHEDULED', 'SENT', 'FAILED'] },
        updatedAt: { gte: lookback },
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        subject: true,
        channel: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        updatedAt: true,
      },
    }),
    db.publishedPageVersion.findMany({
      where: { landingPage: { businessId }, publishedAt: { gte: lookback } },
      orderBy: { publishedAt: 'desc' },
      take: 8,
      include: { landingPage: { select: { id: true, name: true } } },
    }),
    db.adRun.findMany({
      where: {
        advertisement: { businessId },
        status: { in: ['VALIDATION_FAILED', 'PROVISIONING_FAILED'] },
        updatedAt: { gte: lookback },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: { advertisement: { select: { id: true, name: true } } },
    }),
    db.importJob.findMany({
      where: { businessId, updatedAt: { gte: lookback } },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        status: true,
        created: true,
        linked: true,
        ambiguous: true,
        skipped: true,
        updatedAt: true,
        records: { take: 1, select: { provider: true } },
      },
    }),
    db.externalEvent.findMany({
      where: { businessId, occurredAt: { gte: lookback } },
      orderBy: { occurredAt: 'desc' },
      take: 12,
      include: { contact: { select: { name: true } }, sale: { select: { amount: true } } },
    }),
    db.externalContactRecord.findMany({
      where: { businessId, matchStatus: 'AMBIGUOUS', updatedAt: { gte: lookback } },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { id: true, provider: true, externalId: true, updatedAt: true },
    }),
    db.automationLog.findMany({
      where: { automation: { businessId }, triggeredAt: { gte: lookback } },
      orderBy: { triggeredAt: 'desc' },
      take: 10,
      include: { automation: { select: { id: true, name: true } } },
    }),
    db.integration.findMany({
      where: { businessId, status: { in: ['NEEDS_REAUTH', 'INCOMPLETE'] } },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { id: true, provider: true, status: true, updatedAt: true },
    }),
    db.automationRun.count({
      where: { status: 'PENDING', runAt: { lte: now }, automation: { businessId } },
    }),
    db.automationLog.count({
      where: {
        outcome: 'FAILED',
        automation: { businessId },
        triggeredAt: { gte: start, lt: end },
      },
    }),
    db.lead.count({ where: { businessId, openSlot: 'OPEN' } }),
    db.message.count({ where: { businessId, status: 'FAILED' } }),
    db.message.count({ where: { businessId, status: 'SCHEDULED' } }),
    db.landingPage.count({ where: { businessId, status: 'PUBLISHED', deletedAt: null } }),
    db.automation.count({ where: { businessId, isActive: true, pausedAt: null } }),
    db.adRun.count({
      where: {
        advertisement: { businessId },
        status: { in: ['VALIDATION_FAILED', 'PROVISIONING_FAILED'] },
      },
    }),
  ])

  const replyItems = conversationContacts.flatMap((contact) => {
    const latest = contact.interactions[0]
    if (!latest || latest.type !== 'REPLY') return []
    return [
      {
        id: latest.id,
        kind: 'MESSAGE' as const,
        contactId: contact.id,
        contactName: contact.name,
        preview: compact(metadataValue(latest.metadata, ['body', 'text', 'message', 'preview'])),
        sourceLabel: latest.sourceAdRun ? sourceLabel('AD_RUN', latest.sourceAdRun) : 'Message',
        waitingSince: latest.occurredAt.toISOString(),
        actionLabel: 'Reply' as const,
        href: `/contacts/${contact.id}`,
      },
    ]
  })
  const replyContactIds = new Set(replyItems.map((item) => item.contactId))
  const leadItems = newLeadRows.flatMap((lead) => {
    const lastOutbound = lead.contact.interactions[0]?.occurredAt
    if (replyContactIds.has(lead.contactId) || (lastOutbound && lastOutbound >= lead.openedAt))
      return []
    const label = sourceLabel(lead.sourceType, lead.sourceAdRun)
    return [
      {
        id: lead.id,
        kind: 'LEAD' as const,
        contactId: lead.contactId,
        contactName: lead.contact.name,
        preview: `New Lead from ${label}`,
        sourceLabel: label,
        waitingSince: lead.openedAt.toISOString(),
        actionLabel: 'Review Lead' as const,
        href: `/contacts/${lead.contactId}`,
      },
    ]
  })
  const allInboxItems = [...replyItems, ...leadItems].sort((a, b) =>
    a.waitingSince.localeCompare(b.waitingSince),
  )

  const formByContact = new Map<string, number[]>()
  for (const submission of formSubmissions) {
    if (!submission.contactId) continue
    const values = formByContact.get(submission.contactId) ?? []
    values.push(submission.createdAt.getTime())
    formByContact.set(submission.contactId, values)
  }

  const feed: HomeActivity[] = []
  for (const row of feedInteractions) {
    const name = row.contact.name
    const preview = compact(metadataValue(row.metadata, ['body', 'text', 'message', 'preview']))
    const stage = metadataValue(row.metadata, ['stage'])
    const base = {
      id: `interaction:${row.id}`,
      occurredAt: row.occurredAt.toISOString(),
      objectType: 'INTERACTION',
      objectId: row.id,
      href: `/contacts/${row.contactId}`,
    }
    if (row.type === 'REPLY')
      feed.push(
        activity({
          ...base,
          category: 'PERSON',
          eventType: 'REPLY_RECEIVED',
          text: `${name} replied`,
          detail: preview,
          sourceLabel: row.sourceAdRun ? sourceLabel('AD_RUN', row.sourceAdRun) : 'Message',
          actionLabel: 'Reply',
        }),
      )
    if (row.type === 'STATUS_CHANGE')
      feed.push(
        activity({
          ...base,
          category: 'BUSINESS',
          eventType: 'LEAD_STAGE_CHANGED',
          text: `${name} moved to ${stage ?? 'a new Lead stage'}`,
        }),
      )
    if (row.type === 'CALL_LOGGED')
      feed.push(
        activity({
          ...base,
          category: 'BUSINESS',
          eventType: 'CALL_LOGGED',
          text: `Call logged with ${name}`,
        }),
      )
    if (row.type === 'QUOTE_SENT')
      feed.push(
        activity({
          ...base,
          category: 'BUSINESS',
          eventType: 'QUOTE_SENT',
          text: `Quote sent to ${name}`,
        }),
      )
  }
  for (const row of formSubmissions) {
    const name = row.contact?.name ?? 'A visitor'
    feed.push(
      activity({
        id: `form:${row.id}`,
        category: 'PERSON',
        eventType: 'FORM_SUBMITTED',
        text: `${name} submitted “${row.form.name}”${row.leadId ? ' and became a Lead' : ''}`,
        detail: row.landingPage ? `Page · ${row.landingPage.name}` : null,
        occurredAt: row.createdAt.toISOString(),
        objectType: 'FORM_SUBMISSION',
        objectId: row.id,
        href: row.contactId ? `/contacts/${row.contactId}` : '/landing-pages',
      }),
    )
  }
  for (const row of recentLeads) {
    const relatedForm = (formByContact.get(row.contactId) ?? []).some(
      (time) => Math.abs(time - row.createdAt.getTime()) < 60_000,
    )
    if (relatedForm) continue
    const label = sourceLabel(row.sourceType, row.sourceAdRun)
    feed.push(
      activity({
        id: `lead:${row.id}`,
        category: 'PERSON',
        eventType: 'LEAD_CREATED',
        text: `${row.contact.name} became a Lead`,
        detail: `Source · ${label}`,
        occurredAt: row.createdAt.toISOString(),
        sourceLabel: label,
        objectType: 'LEAD',
        objectId: row.id,
        href: `/contacts/${row.contactId}`,
        actionLabel: 'Review Lead',
      }),
    )
  }
  for (const row of recentSales) {
    if (row.externalEvents.length) continue
    feed.push(
      activity({
        id: `sale:${row.id}`,
        category: 'BUSINESS',
        eventType: 'SALE_RECORDED',
        text: `Sale recorded for ${row.contact.name}`,
        detail: `$${Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
        occurredAt: row.createdAt.toISOString(),
        objectType: 'SALE',
        objectId: row.id,
        href: `/sales/${row.id}`,
      }),
    )
  }
  for (const row of recentMessages) {
    const label =
      row.subject?.trim() || `${row.channel[0]}${row.channel.slice(1).toLowerCase()} message`
    const occurredAt = row.sentAt ?? row.scheduledAt ?? row.updatedAt
    feed.push(
      activity({
        id: `message:${row.id}`,
        category: row.status === 'FAILED' ? 'NEEDS_ATTENTION' : 'BUSINESS',
        eventType: `MESSAGE_${row.status}`,
        text:
          row.status === 'FAILED'
            ? `“${label}” failed to send`
            : row.status === 'SCHEDULED'
              ? `“${label}” was scheduled`
              : `“${label}” was sent`,
        occurredAt: occurredAt.toISOString(),
        objectType: 'MESSAGE',
        objectId: row.id,
        href: `/messages/${row.id}`,
        actionLabel: row.status === 'FAILED' ? 'Review' : null,
      }),
    )
  }
  for (const row of publishedPages)
    feed.push(
      activity({
        id: `page:${row.id}`,
        category: 'BUSINESS',
        eventType: 'PAGE_PUBLISHED',
        text: `“${row.landingPage.name}” was published`,
        detail: `Version ${row.version}`,
        occurredAt: row.publishedAt.toISOString(),
        objectType: 'LANDING_PAGE',
        objectId: row.landingPage.id,
        href: `/landing-pages/${row.landingPage.id}`,
      }),
    )
  for (const row of failedRuns)
    feed.push(
      activity({
        id: `run:${row.id}`,
        category: 'NEEDS_ATTENTION',
        eventType: 'PLATFORM_RUN_FAILED',
        text: `${row.advertisement.name} · ${row.platform} needs attention`,
        detail: compact(row.errorMessage) ?? 'The Platform Run could not be prepared.',
        occurredAt: row.updatedAt.toISOString(),
        objectType: 'PLATFORM_RUN',
        objectId: row.id,
        href: `/ads/${row.advertisement.id}`,
        actionLabel: 'Review',
      }),
    )
  for (const row of recentImports) {
    if (row.status === 'PENDING') continue
    const provider = row.records[0]?.provider ?? 'CSV'
    const changed = row.created + row.linked
    const text =
      row.status === 'FAILED'
        ? `${provider} import failed`
        : `${provider} import added ${row.created} Contact${row.created === 1 ? '' : 's'} and linked ${row.linked}`
    feed.push(
      activity({
        id: `import:${row.id}`,
        category: row.status === 'FAILED' || row.ambiguous > 0 ? 'NEEDS_ATTENTION' : 'BUSINESS',
        eventType: row.status === 'FAILED' ? 'IMPORT_FAILED' : 'IMPORT_COMPLETED',
        text,
        detail:
          row.ambiguous > 0
            ? `${row.ambiguous} identit${row.ambiguous === 1 ? 'y needs' : 'ies need'} review`
            : changed === 0
              ? `${row.skipped} skipped`
              : null,
        occurredAt: row.updatedAt.toISOString(),
        sourceLabel: provider,
        objectType: 'IMPORT_JOB',
        objectId: row.id,
        href: '/contacts/import/new',
        actionLabel: row.status === 'FAILED' || row.ambiguous > 0 ? 'Review' : null,
      }),
    )
  }
  for (const row of externalEvents) {
    const name = row.contact?.name ?? 'A customer'
    const typeLabel =
      row.type === 'DEAL_WON'
        ? 'closed a deal'
        : row.type === 'ORDER_CREATED'
          ? 'placed an order'
          : row.type === 'PAYMENT_COMPLETED'
            ? 'completed a payment'
            : row.type.toLowerCase().replaceAll('_', ' ')
    feed.push(
      activity({
        id: `external:${row.id}`,
        category: 'PERSON',
        eventType: row.type,
        text: `${name} ${typeLabel}`,
        detail: row.sale
          ? `$${Number(row.sale.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
          : null,
        occurredAt: row.occurredAt.toISOString(),
        sourceLabel: row.provider,
        objectType: 'EXTERNAL_EVENT',
        objectId: row.id,
        href: row.contactId ? `/contacts/${row.contactId}` : '/contacts',
      }),
    )
  }
  for (const row of ambiguousMatches)
    feed.push(
      activity({
        id: `match:${row.id}`,
        category: 'NEEDS_ATTENTION',
        eventType: 'IDENTITY_MATCH_REQUIRED',
        text: `${row.provider} record needs an identity match`,
        detail: row.externalId,
        occurredAt: row.updatedAt.toISOString(),
        sourceLabel: row.provider,
        objectType: 'EXTERNAL_CONTACT_RECORD',
        objectId: row.id,
        href: '/contacts/import/new',
        actionLabel: 'Review',
      }),
    )
  for (const row of automationLogs)
    feed.push(
      activity({
        id: `automation:${row.id}`,
        category: row.outcome === 'FAILED' ? 'NEEDS_ATTENTION' : 'BUSINESS',
        eventType: row.outcome === 'FAILED' ? 'FOLLOW_UP_FAILED' : 'FOLLOW_UP_SENT',
        text:
          row.outcome === 'FAILED'
            ? `${row.automation.name} follow-up failed`
            : `${row.automation.name} completed a follow-up`,
        detail: compact(row.reasonSkipped),
        occurredAt: row.triggeredAt.toISOString(),
        objectType: 'AUTOMATION',
        objectId: row.automation.id,
        href: `/automations/${row.automation.id}/logs`,
        actionLabel: row.outcome === 'FAILED' ? 'Review' : null,
      }),
    )
  for (const row of integrationIssues)
    feed.push(
      activity({
        id: `integration:${row.id}`,
        category: 'NEEDS_ATTENTION',
        eventType: 'CONNECTOR_ATTENTION',
        text: `${row.provider} connection needs attention`,
        detail:
          row.status === 'NEEDS_REAUTH'
            ? 'Reconnect the account to resume imports.'
            : 'Finish connecting this account.',
        occurredAt: row.updatedAt.toISOString(),
        sourceLabel: row.provider,
        objectType: 'INTEGRATION',
        objectId: row.id,
        href: '/contacts',
        actionLabel: 'Review',
      }),
    )

  feed.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const activityItems = feed.slice(0, 16)

  const firstFailedRun = failedRuns[0]
  const firstFailedMessage = recentMessages.find((message) => message.status === 'FAILED')
  const firstAmbiguous = ambiguousMatches[0]
  const firstInbox = allInboxItems[0]
  let primaryAction: {
    id: string
    title: string
    reason: string
    actionLabel: string
    href: string
  } | null = null
  if (firstFailedRun)
    primaryAction = {
      id: `run:${firstFailedRun.id}`,
      title: `${firstFailedRun.advertisement.name} · ${firstFailedRun.platform} needs attention`,
      reason: firstFailedRun.errorMessage ?? 'The Platform Run failed.',
      actionLabel: 'Review Platform Run',
      href: `/ads/${firstFailedRun.advertisement.id}`,
    }
  else if (firstFailedMessage)
    primaryAction = {
      id: `message:${firstFailedMessage.id}`,
      title: 'A Message failed to send',
      reason: firstFailedMessage.subject ?? 'Review the failed send.',
      actionLabel: 'Review Message',
      href: `/messages/${firstFailedMessage.id}`,
    }
  else if (firstAmbiguous)
    primaryAction = {
      id: `match:${firstAmbiguous.id}`,
      title: 'An identity match needs review',
      reason: `${firstAmbiguous.provider} · ${firstAmbiguous.externalId}`,
      actionLabel: 'Review match',
      href: '/contacts/import/new',
    }
  else if (automationErrors > 0)
    primaryAction = {
      id: 'automation-errors',
      title: `${automationErrors} follow-up${automationErrors === 1 ? '' : 's'} failed today`,
      reason: 'Review the Automation log before the next run.',
      actionLabel: 'Review Automations',
      href: '/automations',
    }
  else if (firstInbox)
    primaryAction = {
      id: `inbox:${firstInbox.id}`,
      title:
        firstInbox.kind === 'MESSAGE'
          ? `${firstInbox.contactName} is waiting for a reply`
          : `${firstInbox.contactName} is a new Lead`,
      reason: firstInbox.preview ?? 'Open the Contact record and take the next step.',
      actionLabel: firstInbox.actionLabel,
      href: firstInbox.href,
    }
  else if (followUpsDue > 0)
    primaryAction = {
      id: 'follow-ups-due',
      title: `${followUpsDue} follow-up${followUpsDue === 1 ? '' : 's'} due`,
      reason: 'These Automation runs are ready for review.',
      actionLabel: 'Review Automations',
      href: '/automations',
    }

  const issueCount =
    platformRunFailureCount + failedMessages + automationErrors + ambiguousMatches.length
  const inboxCount = allInboxItems.length
  const brief =
    inboxCount > 0 && issueCount > 0
      ? `${inboxCount} ${inboxCount === 1 ? 'conversation needs' : 'conversations need'} attention. ${issueCount} system ${issueCount === 1 ? 'issue needs' : 'issues need'} review.`
      : inboxCount > 0
        ? `${inboxCount} ${inboxCount === 1 ? 'conversation is' : 'conversations are'} waiting.`
        : issueCount > 0
          ? `${issueCount} system ${issueCount === 1 ? 'issue needs' : 'issues need'} review.`
          : "You're caught up. Work is moving normally."

  const systems = [
    {
      id: 'crm',
      label: 'CRM',
      state: inboxCount > 0 ? ('ATTENTION' as const) : ('CURRENT' as const),
      detail:
        inboxCount > 0
          ? `${inboxCount} waiting · ${openLeads} open Leads`
          : `${openLeads} open Leads`,
      href: '/contacts',
    },
    {
      id: 'messages',
      label: 'Messages',
      state:
        failedMessages > 0
          ? ('DEGRADED' as const)
          : scheduledMessages > 0
            ? ('CURRENT' as const)
            : ('QUIET' as const),
      detail:
        failedMessages > 0
          ? `${failedMessages} failed`
          : scheduledMessages > 0
            ? `${scheduledMessages} scheduled`
            : 'No scheduled sends',
      href: '/messages',
    },
    {
      id: 'pages',
      label: 'Pages',
      state: publishedPageCount > 0 ? ('CURRENT' as const) : ('NOT_SET_UP' as const),
      detail: publishedPageCount > 0 ? `${publishedPageCount} published` : 'No published Pages',
      href: '/landing-pages',
    },
    {
      id: 'automations',
      label: 'Automations',
      state:
        automationErrors > 0
          ? ('DEGRADED' as const)
          : followUpsDue > 0
            ? ('ATTENTION' as const)
            : activeAutomations > 0
              ? ('CURRENT' as const)
              : ('QUIET' as const),
      detail:
        automationErrors > 0
          ? `${automationErrors} failed today`
          : followUpsDue > 0
            ? `${followUpsDue} due`
            : `${activeAutomations} active`,
      href: '/automations',
    },
    {
      id: 'connections',
      label: 'Connections',
      state: integrationIssues.some((row) => row.status === 'NEEDS_REAUTH')
        ? ('DISCONNECTED' as const)
        : integrationIssues.length > 0
          ? ('ATTENTION' as const)
          : ('CURRENT' as const),
      detail:
        integrationIssues.length > 0
          ? `${integrationIssues.length} need attention`
          : 'Connected systems current',
      href: '/contacts',
    },
  ]

  const thisWeek = localWeek(now, offsetMinutes)
  const lastWeek = {
    start: new Date(thisWeek.start.getTime() - 7 * 24 * 60 * 60 * 1000),
    end: thisWeek.start,
  }

  const [
    leadsThisWeek,
    leadsLastWeek,
    revenueThisWeekAgg,
    revenueLastWeekAgg,
    customersThisWeekRows,
    customersLastWeekRows,
    messagesSentThisWeek,
    messagesSentLastWeek,
    livePresence,
  ] = await Promise.all([
    db.lead.count({ where: { businessId, createdAt: { gte: thisWeek.start, lt: thisWeek.end } } }),
    db.lead.count({ where: { businessId, createdAt: { gte: lastWeek.start, lt: lastWeek.end } } }),
    db.sale.aggregate({
      where: { businessId, ...ACTIVE_SALE_WHERE, date: { gte: thisWeek.start, lt: thisWeek.end } },
      _sum: { amount: true },
    }),
    db.sale.aggregate({
      where: { businessId, ...ACTIVE_SALE_WHERE, date: { gte: lastWeek.start, lt: lastWeek.end } },
      _sum: { amount: true },
    }),
    db.sale.findMany({
      where: { businessId, ...ACTIVE_SALE_WHERE, date: { gte: thisWeek.start, lt: thisWeek.end } },
      distinct: ['contactId'],
      select: { contactId: true },
    }),
    db.sale.findMany({
      where: { businessId, ...ACTIVE_SALE_WHERE, date: { gte: lastWeek.start, lt: lastWeek.end } },
      distinct: ['contactId'],
      select: { contactId: true },
    }),
    db.message.count({
      where: { businessId, status: 'SENT', sentAt: { gte: thisWeek.start, lt: thisWeek.end } },
    }),
    db.message.count({
      where: { businessId, status: 'SENT', sentAt: { gte: lastWeek.start, lt: lastWeek.end } },
    }),
    buildLivePresence(businessId),
  ])

  const revenueThisWeek = Number(revenueThisWeekAgg._sum.amount ?? 0)
  const revenueLastWeek = Number(revenueLastWeekAgg._sum.amount ?? 0)
  const customersThisWeek = customersThisWeekRows.length
  const customersLastWeek = customersLastWeekRows.length
  // previousValue alongside deltaPct — a percentage alone hides the actual comparison number a
  // business owner would want to see next to it (docs/strategy/03-product-principles.md's "expand
  // the values" revision: a Results table, not a compact tile hiding the raw prior-week figure).
  const weeklyResults = {
    leads: {
      value: leadsThisWeek,
      previousValue: leadsLastWeek,
      deltaPct: weeklyDeltaPct(leadsThisWeek, leadsLastWeek),
    },
    customers: {
      value: customersThisWeek,
      previousValue: customersLastWeek,
      deltaPct: weeklyDeltaPct(customersThisWeek, customersLastWeek),
    },
    revenue: {
      value: revenueThisWeek,
      previousValue: revenueLastWeek,
      deltaPct: weeklyDeltaPct(revenueThisWeek, revenueLastWeek),
    },
    messagesSent: {
      value: messagesSentThisWeek,
      previousValue: messagesSentLastWeek,
      deltaPct: weeklyDeltaPct(messagesSentThisWeek, messagesSentLastWeek),
    },
  }

  return {
    businessName: business.name,
    generatedAt: now.toISOString(),
    brief,
    primaryAction,
    livePresence,
    weeklyResults,
    rail: {
      localDate,
      timezone: timezoneLabel(offsetMinutes),
      currency: 'USD',
      inboxWaiting: inboxCount,
      inboxOldestAt: firstInbox?.waitingSince ?? null,
      reach,
      responses,
      spend: Number(spendAgg._sum.reportedAmountMinor ?? 0) / 100,
      leads: leadsToday,
      revenue: Number(revenueAgg._sum.amount ?? 0),
    },
    inbox: { totalWaiting: inboxCount, items: allInboxItems.slice(0, 3) },
    activity: { items: activityItems },
    systems,
    newLeads: newLeadRows.length,
    unansweredReplies: replyItems.length,
    followUpsDue,
    failedSends: failedMessages,
    automationErrors,
  }
}
