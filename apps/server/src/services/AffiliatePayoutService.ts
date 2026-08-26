import { db } from '@project/db'
import { dealPolicyFromRow, resolveDealPolicy } from '../lib/affiliateRates'
import { FinanceService } from './FinanceService'

const financeService = new FinanceService()

const CADENCE_INTERVAL_MS: Record<'WEEKLY' | 'MONTHLY', number> = {
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
}

function isDue(cadence: string, lastPayoutAt: Date | null): boolean {
  if (cadence === 'MANUAL') return false
  if (!lastPayoutAt) return true
  const interval = CADENCE_INTERVAL_MS[cadence as 'WEEKLY' | 'MONTHLY']
  return Date.now() - lastPayoutAt.getTime() >= interval
}

export async function runDuePayouts(): Promise<{ processed: number; paidOut: number }> {
  const candidates = await db.affiliate.findMany({
    where: { isActive: true },
    include: { deal: true, class: { include: { defaultDeal: true } } },
  })

  const due = candidates.filter((affiliate) => {
    try {
      const policy = resolveDealPolicy({
        assignedDeal: affiliate.deal ? dealPolicyFromRow(affiliate.deal) : null,
        classDefaultDeal: affiliate.class?.defaultDeal ? dealPolicyFromRow(affiliate.class.defaultDeal) : null,
        overrideRateBps: affiliate.affiliateRateOverrideBps,
        overrideManagerShareBps: affiliate.managerShareOverrideBps,
      })
      return isDue(policy.payoutCadence, affiliate.lastPayoutAt)
    } catch {
      return false
    }
  })

  let paidOut = 0
  for (const affiliate of due) {
    const policy = resolveDealPolicy({
      assignedDeal: affiliate.deal ? dealPolicyFromRow(affiliate.deal) : null,
      classDefaultDeal: affiliate.class?.defaultDeal ? dealPolicyFromRow(affiliate.class.defaultDeal) : null,
      overrideRateBps: affiliate.affiliateRateOverrideBps,
      overrideManagerShareBps: affiliate.managerShareOverrideBps,
    })
    const payeeRef = `affiliate:${affiliate.id}`
    const payable = await db.commission.findMany({
      where: { businessId: affiliate.businessId, payeeRef, status: 'PAYABLE' },
    })
    if (payable.length === 0) continue

    const totalMinor = payable.reduce((sum, c) => sum + c.amountMinor, 0)
    if (policy.payoutThresholdMinor != null && totalMinor < policy.payoutThresholdMinor) continue

    const byCurrency = new Map<string, typeof payable>()
    for (const commission of payable) {
      const group = byCurrency.get(commission.currency) ?? []
      group.push(commission)
      byCurrency.set(commission.currency, group)
    }

    const datePart = new Date().toISOString().slice(0, 10)
    for (const [currency, commissions] of byCurrency) {
      await financeService.createPayout(affiliate.businessId, {
        commissionIds: commissions.map((c) => c.id),
        payeeRef,
        idempotencyKey: `payout:cadence:${affiliate.id}:${currency}:${datePart}`,
      })
    }
    await db.affiliate.update({ where: { id: affiliate.id }, data: { lastPayoutAt: new Date() } })
    paidOut++
  }

  return { processed: due.length, paidOut }
}
