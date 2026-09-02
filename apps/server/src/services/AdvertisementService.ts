import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { canonicalJson } from '@project/embed-contract'
import crypto from 'crypto'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { requireAssets } from '../lib/ownership'
import { aspectRatio, matchPlacements } from '../lib/assetSpecs'
import { advertisementSummary } from '../lib/advertisementSummary'

// Advertisement is the "Media" layer's grouping entity in the Media -> Advertisement -> AdRun
// model (see CLAUDE.md's Media/Advertisement/AdRun migration audit) — its content comes directly
// from Asset via AdvertisementAsset, deliberately bypassing the old per-campaign Creative model.
// Media selection lives here, once, rather than being re-specified on every AdRun: an AdRun
// references its parent Advertisement's already-attached assets when it provisions on a platform.
const INCLUDE = {
  assets: { include: { asset: true } },
  runs: true,
  publishedVersions: { orderBy: { publishedAt: 'desc' }, take: 1 },
} as const

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
    primaryText: row.primaryText,
    ctaLabel: row.ctaLabel,
    destinationUrl: row.destinationUrl,
    assetIds: row.assets.map((a) => a.assetId),
    assets: row.assets.map((a) => toNestedAsset(a.asset)),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastPublishedAt: row.publishedVersions?.[0]?.publishedAt.toISOString() ?? null,
    ...advertisementSummary(row.runs),
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
      where: { businessId, deletedAt: null, ...(AND.length ? { AND } : {}) },
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

  async create(
    businessId: string,
    data: {
      name: string
      primaryText?: string
      ctaLabel?: string
      destinationUrl?: string
      assetIds?: string[]
    },
  ) {
    const assetIds = data.assetIds ?? []
    await requireAssets(businessId, assetIds)
    const row = await db.advertisement.create({
      data: {
        businessId,
        name: data.name,
        primaryText: data.primaryText ?? null,
        ctaLabel: data.ctaLabel ?? null,
        destinationUrl: data.destinationUrl ?? null,
        assets: { create: assetIds.map((assetId) => ({ assetId })) },
      },
      include: INCLUDE,
    })
    return toAdvertisementDTO(row)
  }

  async get(businessId: string, advertisementId: string) {
    const row = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId, deletedAt: null },
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
    data: {
      name?: string
      primaryText?: string | null
      ctaLabel?: string | null
      destinationUrl?: string | null
      assetIds?: string[]
    },
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
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.primaryText !== undefined ? { primaryText: data.primaryText } : {}),
          ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel } : {}),
          ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl } : {}),
        },
        include: INCLUDE,
      })
    })
    return toAdvertisementDTO(row)
  }

  private async _find(businessId: string, advertisementId: string) {
    const row = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId, deletedAt: null },
    })
    if (!row) throw { statusCode: 404, message: 'Advertisement not found' }
    return row
  }

  async delete(businessId: string, advertisementId: string) {
    await this._find(businessId, advertisementId)
    const deliveringRun = await db.adRun.findFirst({
      where: {
        advertisementId,
        status: { in: ['PENDING', 'READY', 'ACTIVE', 'PAUSED'] },
      },
      select: { id: true },
    })
    if (deliveringRun) {
      throw {
        statusCode: 409,
        message: 'End every active or paused destination before deleting this ad',
      }
    }
    await db.advertisement.update({
      where: { id: advertisementId },
      data: { deletedAt: new Date() },
    })
  }

  async publish(
    businessId: string,
    advertisementId: string,
    data: {
      clickBehavior?: 'NONE' | 'URL' | 'HOST'
      destinationUrl?: string
      dimensions?: string
      accessibleLabel?: string
    },
    publishedBy?: string,
  ) {
    const advertisement = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId, deletedAt: null },
      include: { assets: { orderBy: { id: 'asc' } } },
    })
    if (!advertisement) throw { statusCode: 404, message: 'Advertisement not found' }

    // Feed Ad POC: destinationUrl/clickBehavior default from the Advertisement's own draft
    // creative fields (set in the editor, alongside primaryText/ctaLabel) rather than requiring a
    // separate publish-time form — an explicit override in `data` still wins.
    const destinationUrl =
      data.destinationUrl !== undefined
        ? data.destinationUrl
        : (advertisement.destinationUrl ?? undefined)
    const clickBehavior = data.clickBehavior ?? (destinationUrl ? 'URL' : 'HOST')

    return db.$transaction(async (tx) => {
      const last = await tx.publishedAdvertisementVersion.findFirst({
        where: { advertisementId },
        orderBy: { version: 'desc' },
      })
      const nextVersion = (last?.version ?? 0) + 1

      const assetIds = advertisement.assets.map((a) => a.assetId)

      const payload = {
        accessibleLabel: data.accessibleLabel ?? null,
        assets: assetIds,
        primaryText: advertisement.primaryText,
        ctaLabel: advertisement.ctaLabel,
        clickBehavior,
        destinationUrl: destinationUrl ?? null,
        dimensions: data.dimensions
          ? {
              width: parseInt(data.dimensions.split('x')[0] || '0', 10),
              height: parseInt(data.dimensions.split('x')[1] || '0', 10),
            }
          : null,
      }

      const canonicalString = canonicalJson({
        rendererFormatVersion: 'advertisement-embed-v1',
        payload,
      })
      const checksum = crypto.createHash('sha256').update(canonicalString).digest('hex')

      const version = await tx.publishedAdvertisementVersion.create({
        data: {
          advertisementId,
          version: nextVersion,
          creativeSnapshot: payload,
          assetIds: assetIds,
          clickBehavior,
          destinationUrl: destinationUrl ?? null,
          dimensions: data.dimensions,
          accessibleLabel: data.accessibleLabel,
          checksum,
          publishedBy,
        },
      })

      return version
    })
  }
}
