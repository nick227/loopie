import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { toDealDTO, validateDealPolicy } from '../lib/dealPolicy'

function toClassDTO(row: {
  id: string
  businessId: string
  name: string
  maxAffiliateRateBps: number
  maxManagerShareBps: number
  defaultDealId: string | null
  createdAt: Date
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    maxAffiliateRateBps: row.maxAffiliateRateBps,
    maxManagerShareBps: row.maxManagerShareBps,
    defaultDealId: row.defaultDealId,
    createdAt: row.createdAt.toISOString(),
  }
}

function pageArgs(businessId: string, opts: { cursor?: string; limit?: number }) {
  const limit = normalizeLimit(opts.limit)
  const cursor = decodeCursor(opts.cursor)
  const AND: object[] = []
  if (cursor) {
    AND.push({
      OR: [
        { createdAt: { lt: new Date(cursor.createdAt) } },
        { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
      ],
    })
  }
  return {
    where: { businessId, ...(AND.length ? { AND } : {}) },
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: limit + 1,
    limit,
  }
}

async function paginate<T extends { createdAt: Date; id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
  return { items, meta: { hasMore, nextCursor } }
}

export class AffiliateCatalogService {
  async listClasses(businessId: string, opts: { cursor?: string; limit?: number }) {
    const args = pageArgs(businessId, opts)
    const { limit, ...query } = args
    const { items, meta } = await paginate(await db.affiliateClass.findMany(query), limit)
    return { data: items.map(toClassDTO), meta }
  }

  async createClass(businessId: string, data: { name: string; maxAffiliateRateBps: number; maxManagerShareBps: number }) {
    const row = await db.affiliateClass.create({
      data: {
        businessId,
        name: data.name,
        maxAffiliateRateBps: data.maxAffiliateRateBps,
        maxManagerShareBps: data.maxManagerShareBps,
      },
    })
    return toClassDTO(row)
  }

  async getClass(businessId: string, classId: string) {
    return toClassDTO(await this._findClass(businessId, classId))
  }

  async updateClass(
    businessId: string,
    classId: string,
    data: { name?: string; maxAffiliateRateBps?: number; maxManagerShareBps?: number; defaultDealId?: string | null },
  ) {
    await this._findClass(businessId, classId)
    if (data.defaultDealId) {
      const deal = await db.affiliateDeal.findFirst({ where: { id: data.defaultDealId, businessId } })
      if (!deal) throw { statusCode: 404, message: 'Deal not found' }
    }
    const row = await db.affiliateClass.update({
      where: { id: classId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.maxAffiliateRateBps !== undefined ? { maxAffiliateRateBps: data.maxAffiliateRateBps } : {}),
        ...(data.maxManagerShareBps !== undefined ? { maxManagerShareBps: data.maxManagerShareBps } : {}),
        ...(data.defaultDealId !== undefined ? { defaultDealId: data.defaultDealId } : {}),
      },
    })
    return toClassDTO(row)
  }

  async listDeals(businessId: string, opts: { cursor?: string; limit?: number }) {
    const args = pageArgs(businessId, opts)
    const { limit, ...query } = args
    const { items, meta } = await paginate(await db.affiliateDeal.findMany(query), limit)
    return { data: items.map(toDealDTO), meta }
  }

  async createDeal(businessId: string, data: Record<string, unknown>) {
    const rule = validateDealPolicy(data)
    if (data.classId) await this._findClass(businessId, data.classId as string)
    const row = await db.affiliateDeal.create({
      data: {
        businessId,
        classId: (data.classId as string) ?? null,
        name: data.name as string,
        ...rule,
        managerShareBps: (data.managerShareBps as number) ?? 0,
        eligibilityWindowDays: (data.eligibilityWindowDays as number) ?? null,
        payoutThresholdMinor: (data.payoutThresholdMinor as number) ?? null,
        payoutCadence: (data.payoutCadence as 'MANUAL' | 'WEEKLY' | 'MONTHLY') ?? 'MANUAL',
      },
    })
    return toDealDTO(row)
  }

  async getDeal(businessId: string, dealId: string) {
    return toDealDTO(await this._findDeal(businessId, dealId))
  }

  async updateDeal(businessId: string, dealId: string, data: Record<string, unknown>) {
    const existing = await this._findDeal(businessId, dealId)
    const rule = validateDealPolicy(data, existing)
    if (data.classId) await this._findClass(businessId, data.classId as string)
    const row = await db.affiliateDeal.update({
      where: { id: dealId },
      data: {
        ...(data.name !== undefined ? { name: data.name as string } : {}),
        ...(data.classId !== undefined ? { classId: data.classId as string | null } : {}),
        ...rule,
        ...(data.managerShareBps !== undefined ? { managerShareBps: data.managerShareBps as number } : {}),
        ...(data.eligibilityWindowDays !== undefined ? { eligibilityWindowDays: data.eligibilityWindowDays as number | null } : {}),
        ...(data.payoutThresholdMinor !== undefined ? { payoutThresholdMinor: data.payoutThresholdMinor as number | null } : {}),
        ...(data.payoutCadence !== undefined ? { payoutCadence: data.payoutCadence as 'MANUAL' | 'WEEKLY' | 'MONTHLY' } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive as boolean } : {}),
      },
    })
    return toDealDTO(row)
  }

  private async _findClass(businessId: string, classId: string) {
    const row = await db.affiliateClass.findFirst({ where: { id: classId, businessId } })
    if (!row) throw { statusCode: 404, message: 'Affiliate class not found' }
    return row
  }

  private async _findDeal(businessId: string, dealId: string) {
    const row = await db.affiliateDeal.findFirst({ where: { id: dealId, businessId } })
    if (!row) throw { statusCode: 404, message: 'Affiliate deal not found' }
    return row
  }
}
