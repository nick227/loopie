import { db } from '@project/db'
import type { Prisma } from '@prisma/client'

export const platformAffiliateInclude = {
  class: true,
  deal: true,
  manager: true,
  user: { select: { id: true, email: true } },
} satisfies Prisma.PlatformAffiliateInclude

export const platformAffiliateDealInclude = {
  class: true,
} satisfies Prisma.PlatformAffiliateDealInclude

export class PlatformAffiliateService {
  async listAffiliates() {
    const affiliates = await db.platformAffiliate.findMany({
      include: platformAffiliateInclude,
      orderBy: { createdAt: 'desc' },
    })
    return { data: affiliates }
  }

  async getAffiliate(id: string) {
    const affiliate = await db.platformAffiliate.findUnique({
      where: { id },
      include: platformAffiliateInclude,
    })
    if (!affiliate) throw { statusCode: 404, message: 'Platform affiliate not found' }
    return { data: affiliate }
  }

  async createAffiliate(input: {
    name: string
    email?: string | null
    referralCode?: string
    classId?: string | null
    dealId?: string | null
    managerId?: string | null
    userId?: string | null
  }) {
    if (!input.name) throw { statusCode: 400, message: 'Name is required' }
    const referralCode =
      input.referralCode ||
      input.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.floor(Math.random() * 10000)

    // Check if referral code exists
    const existing = await db.platformAffiliate.findUnique({ where: { referralCode } })
    if (existing) throw { statusCode: 409, message: 'Referral code already exists' }

    if (input.dealId && input.classId) {
      const deal = await db.platformAffiliateDeal.findUnique({ where: { id: input.dealId } })
      if (deal && deal.classId && deal.classId !== input.classId) {
        throw { statusCode: 400, message: 'Deal does not belong to the specified class' }
      }
    }

    const affiliate = await db.platformAffiliate.create({
      data: {
        name: input.name,
        email: input.email,
        referralCode,
        classId: input.classId,
        dealId: input.dealId,
        managerId: input.managerId,
        userId: input.userId,
      },
      include: platformAffiliateInclude,
    })
    return { data: affiliate }
  }

  async updateAffiliate(
    id: string,
    input: {
      name?: string
      email?: string | null
      classId?: string | null
      dealId?: string | null
      managerId?: string | null
      affiliateRateOverrideBps?: number | null
      managerShareOverrideBps?: number | null
      isActive?: boolean
    },
  ) {
    const existing = await db.platformAffiliate.findUnique({ where: { id } })
    if (!existing) throw { statusCode: 404, message: 'Platform affiliate not found' }

    const data: Prisma.PlatformAffiliateUncheckedUpdateInput = {}
    if (input.name !== undefined) data.name = input.name
    if (input.email !== undefined) data.email = input.email
    if (input.classId !== undefined) data.classId = input.classId
    if (input.dealId !== undefined) data.dealId = input.dealId
    if (input.managerId !== undefined) data.managerId = input.managerId
    if (input.affiliateRateOverrideBps !== undefined)
      data.affiliateRateOverrideBps = input.affiliateRateOverrideBps
    if (input.managerShareOverrideBps !== undefined)
      data.managerShareOverrideBps = input.managerShareOverrideBps
    if (input.isActive !== undefined) data.isActive = input.isActive

    const affiliate = await db.platformAffiliate.update({
      where: { id },
      data,
      include: platformAffiliateInclude,
    })
    return { data: affiliate }
  }

  // --- Deals & Classes ---

  async listDeals() {
    const deals = await db.platformAffiliateDeal.findMany({
      include: platformAffiliateDealInclude,
      orderBy: { createdAt: 'desc' },
    })
    return { data: deals }
  }

  async createDeal(input: {
    name: string
    classId?: string | null
    affiliateRateBps?: number | null
    managerShareBps: number
  }) {
    if (!input.name) throw { statusCode: 400, message: 'Name is required' }
    const deal = await db.platformAffiliateDeal.create({
      data: {
        name: input.name,
        classId: input.classId,
        affiliateRateBps: input.affiliateRateBps,
        managerShareBps: input.managerShareBps,
      },
      include: platformAffiliateDealInclude,
    })
    return { data: deal }
  }

  async listClasses() {
    const classes = await db.platformAffiliateClass.findMany({
      include: { defaultDeal: true },
      orderBy: { createdAt: 'desc' },
    })
    return { data: classes }
  }

  // --- Attributions ---

  async getAttributionForBusiness(businessId: string) {
    const attr = await db.businessAffiliateAttribution.findUnique({
      where: { businessId },
      include: {
        affiliate: true,
        managerAffiliate: true,
        affiliateDeal: true,
      },
    })
    return { data: attr }
  }

