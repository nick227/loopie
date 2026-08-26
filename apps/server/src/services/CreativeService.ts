import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { requireAssets } from '../lib/ownership'
import { metricsForCreatives, type CreativeMetricsBundle } from '../lib/creativeMetrics'

const INCLUDE = { assets: { include: { asset: true } } } as const

type CreativeRow = Prisma.CreativeGetPayload<{ include: typeof INCLUDE }>

type CreativeInput = {
  name?: string
  assetIds: string[]
}

function previewUrl(creative: CreativeRow) {
  const image = creative.assets.find((row) => row.asset.type === 'IMAGE' && row.asset.url)
  return image?.asset.url ?? creative.assets.find((row) => row.asset.url)?.asset.url ?? null
}

function toCreativeDTO(
  creative: CreativeRow,
  metrics: CreativeMetricsBundle,
  withCampaigns: boolean,
) {
  return {
    id: creative.id,
    businessId: creative.businessId,
    name: creative.name,
    hostedUrl: creative.hostedUrl,
    version: creative.version,
    previousVersionId: creative.previousVersionId,
    assetIds: creative.assets.map((row) => row.assetId),
    previewUrl: previewUrl(creative),
    createdAt: creative.createdAt.toISOString(),
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    conversions: metrics.conversions,
    spend: metrics.spend,
    campaignCount: metrics.campaignCount,
    ...(withCampaigns ? { campaigns: metrics.campaigns } : {}),
  }
}

async function withMetrics(rows: CreativeRow[], withCampaigns: boolean) {
  const metrics = await metricsForCreatives(rows)
  return rows.map((row) => toCreativeDTO(row, metrics.get(row.id)!, withCampaigns))
}

export class CreativeService {
  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: Prisma.CreativeWhereInput[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const creatives = await db.creative.findMany({
      where: {
        businessId,
        deletedAt: null,
        nextVersion: { is: null },
        ...(AND.length ? { AND } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: INCLUDE,
    })
    const hasMore = creatives.length > limit
    const items = hasMore ? creatives.slice(0, limit) : creatives
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: await withMetrics(items, false), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: CreativeInput) {
    await requireAssets(businessId, data.assetIds)
    const creative = await db.creative.create({
      data: {
        businessId,
        name: data.name!,
        assets: { create: data.assetIds.map((assetId) => ({ assetId })) },
      },
      include: INCLUDE,
    })
    return (await withMetrics([creative], false))[0]
  }

  async get(businessId: string, creativeId: string) {
    const creative = await db.creative.findFirst({
      where: { id: creativeId, businessId, deletedAt: null },
      include: INCLUDE,
    })
    if (!creative) throw { statusCode: 404, message: 'Creative not found' }
    return (await withMetrics([creative], true))[0]
  }

  async update(businessId: string, creativeId: string, data: CreativeInput) {
    const current = await db.creative.findFirst({
      where: { id: creativeId, businessId, deletedAt: null },
    })
    if (!current) throw { statusCode: 404, message: 'Creative not found' }
    await requireAssets(businessId, data.assetIds)
    const next = await db.creative.create({
      data: {
        businessId,
        name: data.name ?? current.name,
        hostedUrl: current.hostedUrl,
        version: current.version + 1,
        previousVersionId: current.id,
        assets: { create: data.assetIds.map((assetId) => ({ assetId })) },
      },
      include: INCLUDE,
    })
    return (await withMetrics([next], true))[0]
  }

  async delete(businessId: string, creativeId: string) {
    await this.get(businessId, creativeId)
    await db.creative.update({ where: { id: creativeId }, data: { deletedAt: new Date() } })
  }
}
