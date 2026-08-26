import { db } from '@project/db'
import { ensureChartOfAccounts } from '../../lib/finance/accounts'
import { toCommissionDTO, toPayoutDTO } from '../../lib/finance/dtoEntities'
import { balancedPair, postLedger, replayOnConflict } from '../../lib/finance/ledger'
import { requireIdempotencyKey, requireMoney } from '../../lib/finance/money'
import type { CreateCommissionInput, CreatePayoutInput } from '../../lib/finance/types'
import { reverseTransaction } from './fundingOps'

export async function createCommission(businessId: string, input: CreateCommissionInput) {
  const { amountMinor, currency, idempotencyKey } = requireMoney(input)
  const existing = await db.commission.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
  })
  if (existing) return toCommissionDTO(existing)
  try {
    const commission = await db.commission.create({
      data: {
        businessId,
        payeeRef: input.payeeRef,
        amountMinor,
        currency,
        sourceRef: input.sourceRef,
        idempotencyKey,
      },
    })
    return toCommissionDTO(commission)
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.commission.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
      })
      return row ? toCommissionDTO(row) : null
    })
  }
}

export async function markCommissionPayable(businessId: string, commissionId: string, idempotencyKey: string) {
  requireIdempotencyKey(idempotencyKey)
  const existing = await db.ledgerTransaction.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
  })
  if (existing) {
    const commission = await db.commission.findFirst({ where: { id: commissionId, businessId } })
    if (!commission) throw { statusCode: 404, message: 'Commission not found' }
    return toCommissionDTO(commission)
  }
  try {
    return await db.$transaction(async (tx) => {
      const commission = await tx.commission.findFirst({ where: { id: commissionId, businessId } })
      if (!commission) throw { statusCode: 404, message: 'Commission not found' }
      if (commission.status !== 'PENDING') {
        throw { statusCode: 409, message: 'Only pending commissions can become payable' }
      }
      const chart = await ensureChartOfAccounts(tx, businessId, commission.currency)
      const posted = await postLedger(tx, {
        businessId,
        currency: commission.currency,
        type: 'COMMISSION',
        idempotencyKey,
        metadata: { commissionId, payeeRef: commission.payeeRef },
        entries: balancedPair(chart.LOOPIE_REVENUE.id, chart.AFFILIATE_PAYABLE.id, commission.amountMinor),
      })
      const updated = await tx.commission.update({
        where: { id: commission.id },
        data: { status: 'PAYABLE', ledgerTransactionId: posted.id },
      })
      return toCommissionDTO(updated)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.commission.findFirst({ where: { id: commissionId, businessId } })
      return row ? toCommissionDTO(row) : null
    })
  }
}

export async function cancelCommission(businessId: string, commissionId: string) {
  const commission = await db.commission.findFirst({ where: { id: commissionId, businessId } })
  if (!commission) throw { statusCode: 404, message: 'Commission not found' }
  if (commission.status === 'CANCELLED') return toCommissionDTO(commission)
  if (commission.status !== 'PENDING') {
    throw { statusCode: 409, message: 'Only pending commissions can be cancelled; reverse posted ones instead' }
  }
  const updated = await db.commission.update({
    where: { id: commission.id },
    data: { status: 'CANCELLED' },
  })
  return toCommissionDTO(updated)
}

// The one new function in the finance module for the affiliate-policy pass — added here, not
// called from outside FinanceService, because "all money owed/paid flows through FinanceService"
// means a Commission's status can't be mutated from anywhere else either. PENDING has no posted
// ledger transaction yet, so it's the same as cancelCommission. PAYABLE/PAID already posted one
// (COMMISSION or PAYOUT), so this reuses the existing generic reverseTransaction — a commission-
// specific wrapper isn't needed there since reverseTransaction doesn't know or care what kind of
// transaction it's reversing — and then marks the commission REVERSED, a step reverseTransaction
// itself deliberately doesn't take.
export async function reverseCommission(businessId: string, commissionId: string, idempotencyKey: string, reason?: string) {
  requireIdempotencyKey(idempotencyKey)
  const commission = await db.commission.findFirst({ where: { id: commissionId, businessId } })
  if (!commission) throw { statusCode: 404, message: 'Commission not found' }
  if (commission.status === 'CANCELLED' || commission.status === 'REVERSED') {
    return toCommissionDTO(commission)
  }
  if (commission.status === 'PENDING') {
    const updated = await db.commission.update({ where: { id: commission.id }, data: { status: 'CANCELLED' } })
    return toCommissionDTO(updated)
  }
  if (!commission.ledgerTransactionId) {
    throw { statusCode: 409, message: 'Commission has no posted transaction to reverse' }
  }
  await reverseTransaction(businessId, { transactionId: commission.ledgerTransactionId, idempotencyKey, reason })
  const updated = await db.commission.update({ where: { id: commission.id }, data: { status: 'REVERSED' } })
  return toCommissionDTO(updated)
}

export async function createPayout(businessId: string, input: CreatePayoutInput) {
  const idempotencyKey = requireIdempotencyKey(input.idempotencyKey)
  const existing = await db.payout.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
    include: { items: true },
  })
  if (existing) return toPayoutDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      const commissions = await tx.commission.findMany({
        where: { id: { in: input.commissionIds }, businessId },
      })
      if (commissions.length !== input.commissionIds.length) {
        throw { statusCode: 404, message: 'Commission not found' }
      }
      for (const commission of commissions) {
        if (commission.status !== 'PAYABLE') throw { statusCode: 409, message: 'Commission is not payable' }
        if (commission.payeeRef !== input.payeeRef) throw { statusCode: 409, message: 'Commission payee mismatch' }
      }
      const first = commissions[0]
      if (!first) throw { statusCode: 400, message: 'Payout requires at least one commission' }
      const currency = first.currency
      if (commissions.some((row) => row.currency !== currency)) {
        throw { statusCode: 409, message: 'Payout commissions must share a currency' }
      }
      const amountMinor = commissions.reduce((sum, row) => sum + row.amountMinor, 0)
      const chart = await ensureChartOfAccounts(tx, businessId, currency)
      const posted = await postLedger(tx, {
        businessId,
        currency,
        type: 'PAYOUT',
        idempotencyKey,
        metadata: input.metadata,
        entries: balancedPair(chart.AFFILIATE_PAYABLE.id, chart.LOOPIE_CASH.id, amountMinor),
      })
      // Manual payouts post cash immediately and land on PAID. Connect payouts (next slice)
      // will create PENDING, move to TRANSFERRED when the Transfer hits the connected
      // account, and PAID only when Stripe reports the bank payout — those are not the same event.
      const payout = await tx.payout.create({
        data: {
          businessId,
          payeeRef: input.payeeRef,
          amountMinor,
          currency,
          idempotencyKey,
          ledgerTransactionId: posted.id,
          items: {
            create: commissions.map((row) => ({ commissionId: row.id, amountMinor: row.amountMinor })),
          },
        },
        include: { items: true },
      })
      await tx.commission.updateMany({
        where: { id: { in: commissions.map((row) => row.id) } },
        data: { status: 'PAID' },
      })
      return toPayoutDTO(payout)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.payout.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
        include: { items: true },
      })
      return row ? toPayoutDTO(row) : null
    })
  }
}
