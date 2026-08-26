import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { requireAssets } from '../lib/ownership'

const INCLUDE = { assets: true }

function toCreativeDTO(creative: any) {
  return {
    id: creative.id,
    businessId: creative.businessId,
    name: creative.name,
    hostedUrl: creative.hostedUrl,
    version: creative.version,
    previousVersionId: creative.previousVersionId,
    assetIds: creative.assets?.map((a: any) => a.assetId) ?? [],
    createdAt: creative.createdAt.toISOString(),
  }
}

export class CreativeService {
  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    // Only latest-version creatives (nothing points back at them via previousVersionId)
    // surface in the list — superseded versions stay reachable through the chain.
    const creatives = await db.creative.findMany({
      where: { businessId, deletedAt: null, nextVersion: { is: null }, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: INCLUDE,
    })
    const hasMore = creatives.length > limit
    const items = hasMore ? creatives.slice(0, limit) : creatives
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toCreativeDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    await requireAssets(businessId, data.assetIds ?? [])
    const creative = await db.creative.create({
      data: { businessId, name: data.name, assets: { create: data.assetIds.map((assetId: string) => ({ assetId })) } },
      include: INCLUDE,
    })
    return toCreativeDTO(creative)
  }

  async get(businessId: string, creativeId: string) {
    const creative = await db.creative.findFirst({
      where: { id: creativeId, businessId, deletedAt: null },
      include: INCLUDE,
    })
    if (!creative) throw { statusCode: 404, message: 'Creative not found' }
    return toCreativeDTO(creative)
  }

  // Creative history is immutable (docs/03-creative-asset-system.md) — any change creates a
  // new version chained via previousVersionId rather than mutating the existing row.
  async update(businessId: string, creativeId: string, data: any) {
    const current = await db.creative.findFirst({ where: { id: creativeId, businessId, deletedAt: null } })
    if (!current) throw { statusCode: 404, message: 'Creative not found' }
    await requireAssets(businessId, data.assetIds ?? [])
    const next = await db.creative.create({
      data: {
        businessId,
        name: data.name ?? current.name,
        hostedUrl: current.hostedUrl,
        version: current.version + 1,
        previousVersionId: current.id,
        assets: { create: data.assetIds.map((assetId: string) => ({ assetId })) },
      },
      include: INCLUDE,
    })
    return toCreativeDTO(next)
  }

  async delete(businessId: string, creativeId: string) {
    await this.get(businessId, creativeId)
    await db.creative.update({ where: { id: creativeId }, data: { deletedAt: new Date() } })
  }
}
