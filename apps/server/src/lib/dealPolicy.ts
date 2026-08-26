import type { CommissionRuleType, PayoutCadence } from './affiliateRates'

type RuleFields = {
  commissionRuleType?: CommissionRuleType
  affiliateRateBps?: number | null
  fixedAmountMinor?: number | null
}

export function validateDealPolicy(
  data: RuleFields,
  existing?: {
    commissionRuleType: string
    affiliateRateBps: number | null
    fixedAmountMinor: number | null
  },
) {
  const ruleType: CommissionRuleType =
    data.commissionRuleType ?? (existing?.commissionRuleType as CommissionRuleType) ?? 'PERCENTAGE'
  const rateBps = data.affiliateRateBps !== undefined ? data.affiliateRateBps : existing?.affiliateRateBps
  const fixedAmount = data.fixedAmountMinor !== undefined ? data.fixedAmountMinor : existing?.fixedAmountMinor
  if (ruleType === 'PERCENTAGE' && (rateBps === null || rateBps === undefined)) {
    throw { statusCode: 400, message: 'affiliateRateBps is required when commissionRuleType is PERCENTAGE' }
  }
  if (ruleType === 'FIXED' && (fixedAmount === null || fixedAmount === undefined)) {
    throw { statusCode: 400, message: 'fixedAmountMinor is required when commissionRuleType is FIXED' }
  }
  return {
    commissionRuleType: ruleType,
    affiliateRateBps: ruleType === 'PERCENTAGE' ? rateBps ?? null : null,
    fixedAmountMinor: ruleType === 'FIXED' ? fixedAmount ?? null : null,
  }
}

export function toDealDTO(deal: {
  id: string
  businessId: string
  classId: string | null
  name: string
  commissionRuleType: string
  affiliateRateBps: number | null
  fixedAmountMinor: number | null
  managerShareBps: number
  eligibilityWindowDays: number | null
  payoutThresholdMinor: number | null
  payoutCadence: string
  isActive: boolean
  createdAt: Date
}) {
  return {
    id: deal.id,
    businessId: deal.businessId,
    classId: deal.classId,
    name: deal.name,
    commissionRuleType: deal.commissionRuleType as CommissionRuleType,
    affiliateRateBps: deal.affiliateRateBps,
    fixedAmountMinor: deal.fixedAmountMinor,
    managerShareBps: deal.managerShareBps,
    eligibilityWindowDays: deal.eligibilityWindowDays,
    payoutThresholdMinor: deal.payoutThresholdMinor,
    payoutCadence: deal.payoutCadence as PayoutCadence,
    isActive: deal.isActive,
    createdAt: deal.createdAt.toISOString(),
  }
}
