import { db } from '@project/db'
import { trackedAffiliateUrl } from '../lib/urls'
import { dealPolicyFromRow, resolveDealPolicy, type DealPolicy } from '../lib/affiliateRates'

type AffiliateRow = {
  id: string
  businessId: string
  name: string
  email: string | null
  referralCode: string
  classId: string | null
  dealId: string | null
  managerId: string | null
  userId: string | null
  affiliateRateOverrideBps: number | null
  managerShareOverrideBps: number | null
  destinationLandingPageId: string | null
  destinationUrl: string | null
  isActive: boolean
  pausedAt: Date | null
  lastPayoutAt: Date | null
  createdAt: Date
  deal: Parameters<typeof dealPolicyFromRow>[0] | null
  class: { defaultDeal: Parameters<typeof dealPolicyFromRow>[0] | null } | null
  _count?: { downline: number }
}

export function resolvedPolicyFor(row: AffiliateRow): DealPolicy {
  return resolveDealPolicy({
    assignedDeal: row.deal ? dealPolicyFromRow(row.deal) : null,
    classDefaultDeal: row.class?.defaultDeal ? dealPolicyFromRow(row.class.defaultDeal) : null,
    overrideRateBps: row.affiliateRateOverrideBps,
    overrideManagerShareBps: row.managerShareOverrideBps,
  })
}

export function toAffiliateDTO(row: AffiliateRow, extra?: { initialPassword?: string }) {
  const policy = resolvedPolicyFor(row)
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    email: row.email,
    referralCode: row.referralCode,
    referralUrl: trackedAffiliateUrl(row.id),
    classId: row.classId,
    dealId: row.dealId,
    managerId: row.managerId,
    userId: row.userId,
    affiliateRateOverrideBps: row.affiliateRateOverrideBps,
    managerShareOverrideBps: row.managerShareOverrideBps,
    commissionRuleType: policy.commissionRuleType,
    commissionRateBps: policy.affiliateRateBps,
    commissionFixedAmountMinor: policy.fixedAmountMinor,
    managerShareBps: policy.managerShareBps,
    affiliateNetBps:
      row.managerId && policy.managerShareBps > 0 && policy.commissionRuleType === 'PERCENTAGE'
        ? Math.round(((policy.affiliateRateBps ?? 0) * (10000 - policy.managerShareBps)) / 10000)
        : policy.affiliateRateBps,
    eligibilityWindowDays: policy.eligibilityWindowDays,
    payoutThresholdMinor: policy.payoutThresholdMinor,
    payoutCadence: policy.payoutCadence,
    lastPayoutAt: row.lastPayoutAt?.toISOString() ?? null,
    downlineCount: row._count?.downline ?? 0,
    destinationLandingPageId: row.destinationLandingPageId,
    destinationUrl: row.destinationUrl,
    isActive: row.isActive,
    pausedAt: row.pausedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    ...(extra?.initialPassword ? { initialPassword: extra.initialPassword } : {}),
  }
}

export const affiliateInclude = {
  deal: true,
  class: { include: { defaultDeal: true } },
  _count: { select: { downline: true } },
} as const

export async function findAffiliate(businessId: string, affiliateId: string) {
  const row = await db.affiliate.findFirst({ where: { id: affiliateId, businessId }, include: affiliateInclude })
  if (!row) throw { statusCode: 404, message: 'Affiliate not found' }
  return row
}

export function assertDealWithinClassCaps(
  cls: { maxAffiliateRateBps: number; maxManagerShareBps: number },
  policy: DealPolicy,
) {
  if (policy.commissionRuleType === 'PERCENTAGE' && (policy.affiliateRateBps ?? 0) > cls.maxAffiliateRateBps) {
    throw { statusCode: 400, message: 'Deal affiliate rate exceeds class cap' }
  }
  if (policy.managerShareBps > cls.maxManagerShareBps) {
    throw { statusCode: 400, message: 'Deal manager share exceeds class cap' }
  }
}

export async function ensureNoManagerCycle(affiliateId: string, managerId: string) {
  if (managerId === affiliateId) throw { statusCode: 400, message: 'Affiliate cannot manage itself' }
  let current: string | null = managerId
  const seen = new Set<string>([affiliateId])
  while (current) {
    if (seen.has(current)) throw { statusCode: 400, message: 'Manager cycle' }
    seen.add(current)
    const next: { managerId: string | null } | null = await db.affiliate.findUnique({
      where: { id: current },
      select: { managerId: true },
    })
    current = next?.managerId ?? null
  }
}