  async setBusinessAttribution(businessId: string, affiliateId: string) {
    // Look up the affiliate
    const affiliate = await db.platformAffiliate.findUnique({
      where: { id: affiliateId },
      include: { deal: true, class: { include: { defaultDeal: true } }, manager: true },
    })
    if (!affiliate) throw { statusCode: 404, message: 'Platform affiliate not found' }

    // Resolve active deal
    const deal = affiliate.deal || affiliate.class?.defaultDeal
    if (!deal) throw { statusCode: 409, message: 'Affiliate has no active deal configured' }

    // Resolve rates
    const affiliateRateBps = affiliate.affiliateRateOverrideBps ?? deal.affiliateRateBps ?? 0
    const managerAffiliateId = affiliate.managerId
    const managerShareBps = managerAffiliateId
      ? (affiliate.managerShareOverrideBps ?? deal.managerShareBps)
      : null

    const attr = await db.businessAffiliateAttribution.upsert({
      where: { businessId },
      update: {
        affiliateId,
        affiliateDealId: deal.id,
        affiliateRateBps,
        managerAffiliateId,
        managerShareBps,
      },
      create: {
        businessId,
        affiliateId,
        affiliateDealId: deal.id,
        affiliateRateBps,
        managerAffiliateId,
        managerShareBps,
      },
      include: { affiliate: true, managerAffiliate: true },
    })

    return { data: attr }
  }

  // --- Affiliate Portal Methods ---

  async getAffiliateOverview(userId: string) {
    const affiliate = await db.platformAffiliate.findUnique({ where: { userId } })
    if (!affiliate) throw { statusCode: 404, message: 'Affiliate not found' }

    // Aggregate attributions for clients and licenses
    const attributions = await db.businessAffiliateAttribution.findMany({
      where: {
        OR: [{ affiliateId: affiliate.id }, { managerAffiliateId: affiliate.id }],
      },
      include: { business: { include: { license: true } } },
    })

    const clients = attributions.length
    const activeLicenses = attributions.filter(
      (a) => a.business?.license?.status === 'ACTIVE',
    ).length

    // Aggregate membership revenue for those businesses
    const businessIds = attributions.map((a) => a.businessId)
    const membershipPayments = await db.membershipPayment.aggregate({
      where: { businessId: { in: businessIds } },
      _sum: { amountMinor: true },
    })
    const membershipRevenueMinor = membershipPayments._sum.amountMinor ?? 0

    // Aggregate earnings
    const earnings = await db.platformAffiliateEarning.groupBy({
      by: ['status'],
      where: { beneficiaryAffiliateId: affiliate.id },
      _sum: { amountMinor: true },
    })
    const getStatusSum = (status: string) =>
      earnings.find((e) => e.status === status)?._sum.amountMinor ?? 0

    return {
      data: {
        clients,
        activeLicenses,
        membershipRevenueMinor,
        pendingEarningsMinor: getStatusSum('PENDING'),
        payableEarningsMinor: getStatusSum('PAYABLE'),
        paidEarningsMinor: getStatusSum('PAID'),
      },
    }
  }

  async getAffiliateClients(userId: string) {
    const affiliate = await db.platformAffiliate.findUnique({ where: { userId } })
    if (!affiliate) throw { statusCode: 404, message: 'Affiliate not found' }

    const attributions = await db.businessAffiliateAttribution.findMany({
      where: {
        OR: [{ affiliateId: affiliate.id }, { managerAffiliateId: affiliate.id }],
      },
      include: { business: { include: { license: true } } },
      orderBy: { attributedAt: 'desc' },
    })

    const clientsData = await Promise.all(
      attributions.map(async (attr) => {
        // Calculate revenue and earnings for this specific business
        const payments = await db.membershipPayment.aggregate({
          where: { businessId: attr.businessId },
          _sum: { amountMinor: true },
        })

        const earnings = await db.platformAffiliateEarning.aggregate({
          where: {
            beneficiaryAffiliateId: affiliate.id,
            membershipPayment: { businessId: attr.businessId },
          },
          _sum: { amountMinor: true },
        })

        const isDirect = attr.affiliateId === affiliate.id
        const effectiveRateBps = isDirect ? attr.affiliateRateBps : attr.managerShareBps

        return {
          id: attr.businessId,
          name: attr.business.name,
          licenseState: attr.business.license?.status ?? 'UNKNOWN',
          attributedAt: attr.attributedAt.toISOString(),
          directRateBps: effectiveRateBps ?? 0,
          membershipRevenueMinor: payments._sum.amountMinor ?? 0,
          cumulativeEarningsMinor: earnings._sum.amountMinor ?? 0,
        }
      }),
    )

    return { data: clientsData, nextCursor: null }
  }

  // --- Money Flow ---

