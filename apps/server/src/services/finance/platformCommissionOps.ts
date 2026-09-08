import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { ensureChartOfAccounts } from '../../lib/finance/accounts'
import { HOUSE_BUSINESS_SLUG, getOrCreateHouseBusinessId } from '../../lib/finance/houseLedger'
import { balancedPair, postLedger, replayOnConflict } from '../../lib/finance/ledger'
import { requireIdempotencyKey } from '../../lib/finance/money'
import { reverseTransactionInTx } from './fundingOps'

// PlatformAffiliateEarning/PlatformAffiliatePayout have no ledgerTransactionId column (no schema
// change for this pass) — the posted LedgerTransaction for a given earning/payout is found again
// by a stable externalRef instead, the same plain-string cross-reference pattern already used
// elsewhere in this module (see servicePaymentOps.ts's `externalRef: input.externalRef`).
function payoutSettleRef(payoutId: string) {
  return `platform-payout:settle:${payoutId}`
}

async function findLedgerTx(tx: Prisma.TransactionClient, businessId: string, externalRef: string) {
  return tx.ledgerTransaction.findFirst({ where: { businessId, externalRef } })
}

/**
 * Promote one PENDING PlatformAffiliateEarning to PAYABLE, posting the real house-ledger
 * liability (mirrors payoutOps.markCommissionPayable, scoped to the house business instead of a
 * client's). Idempotent per idempotencyKey; a retry against an already-PAYABLE/PAID earning is a
 * no-op — this is called from a poller (see worker.ts) that may re-scan the same row before its
 * own write lands. A non-positive amount means the earning was fully refunded/disputed before
 * ever clearing (see CommissionEngine.reverseMembershipPayment) — settle it straight to REVERSED
 * with no ledger call, rather than posting a zero/negative entry.
 */
export async function promotePlatformEarningPayable(earningId: string, idempotencyKey: string) {
  requireIdempotencyKey(idempotencyKey)
  const earning = await db.platformAffiliateEarning.findUnique({ where: { id: earningId } })
  if (!earning) throw { statusCode: 404, message: 'Earning not found' }
  if (earning.status !== 'PENDING') return earning
  if (earning.amountMinor <= 0) {
    return db.platformAffiliateEarning.update({
      where: { id: earningId },
      data: { status: 'REVERSED' },
    })
  }
  try {
    return await db.$transaction(async (tx) => {
      const houseBusinessId = await getOrCreateHouseBusinessId(tx)
      const existing = await tx.ledgerTransaction.findUnique({
        where: { businessId_idempotencyKey: { businessId: houseBusinessId, idempotencyKey } },
      })
      if (existing) {
        const current = await tx.platformAffiliateEarning.findUnique({ where: { id: earningId } })
        return current ?? earning
      }
      const chart = await ensureChartOfAccounts(tx, houseBusinessId, 'USD')
      await postLedger(tx, {
        businessId: houseBusinessId,
        currency: 'USD',
        type: 'COMMISSION',
        idempotencyKey,
        externalRef: `platform-earning:payable:${earningId}`,
        metadata: { earningId, beneficiaryAffiliateId: earning.beneficiaryAffiliateId },
        entries: balancedPair(
          chart.LOOPIE_REVENUE.id,
          chart.AFFILIATE_PAYABLE.id,
          earning.amountMinor,
        ),
      })
      return tx.platformAffiliateEarning.update({
        where: { id: earningId },
        data: { status: 'PAYABLE' },
      })
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.platformAffiliateEarning.findUnique({ where: { id: earningId } })
      return row ?? null
    })
  }
}

/**
 * Reduce or restore the house-ledger liability for one earning that was already promoted to
 * PAYABLE/PAID — the ledger half of CommissionEngine.reverseMembershipPayment, called with the
 * caller's own transaction so the ledger post and the earning-row bookkeeping commit together.
 * 'REDUCE' is a refund/chargeback (debit AFFILIATE_PAYABLE, credit LOOPIE_REVENUE — the mirror
 * image of the original promotion); 'RESTORE' is a won dispute undoing an earlier REDUCE (same
 * shape as the original promotion, re-applied). A still-PENDING earning never reaches this —
 * nothing was posted for it yet, so CommissionEngine adjusts its amount directly with no ledger
 * call at all.
 */
export async function adjustPlatformEarningLedgerInTx(
  tx: Prisma.TransactionClient,
  params: {
    originalEarningId: string
    amountMinor: number
    direction: 'REDUCE' | 'RESTORE'
    idempotencyKey: string
    reason?: string
  },
) {
  const { originalEarningId, amountMinor, direction, reason } = params
  const idempotencyKey = requireIdempotencyKey(params.idempotencyKey)
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw { statusCode: 400, message: 'amountMinor must be a positive integer' }
  }
  const houseBusinessId = await getOrCreateHouseBusinessId(tx)
  const existing = await tx.ledgerTransaction.findUnique({
    where: { businessId_idempotencyKey: { businessId: houseBusinessId, idempotencyKey } },
  })
  if (existing) return existing
  const chart = await ensureChartOfAccounts(tx, houseBusinessId, 'USD')
  const pair =
    direction === 'REDUCE'
      ? balancedPair(chart.AFFILIATE_PAYABLE.id, chart.LOOPIE_REVENUE.id, amountMinor)
      : balancedPair(chart.LOOPIE_REVENUE.id, chart.AFFILIATE_PAYABLE.id, amountMinor)
  return postLedger(tx, {
    businessId: houseBusinessId,
    currency: 'USD',
    type: direction === 'REDUCE' ? 'REVERSAL' : 'ADJUSTMENT',
    idempotencyKey,
    externalRef: `platform-earning:${direction.toLowerCase()}:${originalEarningId}:${idempotencyKey}`,
    metadata: { originalEarningId, reason: reason ?? null },
    entries: pair,
  })
}

