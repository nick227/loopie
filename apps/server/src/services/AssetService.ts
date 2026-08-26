import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

function toAssetDTO(asset: any) {
  return {
    id: asset.id,
    businessId: asset.businessId,
    type: asset.type,
    name: asset.name,
    url: asset.url,
    textContent: asset.textContent,
    createdAt: asset.createdAt.toISOString(),
  }
}

export class AssetService {
  async list(businessId: string, opts: { cursor?: string; limit?: number; type?: string }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (opts.type) AND.push({ type: opts.type })
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
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toAssetDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    const asset = await db.asset.create({
      data: { businessId, type: data.type, name: data.name, url: data.url, textContent: data.textContent },
    })
    return toAssetDTO(asset)
  }

  async get(businessId: string, assetId: string) {
    const asset = await db.asset.findFirst({ where: { id: assetId, businessId, deletedAt: null } })
    if (!asset) throw { statusCode: 404, message: 'Asset not found' }
    return toAssetDTO(asset)
  }

  async delete(businessId: string, assetId: string) {
    await this.get(businessId, assetId)
    await db.asset.update({ where: { id: assetId }, data: { deletedAt: new Date() } })
  }
}
