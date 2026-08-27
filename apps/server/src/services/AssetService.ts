import { db } from '@project/db'
import type { Asset, Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { aspectRatio, matchPlacements, type PlacementId } from '../lib/assetSpecs'
import { saveMediaFile } from '../lib/mediaStorage'

type AssetType = 'IMAGE' | 'TEXT' | 'VIDEO' | 'AUDIO'

type AssetFileInput = {
  filename: string
  mimeType: string
  data: string
}

type AssetWriteInput = {
  type?: AssetType
  name?: string
  url?: string
  textContent?: string
  mimeType?: string
  sizeBytes?: number
  widthPx?: number
  heightPx?: number
  durationMs?: number
  file?: AssetFileInput
}

type AssetRow = Asset

function specsFrom(asset: AssetRow) {
  const widthPx = asset.widthPx
  const heightPx = asset.heightPx
  const placements: PlacementId[] = widthPx && heightPx ? matchPlacements(widthPx, heightPx) : []
  return {
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    widthPx,
    heightPx,
    durationMs: asset.durationMs,
    aspectRatio: widthPx && heightPx ? aspectRatio(widthPx, heightPx) : null,
    placements,
  }
}

function toAssetDTO(asset: AssetRow, usage: { usedInAds: number; usedInTemplates: number }) {
  return {
    id: asset.id,
    businessId: asset.businessId,
    type: asset.type,
    name: asset.name,
    url: asset.url,
    textContent: asset.textContent,
    createdAt: asset.createdAt.toISOString(),
    ...specsFrom(asset),
    usedInAds: usage.usedInAds,
    usedInTemplates: usage.usedInTemplates,
  }
}

async function usageByAssetIds(ids: string[]) {
  const empty = { usedInAds: 0, usedInTemplates: 0 }
  const map = new Map(ids.map((id) => [id, { ...empty }]))
  if (ids.length === 0) return map

  const [ads, advertisementAds, templates] = await Promise.all([
    db.creativeAsset.groupBy({
      by: ['assetId'],
      where: { assetId: { in: ids }, creative: { deletedAt: null } },
      _count: { _all: true },
    }),
    db.advertisementAsset.groupBy({
      by: ['assetId'],
      where: { assetId: { in: ids } },
      _count: { _all: true },
    }),
    db.templateMedia.groupBy({
      by: ['assetId'],
      where: { assetId: { in: ids }, template: { deletedAt: null } },
      _count: { _all: true },
    }),
  ])

  for (const row of [...ads, ...advertisementAds]) {
    const current = map.get(row.assetId)
    if (current) current.usedInAds += row._count._all
  }
  for (const row of templates) {
    const current = map.get(row.assetId)
    if (current) current.usedInTemplates = row._count._all
  }
  return map
}

async function withUsage(assets: AssetRow[]) {
  const usage = await usageByAssetIds(assets.map((row) => row.id))
  return assets.map((asset) => toAssetDTO(asset, usage.get(asset.id)!))
}

async function applyFile(data: AssetWriteInput) {
  if (!data.file) return data
  const saved = await saveMediaFile({ mimeType: data.file.mimeType, data: data.file.data })
  return {
    ...data,
    url: saved.url,
    mimeType: saved.mimeType,
    sizeBytes: saved.sizeBytes,
  }
}

export class AssetService {
  async list(
    businessId: string,
    opts: { cursor?: string; limit?: number; type?: string; q?: string },
  ) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: Prisma.AssetWhereInput[] = []
    if (opts.type) AND.push({ type: opts.type as AssetType })
    if (opts.q) AND.push({ name: { contains: opts.q } })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const assets = await db.asset.findMany({
      where: { businessId, deletedAt: null, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = assets.length > limit
    const items = hasMore ? assets.slice(0, limit) : assets
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: await withUsage(items), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: AssetWriteInput) {
    const input = await applyFile(data)
    const asset = await db.asset.create({
      data: {
        businessId,
        type: input.type!,
        name: input.name!,
        url: input.url,
        textContent: input.textContent,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        widthPx: input.widthPx,
        heightPx: input.heightPx,
        durationMs: input.durationMs,
      },
    })
    return (await withUsage([asset]))[0]
  }

  async get(businessId: string, assetId: string) {
    const asset = await db.asset.findFirst({ where: { id: assetId, businessId, deletedAt: null } })
    if (!asset) throw { statusCode: 404, message: 'Asset not found' }
    return (await withUsage([asset]))[0]
  }

  async update(businessId: string, assetId: string, data: AssetWriteInput) {
    await this.get(businessId, assetId)
    const input = await applyFile(data)
    const asset = await db.asset.update({
      where: { id: assetId },
      data: {
        name: input.name,
        url: input.url,
        textContent: input.textContent,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        widthPx: input.widthPx,
        heightPx: input.heightPx,
        durationMs: input.durationMs,
      },
    })
    return (await withUsage([asset]))[0]
  }

  async delete(businessId: string, assetId: string) {
    await this.get(businessId, assetId)
    await db.asset.update({ where: { id: assetId }, data: { deletedAt: new Date() } })
  }
}
