import { db } from '@project/db'
import { Prisma } from '@prisma/client'

export type CreativeMetrics = {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  campaignCount: number
}

export type CreativeCampaign = { id: string; name: string }

export type CreativeMetricsBundle = CreativeMetrics & {
  campaigns: CreativeCampaign[]
}

type Head = { id: string; previousVersionId: string | null }

const ZERO: CreativeMetricsBundle = {
  impressions: 0,
  clicks: 0,
  conversions: 0,
  spend: 0,
  campaignCount: 0,
  campaigns: [],
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0
  return typeof value === 'number' ? value : Number(value)
}

async function previousById(heads: Head[]) {
  const prev = new Map<string, string | null>()
  for (const head of heads) prev.set(head.id, head.previousVersionId)
  let missing = heads.map((head) => head.previousVersionId).filter((id): id is string => !!id)
  while (missing.length) {
    const rows = await db.creative.findMany({
      where: { id: { in: missing } },
      select: { id: true, previousVersionId: true },
    })
    missing = []
    for (const row of rows) {
      prev.set(row.id, row.previousVersionId)
      if (row.previousVersionId && !prev.has(row.previousVersionId))
        missing.push(row.previousVersionId)
    }
  }
  return prev
}

function chainFrom(headId: string, prev: Map<string, string | null>) {
  const chain = [headId]
  let cursor = prev.get(headId) ?? null
  while (cursor) {
    chain.push(cursor)
    cursor = prev.get(cursor) ?? null
  }
  return chain
}

export async function metricsForCreatives(
  heads: Head[],
  opts: { campaigns?: boolean } = {},
): Promise<Map<string, CreativeMetricsBundle>> {
  const result = new Map<string, CreativeMetricsBundle>()
  if (heads.length === 0) return result

  const prev = await previousById(heads)
  const lineage = new Map(heads.map((head) => [head.id, chainFrom(head.id, prev)]))
  const allIds = [...new Set([...lineage.values()].flat())]

  const [unitGroups, deployGroups, links] = await Promise.all([
    db.adUnit.groupBy({
      by: ['creativeId'],
      where: { creativeId: { in: allIds } },
      _sum: { impressions: true, clicks: true, conversions: true },
    }),
    db.deployment.groupBy({
      by: ['creativeId'],
      where: { creativeId: { in: allIds } },
      _sum: { impressions: true, clicks: true, conversions: true, spend: true },
    }),
    db.campaignCreative.findMany({
      where: { creativeId: { in: allIds } },
      select: opts.campaigns
        ? { creativeId: true, campaignId: true, campaign: { select: { id: true, name: true } } }
        : { creativeId: true, campaignId: true },
    }),
  ])

  const byCreative = new Map<string, CreativeMetricsBundle>()
  for (const id of allIds) byCreative.set(id, { ...ZERO, campaigns: [] })

  for (const row of unitGroups) {
    const entry = byCreative.get(row.creativeId)!
    entry.impressions += row._sum.impressions ?? 0
    entry.clicks += row._sum.clicks ?? 0
    entry.conversions += row._sum.conversions ?? 0
  }
  for (const row of deployGroups) {
    const entry = byCreative.get(row.creativeId)!
    entry.impressions += row._sum.impressions ?? 0
    entry.clicks += row._sum.clicks ?? 0
    entry.conversions += row._sum.conversions ?? 0
    entry.spend += toNumber(row._sum.spend)
  }
  for (const link of links) {
    const entry = byCreative.get(link.creativeId)!
    // Prisma's inferred element type for `links` collapses to a generic shape here since the
    // `select` above is chosen by a runtime ternary (opts.campaigns), not two statically distinct
    // queries — the `in` check still correctly narrows at runtime, just not at the type level.
    const campaign: CreativeCampaign =
      'campaign' in link && link.campaign
        ? (link.campaign as CreativeCampaign)
        : { id: link.campaignId, name: '' }
    if (!entry.campaigns.some((row) => row.id === campaign.id)) {
      entry.campaigns.push(campaign)
    }
  }

  for (const head of heads) {
    const merged = { ...ZERO, campaigns: [] as CreativeCampaign[] }
    for (const id of lineage.get(head.id) ?? [head.id]) {
      const part = byCreative.get(id)
      if (!part) continue
      merged.impressions += part.impressions
      merged.clicks += part.clicks
      merged.conversions += part.conversions
      merged.spend += part.spend
      for (const campaign of part.campaigns) {
        if (!merged.campaigns.some((row) => row.id === campaign.id)) merged.campaigns.push(campaign)
      }
    }
    merged.campaignCount = merged.campaigns.length
    result.set(head.id, merged)
  }
  return result
}
