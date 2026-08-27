import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { requireAssets } from '../lib/ownership'
import { aspectRatio, matchPlacements } from '../lib/assetSpecs'

// Advertisement is the "Media" layer's grouping entity in the Media -> Advertisement -> AdRun
// model (see CLAUDE.md's Media/Advertisement/AdRun migration audit) — its content comes directly
// from Asset via AdvertisementAsset, deliberately bypassing the old per-campaign Creative model.
// Media selection lives here, once, rather than being re-specified on every AdRun: an AdRun
// references its parent Advertisement's already-attached assets when it provisions on a platform.
const INCLUDE = { assets: { include: { asset: true } } } as const

type AdvertisementRow = Prisma.AdvertisementGetPayload<{ include: typeof INCLUDE }>

function toNestedAsset(asset: AdvertisementRow['assets'][number]['asset']) {
  const widthPx = asset.widthPx
  const heightPx = asset.heightPx
  return {
    id: asset.id,
    businessId: asset.businessId,
    type: asset.type,
    name: asset.name,
    url: asset.url,
    textContent: asset.textContent,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    widthPx,
    heightPx,
    durationMs: asset.durationMs,
    aspectRatio: widthPx && heightPx ? aspectRatio(widthPx, heightPx) : null,
    placements: widthPx && heightPx ? matchPlacements(widthPx, heightPx) : [],
    usedInAds: 0,
    usedInTemplates: 0,
    createdAt: asset.createdAt.toISOString(),
  }
}

function toAdvertisementDTO(row: AdvertisementRow) {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    assetIds: row.assets.map((a) => a.assetId),
    assets: row.assets.map((a) => toNestedAsset(a.asset)),
    createdAt: row.createdAt.toISOString(),
  }
}

export class AdvertisementService {
  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: Prisma.AdvertisementWhereInput[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const rows = await db.advertisement.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: INCLUDE,
    })
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toAdvertisementDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: { name: string; assetIds?: string[] }) {
    const assetIds = data.assetIds ?? []
    await requireAssets(businessId, assetIds)
    const row = await db.advertisement.create({
      data: {
        businessId,
        name: data.name,
        assets: { create: assetIds.map((assetId) => ({ assetId })) },
      },
      include: INCLUDE,
    })
    return toAdvertisementDTO(row)
  }

  async get(businessId: string, advertisementId: string) {
    const row = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId },
      include: INCLUDE,
    })
    if (!row) throw { statusCode: 404, message: 'Advertisement not found' }
    return toAdvertisementDTO(row)
  }

  // Wholesale replace, same convention as CampaignService.update's creativeIds diff — not
  // versioned like Creative (Advertisement is a live, editable grouping entity, not a frozen
  // per-send snapshot). Adding/removing media here only affects AdRuns provisioned *after* this
  // call; an already-pushed AdRun's external platform object is not retroactively touched.
  async update(
    businessId: string,
    advertisementId: string,
    data: { name?: string; assetIds?: string[] },
  ) {
    await this._find(businessId, advertisementId)
    if (data.assetIds !== undefined) await requireAssets(businessId, data.assetIds)
    const row = await db.$transaction(async (tx) => {
      if (data.assetIds !== undefined) {
        await tx.advertisementAsset.deleteMany({ where: { advertisementId } })
        if (data.assetIds.length) {
          await tx.advertisementAsset.createMany({
            data: data.assetIds.map((assetId) => ({ advertisementId, assetId })),
          })
        }
      }
      return tx.advertisement.update({
        where: { id: advertisementId },
        data: { ...(data.name !== undefined ? { name: data.name } : {}) },
        include: INCLUDE,
      })
    })
    return toAdvertisementDTO(row)
  }

  private async _find(businessId: string, advertisementId: string) {
    const row = await db.advertisement.findFirst({ where: { id: advertisementId, businessId } })
    if (!row) throw { statusCode: 404, message: 'Advertisement not found' }
    return row
  }
}