export async function adjustPlatformEarningLedger(params: {
  originalEarningId: string
  amountMinor: number
  direction: 'REDUCE' | 'RESTORE'
  idempotencyKey: string
  reason?: string
}) {
  try {
    return await db.$transaction((tx) => adjustPlatformEarningLedgerInTx(tx, params))
  } catch (err) {
    return replayOnConflict(err, async () => {
      const houseBusiness = await db.business.findUnique({ where: { slug: HOUSE_BUSINESS_SLUG } })
      if (!houseBusiness) return null
      return db.ledgerTransaction.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId: houseBusiness.id,
            idempotencyKey: params.idempotencyKey,
          },
        },
      })
    })
  }
}

/**
 * Settle a PENDING PlatformAffiliatePayout: posts the real cash-out (AFFILIATE_PAYABLE ->
 * LOOPIE_CASH) and flips the payout + its earnings to PAID. Idempotent: already-PAID is a
 * no-op replay; anything else is an illegal transition.
 */
export async function settlePlatformPayout(payoutId: string, idempotencyKey: string) {
  requireIdempotencyKey(idempotencyKey)
  const payout = await db.platformAffiliatePayout.findUnique({
    where: { id: payoutId },
    include: { earnings: true },
  })
  if (!payout) throw { statusCode: 404, message: 'Payout not found' }
  if (payout.status === 'PAID') return payout
  if (payout.status !== 'PENDING') {
    throw { statusCode: 409, message: `Cannot settle a payout in status ${payout.status}` }
  }
  try {
    return await db.$transaction(async (tx) => {
      const houseBusinessId = await getOrCreateHouseBusinessId(tx)
      const existing = await tx.ledgerTransaction.findUnique({
        where: { businessId_idempotencyKey: { businessId: houseBusinessId, idempotencyKey } },
      })
      if (!existing) {
        const chart = await ensureChartOfAccounts(tx, houseBusinessId, payout.currency)
        await postLedger(tx, {
          businessId: houseBusinessId,
          currency: payout.currency,
          type: 'PAYOUT',
          idempotencyKey,
          externalRef: payoutSettleRef(payoutId),
          metadata: { payoutId, affiliateId: payout.affiliateId },
          entries: balancedPair(
            chart.AFFILIATE_PAYABLE.id,
            chart.LOOPIE_CASH.id,
            payout.totalAmountMinor,
          ),
        })
      }
      const updated = await tx.platformAffiliatePayout.update({
        where: { id: payoutId },
        data: { status: 'PAID' },
      })
      await tx.platformAffiliateEarning.updateMany({
        where: { payoutId },
        data: { status: 'PAID' },
      })
      return updated
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.platformAffiliatePayout.findUnique({ where: { id: payoutId } })
      return row ?? null
    })
  }
}

/**
 * Move a PlatformAffiliatePayout off its current in-flight/settled state:
 * PENDING -> FAILED (the batch never got a real external transfer; nothing was posted to the
 * ledger yet, so this just releases the earnings back to PAYABLE for a future batch), or
 * PAID -> REVERSED (the external transfer was reversed after the fact; reverses the settlement
 * posting and releases the earnings back to PAYABLE). Any other starting state is an illegal
 * transition. Idempotent: already in the target state is a no-op replay.
 */
export async function failPlatformPayout(
  payoutId: string,
  idempotencyKey: string,
  outcome: 'FAILED' | 'REVERSED',
  reason?: string,
) {
  requireIdempotencyKey(idempotencyKey)
  const payout = await db.platformAffiliatePayout.findUnique({
    where: { id: payoutId },
    include: { earnings: true },
  })
  if (!payout) throw { statusCode: 404, message: 'Payout not found' }
  if (payout.status === outcome) return payout
  if (outcome === 'FAILED' && payout.status !== 'PENDING') {
    throw { statusCode: 409, message: `Cannot fail a payout in status ${payout.status}` }
  }
  if (outcome === 'REVERSED' && payout.status !== 'PAID') {
    throw { statusCode: 409, message: `Cannot reverse a payout in status ${payout.status}` }
  }
  try {
    return await db.$transaction(async (tx) => {
      if (outcome === 'REVERSED') {
        const houseBusinessId = await getOrCreateHouseBusinessId(tx)
        const original = await findLedgerTx(tx, houseBusinessId, payoutSettleRef(payoutId))
        if (!original) {
          throw { statusCode: 409, message: 'Payout has no posted settlement to reverse' }
        }
        const existingReversal = await tx.ledgerTransaction.findUnique({
          where: { businessId_idempotencyKey: { businessId: houseBusinessId, idempotencyKey } },
        })
        if (!existingReversal) {
          await reverseTransactionInTx(tx, houseBusinessId, {
            transactionId: original.id,
            idempotencyKey,
            reason: reason ?? 'platform_payout.reversed',
          })
        }
      }
      const updated = await tx.platformAffiliatePayout.update({
        where: { id: payoutId },
        data: { status: outcome },
      })
      await tx.platformAffiliateEarning.updateMany({
        where: { id: { in: payout.earnings.map((e) => e.id) } },
        data: { status: 'PAYABLE', payoutId: null },
      })
      return updated
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.platformAffiliatePayout.findUnique({ where: { id: payoutId } })
      return row ?? null
    })
  }
}
