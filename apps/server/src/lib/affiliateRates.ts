export type CommissionRuleType = 'PERCENTAGE' | 'FIXED'
export type PayoutCadence = 'MANUAL' | 'WEEKLY' | 'MONTHLY'

export type DealPolicy = {
  commissionRuleType: CommissionRuleType
  affiliateRateBps: number | null
  fixedAmountMinor: number | null
  managerShareBps: number
  eligibilityWindowDays: number | null
  payoutThresholdMinor: number | null
  payoutCadence: PayoutCadence
}

export function dealPolicyFromRow(deal: {
  commissionRuleType: string
  affiliateRateBps: number | null
  fixedAmountMinor: number | null
  managerShareBps: number
  eligibilityWindowDays: number | null
  payoutThresholdMinor: number | null
  payoutCadence: string
}): DealPolicy {
  return {
    commissionRuleType: deal.commissionRuleType as CommissionRuleType,
    affiliateRateBps: deal.affiliateRateBps,
    fixedAmountMinor: deal.fixedAmountMinor,
    managerShareBps: deal.managerShareBps,
    eligibilityWindowDays: deal.eligibilityWindowDays,
    payoutThresholdMinor: deal.payoutThresholdMinor,
    payoutCadence: deal.payoutCadence as PayoutCadence,
  }
}

export function resolveDealPolicy(input: {
  assignedDeal: DealPolicy | null
  classDefaultDeal: DealPolicy | null
  overrideRateBps: number | null
  overrideManagerShareBps: number | null
}): DealPolicy {
  const deal = input.assignedDeal ?? input.classDefaultDeal
  if (!deal) throw { statusCode: 409, message: 'Affiliate has no deal or class default' }
  return {
    ...deal,
    affiliateRateBps:
      deal.commissionRuleType === 'PERCENTAGE' ? input.overrideRateBps ?? deal.affiliateRateBps : null,
    managerShareBps: input.overrideManagerShareBps ?? deal.managerShareBps,
  }
}

export function computeGrossCommissionMinor(policy: DealPolicy, saleAmountMinor: number): number {
  if (policy.commissionRuleType === 'FIXED') {
    return Math.min(policy.fixedAmountMinor ?? 0, saleAmountMinor)
  }
  return Math.round(saleAmountMinor * ((policy.affiliateRateBps ?? 0) / 10000))
}

export function computeSaleSplit(input: {
  saleAmount: number
  policy: DealPolicy
  managerAffiliateId: string | null
}) {
  const saleAmountMinor = Math.round(input.saleAmount * 100)
  const grossCommissionMinor = computeGrossCommissionMinor(input.policy, saleAmountMinor)
  const managerShareBps = input.managerAffiliateId ? input.policy.managerShareBps : 0
  const managerCommissionMinor = input.managerAffiliateId
    ? Math.round((grossCommissionMinor * managerShareBps) / 10000)
    : 0
  const affiliateCommissionMinor = grossCommissionMinor - managerCommissionMinor
  const grossAffiliateRateBps =
    input.policy.commissionRuleType === 'PERCENTAGE' ? (input.policy.affiliateRateBps ?? 0) : 0
  const affiliateNetBps =
    input.managerAffiliateId && managerShareBps > 0
      ? Math.round((grossAffiliateRateBps * (10000 - managerShareBps)) / 10000)
      : grossAffiliateRateBps
  return {
    saleAmountMinor,
    grossCommissionMinor,
    managerCommissionMinor,
    affiliateCommissionMinor,
    managerShareBps,
    affiliateNetBps,
    grossAffiliateRateBps,
  }
}

export function isWithinEligibilityWindow(opts: {
  eligibilityWindowDays: number | null
  referredAt: Date
  soldAt: Date
}): { ok: boolean; daysSinceReferral: number } {
  const daysSinceReferral = (opts.soldAt.getTime() - opts.referredAt.getTime()) / (24 * 60 * 60 * 1000)
  if (opts.eligibilityWindowDays == null) return { ok: true, daysSinceReferral }
  return { ok: daysSinceReferral <= opts.eligibilityWindowDays, daysSinceReferral }
}
