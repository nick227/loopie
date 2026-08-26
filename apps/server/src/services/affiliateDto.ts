import { db } from '@project/db'
import { hostedPageUrl, trackedAffiliateUrl } from '../lib/urls'
import { connectStatus } from '../lib/connectStatus'
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
  stripeConnectAccountId: string | null
  stripePayoutsEnabled: boolean
  stripeDetailsSubmitted: boolean
  isActive: boolean
  pausedAt: Date | null
  lastPayoutAt: Date | null
  createdAt: Date
  deal: Parameters<typeof dealPolicyFromRow>[0] | null
  class: { name: string; defaultDeal: Parameters<typeof dealPolicyFromRow>[0] | null } | null
  manager: { name: string } | null
  destinationLandingPage: { name: string; slug: string } | null
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
    className: row.class?.name ?? null,
    managerName: row.manager?.name ?? null,
    destinationPageName: row.destinationLandingPage?.name ?? null,
    destinationHostedUrl: row.destinationLandingPage ? hostedPageUrl(row.destinationLandingPage.slug) : null,
    destinationLandingPageId: row.destinationLandingPageId,
    destinationUrl: row.destinationUrl,
    payoutsEnabled: row.stripePayoutsEnabled,
    connectStatus: connectStatus(row),
    isActive: row.isActive,
    pausedAt: row.pausedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    ...(extra?.initialPassword ? { initialPassword: extra.initialPassword } : {}),
  }
}

export const affiliateInclude = {
  deal: true,
  class: { include: { defaultDeal: true } },
  manager: { select: { name: true } },
  destinationLandingPage: { select: { name: true, slug: true } },
  _count: { select: { downline: true } },
} as const

export async function withFrozenMoney<T extends { id: string }>(
  businessId: string,
  rows: T[],
): Promise<Array<T & { pendingMinor: number; payableMinor: number; paidMinor: number }>> {
  const zeros = { pendingMinor: 0, payableMinor: 0, paidMinor: 0 }
  if (rows.length === 0) return []
  const groups = await db.commission.groupBy({
    by: ['payeeRef', 'status'],
    where: {
      businessId,
      payeeRef: { in: rows.map((row) => `affiliate:${row.id}`) },
      status: { in: ['PENDING', 'PAYABLE', 'PAID'] },
    },
    _sum: { amountMinor: true },
  })
  const byId = new Map(rows.map((row) => [row.id, { ...zeros }]))
  for (const group of groups) {
    const id = group.payeeRef.replace(/^affiliate:/, '')
    const slot = byId.get(id)
    if (!slot) continue
    const amount = group._sum.amountMinor ?? 0
    if (group.status === 'PENDING') slot.pendingMinor = amount
    if (group.status === 'PAYABLE') slot.payableMinor = amount
    if (group.status === 'PAID') slot.paidMinor = amount
  }
  return rows.map((row) => ({ ...row, ...byId.get(row.id)! }))
}

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

