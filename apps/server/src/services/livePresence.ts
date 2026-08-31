import { db } from '@project/db'
import { advertisementSummary } from '../lib/advertisementSummary'
import { resolveAudienceWhere } from './AudienceService'

const AD_CANDIDATE_POOL = 30 // Advertisement.status is derived from its runs, not a DB column —
// see advertisementSummary.ts — so DRAFT can't be excluded in the where clause itself; fetch a
// generous recency-ordered pool and filter after deriving status, same as AdsPage.tsx already
// does client-side for its own status filter.

const AD_STATUS_LABEL: Record<string, string> = {
  READY: 'Ready',
  RUNNING: 'Running',
  PAUSED: 'Paused',
  FAILED: 'Failed',
}

type LivePresenceItem = {
  type: 'PAGE' | 'AD' | 'MESSAGE'
  // Omitted (not `null`) for PAGE/AD — this OpenAPI 3.0.3 spec's ajv validator doesn't treat
  // `nullable: true` on an `enum` field as accepting a literal null (unlike a plain nullable
  // string, e.g. thumbnailUrl below); omitting the key entirely is valid since `channel` isn't in
  // LivePresenceItem's `required` list, and sidesteps the quirk without touching shared ajv setup.
  channel?: 'EMAIL' | 'SOCIAL'
  id: string
  title: string
  href: string
  updatedAt: string
  statusLabel: string
  thumbnailUrl: string | null
  stat1: { value: number; label: string }
  stat2: { value: number; label: string }
}

// Mirrors apps/web/src/pages/landing-pages/components/PageRow.tsx's thumbUrl() exactly — small,
// deliberate server-side duplicate rather than a shared package for one 10-line pure function
// (same precedent as withSid() being duplicated between apps/server and apps/ad-server).
function pageThumbnailUrl(content: unknown): string | null {
  if (!content || typeof content !== 'object') return null
  const sections = (content as { sections?: unknown }).sections
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) return null
  for (const key of ['image', 'split']) {
    const section = (sections as Record<string, unknown>)[key]
    if (!section || typeof section !== 'object') continue
    const imageUrl = (section as { imageUrl?: unknown }).imageUrl
    if (typeof imageUrl === 'string' && imageUrl) return imageUrl
  }
  return null
}

async function pageItems(businessId: string, limit: number): Promise<LivePresenceItem[]> {
  const pages = await db.landingPage.findMany({
    where: { businessId, status: 'PUBLISHED', deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { id: true, name: true, content: true, updatedAt: true },
  })
  if (pages.length === 0) return []
  const ids = pages.map((p) => p.id)
  const [viewRows, submissionRows] = await Promise.all([
    db.pageView.groupBy({
      by: ['landingPageId'],
      where: { landingPageId: { in: ids } },
      _count: { _all: true },
    }),
    db.formSubmission.groupBy({
      by: ['landingPageId'],
      where: { landingPageId: { in: ids } },
      _count: { _all: true },
    }),
  ])
  const viewsById = new Map(viewRows.map((r) => [r.landingPageId, r._count._all]))
  const submissionsById = new Map(submissionRows.map((r) => [r.landingPageId, r._count._all]))
  return pages.map((page) => ({
    type: 'PAGE',
    id: page.id,
    title: page.name,
    href: `/landing-pages/${page.id}`,
    updatedAt: page.updatedAt.toISOString(),
    statusLabel: 'Live',
    thumbnailUrl: pageThumbnailUrl(page.content),
    stat1: { value: viewsById.get(page.id) ?? 0, label: 'visits' },
    stat2: { value: submissionsById.get(page.id) ?? 0, label: 'submissions' },
  }))
}

async function adItems(businessId: string, limit: number): Promise<LivePresenceItem[]> {
  const rows = await db.advertisement.findMany({
    where: { businessId },
    orderBy: { updatedAt: 'desc' },
    take: AD_CANDIDATE_POOL,
    include: { assets: { include: { asset: true } }, runs: true },
  })
  const live = rows
    .map((row) => ({ row, summary: advertisementSummary(row.runs) }))
    .filter(({ summary }) => summary.status !== 'DRAFT')
    .slice(0, limit)
  return live.map(({ row, summary }) => {
    const image = row.assets.map((a) => a.asset).find((asset) => asset.type === 'IMAGE')
    return {
      type: 'AD',
      id: row.id,
      title: row.name,
      href: `/ads/${row.id}`,
      updatedAt: row.updatedAt.toISOString(),
      statusLabel: AD_STATUS_LABEL[summary.status] ?? summary.status,
      thumbnailUrl: image?.url ?? null,
      stat1: { value: summary.impressions, label: 'impressions' },
      stat2: { value: summary.conversions, label: 'leads' },
    }
  })
}

async function messageItems(businessId: string, limit: number): Promise<LivePresenceItem[]> {
  const messages = await db.message.findMany({
    where: {
      businessId,
      status: { in: ['SENT', 'SCHEDULED'] },
      channel: { in: ['EMAIL', 'SOCIAL'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      subject: true,
      channel: true,
      status: true,
      audienceId: true,
      updatedAt: true,
    },
  })
  if (messages.length === 0) return []
  const ids = messages.map((m) => m.id)
  const [leadRows, audiences] = await Promise.all([
    db.lead.groupBy({
      by: ['sourceMessageId'],
      where: { sourceMessageId: { in: ids } },
      _count: { _all: true },
    }),
    // Only over this page's own handful of candidate messages (capped at `limit`, not the whole
    // Message table) — a per-audience dynamic filter can't be expressed as one batched query, but
    // at this scale it isn't the N+1 problem the same shape would be across a full collection list
    // (see MessageService.ts's _toDTOWithCount, which does this per-row across every message).
    Promise.all(
      messages.map(async (message) => {
        const audience = await db.audience.findFirst({ where: { id: message.audienceId } })
        if (!audience) return [message.id, 0] as const
        const filterWhere = resolveAudienceWhere(audience)
        const where = filterWhere ?? {
          businessId,
          deletedAt: null,
          audienceMemberships: { some: { audienceId: audience.id } },
        }
        return [message.id, await db.contact.count({ where })] as const
      }),
    ),
  ])
  const leadsById = new Map(leadRows.map((r) => [r.sourceMessageId, r._count._all]))
  const recipientsById = new Map(audiences)
  return messages.map((message) => ({
    type: 'MESSAGE',
    channel: message.channel === 'SOCIAL' ? 'SOCIAL' : 'EMAIL',
    id: message.id,
    title: message.subject ?? `${message.channel === 'SOCIAL' ? 'Social' : 'Email'} message`,
    href: `/messages/${message.id}`,
    updatedAt: message.updatedAt.toISOString(),
    statusLabel: message.status === 'SCHEDULED' ? 'Scheduled' : 'Sent',
    thumbnailUrl: null,
    stat1: { value: recipientsById.get(message.id) ?? 0, label: 'in audience' },
    stat2: { value: leadsById.get(message.id) ?? 0, label: 'leads' },
  }))
}

// Per-type limits, not one shared cap sliced by recency across all of them — the frontend renders
// a distinct editorial slot per type (one dominant Page, a 2-up Ad stack, a Post strip, one Email
// card), not a single recency-ordered feed, so a business whose most recent activity happens to
// be all Pages must not starve the Ad/Message slots empty. See LivePresenceGrid.tsx.
export async function buildLivePresence(businessId: string): Promise<LivePresenceItem[]> {
  const [pages, ads, messages] = await Promise.all([
    pageItems(businessId, 4),
    adItems(businessId, 6),
    messageItems(businessId, 14),
  ])
  return [...pages, ...ads, ...messages]
}
