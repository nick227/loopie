import bcrypt from 'bcryptjs'
import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { isUniqueConflict } from '../lib/prismaError'
import { dealPolicyFromRow } from '../lib/affiliateRates'
import type { AuthedUser } from '../lib/affiliateRoles'
import {
  affiliateInclude,
  assertDealWithinClassCaps,
  ensureNoManagerCycle,
  findAffiliate,
  toAffiliateDTO,
  withFrozenMoney,
} from './affiliateDto'

function randomReferralCode(): string {
  return Math.random().toString(36).slice(2, 10)
}

function randomPassword(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export class AffiliateService {
  async list(user: AuthedUser, opts: { cursor?: string; limit?: number }) {
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
    if (user.role === 'AFFILIATE') {
      const me = await db.affiliate.findFirst({ where: { userId: user.id, businessId: user.businessId } })
      if (!me) throw { statusCode: 404, message: 'Affiliate not found' }
      AND.push({ OR: [{ id: me.id }, { managerId: me.id }] })
    }
    const affiliates = await db.affiliate.findMany({
      where: { businessId: user.businessId, ...(AND.length ? { AND } : {}) },
      include: affiliateInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = affiliates.length > limit
    const items = hasMore ? affiliates.slice(0, limit) : affiliates
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: await withFrozenMoney(user.businessId, items.map((row) => toAffiliateDTO(row))), meta: { hasMore, nextCursor } }
  }

  async me(user: AuthedUser) {
    const row = await db.affiliate.findFirst({
      where: { userId: user.id, businessId: user.businessId },
      include: affiliateInclude,
    })
    if (!row) throw { statusCode: 404, message: 'Affiliate not found' }
    return (await withFrozenMoney(user.businessId, [toAffiliateDTO(row)]))[0]
  }

  async get(user: AuthedUser, affiliateId: string) {
    const row = await findAffiliate(user.businessId, affiliateId)
    await this._assertCanView(user, row)
    return (await withFrozenMoney(user.businessId, [toAffiliateDTO(row)]))[0]
  }

  async create(businessId: string, data: Record<string, unknown>) {
    if (data.destinationLandingPageId) {
      await this._assertLandingPage(businessId, data.destinationLandingPageId as string)
    }
    const dealId = await this._assertClassAndDeal(businessId, data)
    if (data.managerId) await findAffiliate(businessId, data.managerId as string)

    let initialPassword: string | undefined
    let userId: string | undefined
    if (data.createLogin) {
      if (!data.email) throw { statusCode: 400, message: 'email is required when createLogin is true' }
      initialPassword = randomPassword()
      const user = await db.user.create({
        data: {
          email: data.email as string,
          passwordHash: await bcrypt.hash(initialPassword, 12),
          businessId,
          role: 'AFFILIATE',
        },
      })
      userId = user.id
    }

    if (data.referralCode) {
      const clash = await db.affiliate.findUnique({ where: { referralCode: data.referralCode as string } })
      if (clash) throw { statusCode: 409, message: 'Referral code already in use' }
        const row = await this._createRow(businessId, data, data.referralCode as string, userId, dealId)
        return this._view(businessId, row, initialPassword ? { initialPassword } : undefined)
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const row = await this._createRow(businessId, data, randomReferralCode(), userId, dealId)
        return this._view(businessId, row, initialPassword ? { initialPassword } : undefined)
      } catch (err) {
        if (!isUniqueConflict(err)) throw err
      }
    }
    throw { statusCode: 500, message: 'Could not generate a unique referral code' }
  }

  async update(user: AuthedUser, affiliateId: string, data: Record<string, unknown>) {
    const existing = await findAffiliate(user.businessId, affiliateId)
    if (user.role === 'AFFILIATE') {
      const me = await db.affiliate.findFirst({ where: { userId: user.id, businessId: user.businessId } })
      if (!me || existing.managerId !== me.id) throw { statusCode: 403, message: 'Forbidden' }
      if (Object.keys(data).some((key) => key !== 'dealId')) {
        throw { statusCode: 403, message: 'Managers can only assign a deal' }
      }
    }
    if (data.dealId) await this._assertAssignableDeal(user.businessId, existing.classId, data.dealId as string)
    if (data.classId) {
      const cls = await db.affiliateClass.findFirst({ where: { id: data.classId as string, businessId: user.businessId } })
      if (!cls) throw { statusCode: 404, message: 'Affiliate class not found' }
    }
    if (data.managerId) {
      await findAffiliate(user.businessId, data.managerId as string)
      await ensureNoManagerCycle(affiliateId, data.managerId as string)
    }
    if (data.destinationLandingPageId) {
      await this._assertLandingPage(user.businessId, data.destinationLandingPageId as string)
    }
    const row = await db.affiliate.update({
      where: { id: affiliateId },
      include: affiliateInclude,
      data: {
        ...(data.name !== undefined ? { name: data.name as string } : {}),
        ...(data.email !== undefined ? { email: data.email as string | null } : {}),
        ...(data.classId !== undefined ? { classId: data.classId as string } : {}),
        ...(data.dealId !== undefined ? { dealId: data.dealId as string | null } : {}),
        ...(data.managerId !== undefined ? { managerId: data.managerId as string | null } : {}),
        ...(data.affiliateRateOverrideBps !== undefined ? { affiliateRateOverrideBps: data.affiliateRateOverrideBps as number | null } : {}),
        ...(data.managerShareOverrideBps !== undefined ? { managerShareOverrideBps: data.managerShareOverrideBps as number | null } : {}),
        ...(data.destinationLandingPageId !== undefined ? { destinationLandingPageId: data.destinationLandingPageId as string | null } : {}),
        ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl as string | null } : {}),
      },
    })
    return this._view(user.businessId, row)
  }

  async pause(businessId: string, affiliateId: string) {
    await findAffiliate(businessId, affiliateId)
    return this._view(
      businessId,
      await db.affiliate.update({
        where: { id: affiliateId },
        include: affiliateInclude,
        data: { isActive: false, pausedAt: new Date() },
      }),
    )
  }

  async resume(businessId: string, affiliateId: string) {
    await findAffiliate(businessId, affiliateId)
    return this._view(
      businessId,
      await db.affiliate.update({
        where: { id: affiliateId },
        include: affiliateInclude,
        data: { isActive: true, pausedAt: null },
      }),
    )
  }

  private async _createRow(
    businessId: string,
    data: Record<string, unknown>,
    referralCode: string,
    userId: string | undefined,
    dealId: string,
  ) {
    return db.affiliate.create({
      include: affiliateInclude,
      data: {
        businessId,
        name: data.name as string,
        email: (data.email as string) ?? null,
        referralCode,
        classId: data.classId as string,
        dealId,
        managerId: (data.managerId as string) ?? null,
        userId,
        destinationLandingPageId: (data.destinationLandingPageId as string) ?? null,
        destinationUrl: (data.destinationUrl as string) ?? null,
      },
    })
  }

  private async _view(
    businessId: string,
    row: Parameters<typeof toAffiliateDTO>[0],
    extra?: { initialPassword?: string },
  ) {
    const [view] = await withFrozenMoney(businessId, [toAffiliateDTO(row, extra)])
    return view
  }

  private async _assertLandingPage(businessId: string, landingPageId: string) {
    const page = await db.landingPage.findFirst({
      where: { id: landingPageId, businessId, deletedAt: null, status: 'PUBLISHED' },
    })
    if (!page) throw { statusCode: 404, message: 'Landing page not found' }
  }

  private async _assertClassAndDeal(businessId: string, data: Record<string, unknown>) {
    const cls = await db.affiliateClass.findFirst({
      where: { id: data.classId as string, businessId },
      include: { defaultDeal: true },
    })
    if (!cls) throw { statusCode: 404, message: 'Affiliate class not found' }
    const dealId = (data.dealId as string) ?? cls.defaultDealId
    if (!dealId) throw { statusCode: 409, message: 'Class has no default deal' }
    await this._assertAssignableDeal(businessId, cls.id, dealId)
    return dealId
  }

  private async _assertAssignableDeal(businessId: string, classId: string | null, dealId: string) {
    const deal = await db.affiliateDeal.findFirst({ where: { id: dealId, businessId } })
    if (!deal) throw { statusCode: 404, message: 'Deal not found' }
    if (!classId) throw { statusCode: 400, message: 'Affiliate class is required' }
    const cls = await db.affiliateClass.findFirst({ where: { id: classId, businessId } })
    if (!cls) throw { statusCode: 404, message: 'Affiliate class not found' }
    assertDealWithinClassCaps(cls, dealPolicyFromRow(deal))
  }

  private async _assertCanView(user: AuthedUser, row: { id: string; managerId: string | null; userId: string | null }) {
    if (user.role === 'ADMIN') return
    const me = await db.affiliate.findFirst({ where: { userId: user.id, businessId: user.businessId } })
    if (!me || (row.id !== me.id && row.managerId !== me.id)) throw { statusCode: 403, message: 'Forbidden' }
  }
}