  async getMoneyFlowLedger(cursor?: string) {
    const limit = 50

    let aggregates = null

    // Fetch aggregate totals only on the first page
    if (!cursor) {
      const [revenueResult, earningsResult, payoutsResult] = await Promise.all([
        db.membershipPayment.aggregate({ _sum: { amountMinor: true } }),
        db.platformAffiliateEarning.groupBy({
          by: ['status', 'type'],
          _sum: { amountMinor: true },
        }),
        db.platformAffiliatePayout.groupBy({ by: ['status'], _sum: { totalAmountMinor: true } }),
      ])

      const membershipRevenueMinor = revenueResult._sum.amountMinor ?? 0

      let affiliateEarningsMinor = 0
      let managerOverridesMinor = 0
      let payableLiabilityMinor = 0

      for (const e of earningsResult) {
        if (e.type === 'DIRECT') affiliateEarningsMinor += e._sum.amountMinor ?? 0
        if (e.type === 'MANAGER_OVERRIDE') managerOverridesMinor += e._sum.amountMinor ?? 0
        if (e.status === 'PAYABLE') payableLiabilityMinor += e._sum.amountMinor ?? 0
      }

      const pendingPayoutTotalMinor =
        payoutsResult.find((p) => p.status === 'PENDING')?._sum.totalAmountMinor ?? 0
      const paidTotalMinor =
        payoutsResult.find((p) => p.status === 'PAID')?._sum.totalAmountMinor ?? 0

      aggregates = {
        membershipRevenueMinor,
        affiliateEarningsMinor,
        managerOverridesMinor,
        payableLiabilityMinor,
        pendingPayoutTotalMinor,
        paidTotalMinor,
      }
    }

    // Fetch payments list
    const payments = await db.membershipPayment.findMany({
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { settledAt: 'desc' },
      include: {
        business: { select: { id: true, name: true } },
        earnings: {
          include: {
            beneficiaryAffiliate: { select: { id: true, name: true } },
          },
        },
      },
    })

    let nextCursor: string | null = null
    if (payments.length > limit) {
      const nextItem = payments.pop()
      nextCursor = nextItem!.id
    }

    return {
      data: {
        aggregates,
        payments,
      },
      nextCursor,
    }
  }

  // --- Payouts ---

  async listPayouts() {
    const payouts = await db.platformAffiliatePayout.findMany({
      include: { affiliate: true, earnings: true },
      orderBy: { createdAt: 'desc' },
    })
    return { data: payouts, nextCursor: null }
  }

  async getPayableEarningsSummary() {
    // Find all earnings that are PAYABLE and not yet attached to a payout
    const earnings = await db.platformAffiliateEarning.findMany({
      where: {
        status: 'PAYABLE',
        payoutId: null,
      },
      include: {
        beneficiaryAffiliate: true,
      },
    })

    const summaryMap = new Map<
      string,
      { affiliateId: string; affiliateName: string; totalAmountMinor: number; earningIds: string[] }
    >()

    for (const e of earnings) {
      if (!summaryMap.has(e.beneficiaryAffiliateId)) {
        summaryMap.set(e.beneficiaryAffiliateId, {
          affiliateId: e.beneficiaryAffiliateId,
          affiliateName: e.beneficiaryAffiliate.name,
          totalAmountMinor: 0,
          earningIds: [],
        })
      }
      const entry = summaryMap.get(e.beneficiaryAffiliateId)!
      entry.totalAmountMinor += e.amountMinor
      entry.earningIds.push(e.id)
    }

    return { data: Array.from(summaryMap.values()) }
  }

  async createPayout(input: { affiliateId: string; earningIds: string[] }) {
    if (input.earningIds.length === 0) throw { statusCode: 400, message: 'No earnings provided' }

    return await db.$transaction(async (tx) => {
      // Verify all earnings belong to affiliate and are PAYABLE
      const earnings = await tx.platformAffiliateEarning.findMany({
        where: {
          id: { in: input.earningIds },
          payoutId: null,
        },
      })
      if (earnings.length !== input.earningIds.length) {
        throw { statusCode: 400, message: 'Some earnings were not found' }
      }

      let totalAmountMinor = 0
      for (const earning of earnings) {
        if (earning.beneficiaryAffiliateId !== input.affiliateId) {
          throw { statusCode: 400, message: 'Earnings must belong to the specified affiliate' }
        }
        if (earning.status !== 'PAYABLE') {
          throw { statusCode: 400, message: 'All earnings must be in PAYABLE status' }
        }
        totalAmountMinor += earning.amountMinor
      }

      if (totalAmountMinor < 0) {
        throw { statusCode: 400, message: 'Payout amount cannot be negative' }
      }

      const payout = await tx.platformAffiliatePayout.create({
        data: {
          affiliateId: input.affiliateId,
          totalAmountMinor,
          currency: 'USD',
          status: 'PENDING',
        },
      })

      // Link earnings to payout and mark as PAID?
      // Wait, the status is PENDING for the payout, so earnings should also be marked as PAID when payout settles?
      // For now, let's just link them.
      await tx.platformAffiliateEarning.updateMany({
        where: { id: { in: input.earningIds } },
        data: { payoutId: payout.id },
      })

      return { data: payout }
    })
  }

  async settlePayout(payoutId: string) {
    return await db.$transaction(async (tx) => {
      const payout = await tx.platformAffiliatePayout.findUnique({ where: { id: payoutId } })
      if (!payout) throw { statusCode: 404, message: 'Payout not found' }
      if (payout.status === 'PAID') throw { statusCode: 400, message: 'Payout is already settled' }

      const updatedPayout = await tx.platformAffiliatePayout.update({
        where: { id: payoutId },
        data: { status: 'PAID' },
      })

      await tx.platformAffiliateEarning.updateMany({
        where: { payoutId },
        data: { status: 'PAID' },
      })

      return { data: updatedPayout }
    })
  }
}
