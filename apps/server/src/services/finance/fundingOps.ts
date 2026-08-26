import { db } from '@project/db'
import { ensureChartOfAccounts } from '../../lib/finance/accounts'
import { toPaymentDTO, toRefundDTO, toTransactionDTO } from '../../lib/finance/dto'
import { accountBalanceMinor, balancedPair, invertEntries, postLedger, replayOnConflict } from '../../lib/finance/ledger'
import { requireMoney } from '../../lib/finance/money'
import type { CreditInput, FundingInput, RefundInput, ReverseInput } from '../../lib/finance/types'

export async function recordClientFunding(businessId: string, input: FundingInput) {
  const { amountMinor, currency, idempotencyKey } = requireMoney(input)
  const existing = await db.payment.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
  })
  if (existing) return toPaymentDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      const chart = await ensureChartOfAccounts(tx, businessId, currency)
      const posted = await postLedger(tx, {
        businessId,
        currency,
        type: 'CLIENT_FUNDING',
        idempotencyKey,
        externalRef: input.externalRef ?? null,
        metadata: input.metadata,
        entries: balancedPair(chart.LOOPIE_CASH.id, chart.CLIENT_AD_FUNDS.id, amountMinor),
      })
      const payment = await tx.payment.create({
        data: {
          businessId,
          amountMinor,
          currency,
          processor: input.processor,
          externalRef: input.externalRef,
          idempotencyKey,
          ledgerTransactionId: posted.id,
          metadata: input.metadata,
        },
      })
      return toPaymentDTO(payment)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.payment.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
      })
      return row ? toPaymentDTO(row) : null
    })
  }
}

export async function applyCredit(businessId: string, input: CreditInput) {
  const { amountMinor, currency, idempotencyKey } = requireMoney(input)
  const existing = await db.ledgerTransaction.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
    include: { entries: true },
  })
  if (existing) return toTransactionDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      const chart = await ensureChartOfAccounts(tx, businessId, currency)
      const posted = await postLedger(tx, {
        businessId,
        currency,
        type: 'CREDIT',
        idempotencyKey,
        metadata: { reason: input.reason ?? null, ...input.metadata },
        entries: balancedPair(chart.REFUNDS_CREDITS.id, chart.CLIENT_AD_FUNDS.id, amountMinor),
      })
      return toTransactionDTO(posted)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.ledgerTransaction.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
        include: { entries: true },
      })
      return row ? toTransactionDTO(row) : null
    })
  }
}

export async function issueRefund(businessId: string, input: RefundInput) {
  const { amountMinor, currency, idempotencyKey } = requireMoney(input)
  const existing = await db.refund.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
  })
  if (existing) return toRefundDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      if (input.paymentId) {
        const payment = await tx.payment.findFirst({ where: { id: input.paymentId, businessId } })
        if (!payment) throw { statusCode: 404, message: 'Payment not found' }
        if (payment.currency !== currency) throw { statusCode: 409, message: 'Refund currency must match the payment' }
      }
      const chart = await ensureChartOfAccounts(tx, businessId, currency)
      const available = await accountBalanceMinor(tx, businessId, chart.CLIENT_AD_FUNDS.id)
      if (available < amountMinor) throw { statusCode: 409, message: 'Insufficient client funds to refund' }
      const posted = await postLedger(tx, {
        businessId,
        currency,
        type: 'REFUND',
        idempotencyKey,
        metadata: { reason: input.reason ?? null, paymentId: input.paymentId ?? null, ...input.metadata },
        entries: balancedPair(chart.CLIENT_AD_FUNDS.id, chart.LOOPIE_CASH.id, amountMinor),
      })
      const refund = await tx.refund.create({
        data: {
          businessId,
          paymentId: input.paymentId,
          amountMinor,
          currency,
          reason: input.reason,
          idempotencyKey,
          ledgerTransactionId: posted.id,
        },
      })
      if (input.paymentId) {
        const payment = await tx.payment.findFirst({ where: { id: input.paymentId, businessId } })
        if (payment && payment.amountMinor === amountMinor) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
        }
      }
      return toRefundDTO(refund)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.refund.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
      })
      return row ? toRefundDTO(row) : null
    })
  }
}

export async function reverseTransaction(businessId: string, input: ReverseInput) {
  const existing = await db.ledgerTransaction.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
    include: { entries: true },
  })
  if (existing) return toTransactionDTO(existing)
  try {
    return await db.$transaction(async (tx) => {
      const original = await tx.ledgerTransaction.findFirst({
        where: { id: input.transactionId, businessId },
        include: { entries: true, reversedBy: true },
      })
      if (!original) throw { statusCode: 404, message: 'Transaction not found' }
      if (original.reversedBy) throw { statusCode: 409, message: 'Transaction already reversed' }
      const posted = await postLedger(tx, {
        businessId,
        currency: original.currency,
        type: 'REVERSAL',
        idempotencyKey: input.idempotencyKey,
        reversesTransactionId: original.id,
        metadata: { reason: input.reason ?? null, reverses: original.id },
        campaignId: original.entries.find((entry) => entry.campaignId)?.campaignId,
        entries: invertEntries(original.entries),
      })
      return toTransactionDTO(posted)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.ledgerTransaction.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
        include: { entries: true },
      })
      return row ? toTransactionDTO(row) : null
    })
  }
}
