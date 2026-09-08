import { db } from '@project/db'
import { ensureChartOfAccounts } from '../../lib/finance/accounts'
import { toPaymentDTO, toRefundDTO } from '../../lib/finance/dto'
import { balancedPair, postLedger, replayOnConflict } from '../../lib/finance/ledger'
import { requireIdempotencyKey, requireMoney } from '../../lib/finance/money'
import type { ServicePaymentInput, ServiceRefundInput } from '../../lib/finance/types'
import { reverseTransactionInTx } from './fundingOps'

export async function recordServicePayment(businessId: string, input: ServicePaymentInput) {
  const { amountMinor, currency, idempotencyKey } = requireMoney(input)
  requireIdempotencyKey(input.externalRef)
  const byEvent = await db.payment.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
  })
  if (byEvent) return toPaymentDTO(byEvent)
  const byInvoice = await db.payment.findUnique({
    where: { businessId_externalRef: { businessId, externalRef: input.externalRef } },
  })
  if (byInvoice) return toPaymentDTO(byInvoice)
  try {
    return await db.$transaction(async (tx) => {
      const chart = await ensureChartOfAccounts(tx, businessId, currency)
      const posted = await postLedger(tx, {
        businessId,
        currency,
        type: 'SERVICE_PAYMENT',
        idempotencyKey,
        externalRef: input.externalRef,
        externalProvider: 'STRIPE',
        metadata: input.metadata,
        entries: balancedPair(chart.PROCESSOR_CLEARING.id, chart.LOOPIE_REVENUE.id, amountMinor),
      })
      const payment = await tx.payment.create({
        data: {
          businessId,
          amountMinor,
          currency,
          processor: 'STRIPE',
          externalRef: input.externalRef,
          stripePaymentIntentId: input.stripePaymentIntentId ?? null,
          stripeChargeId: input.stripeChargeId ?? null,
          idempotencyKey,
          ledgerTransactionId: posted.id,
          metadata: input.metadata,
        },
      })
      return toPaymentDTO(payment)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row =
        (await db.payment.findUnique({
          where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
        })) ??
        (await db.payment.findUnique({
          where: { businessId_externalRef: { businessId, externalRef: input.externalRef } },
        }))
      return row ? toPaymentDTO(row) : null
    })
  }
}

export async function refundServicePayment(businessId: string, input: ServiceRefundInput) {
  requireIdempotencyKey(input.idempotencyKey)
  const existing = await db.refund.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
  })
  if (existing) return toRefundDTO(existing)
  const payment = await db.payment.findFirst({ where: { id: input.paymentId, businessId } })
  if (!payment) throw { statusCode: 404, message: 'Payment not found' }
  const amountMinor = input.amountMinor ?? payment.amountMinor
  if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > payment.amountMinor) {
    throw { statusCode: 400, message: 'Invalid refund amount' }
  }
  const isFullRefund = amountMinor === payment.amountMinor
  try {
    return await db.$transaction(async (tx) => {
      // A one-shot full refund keeps reusing reverseTransactionInTx exactly as before — including
      // its `reversesTransactionId` unique-FK guard against a second full-refund attempt on the
      // same payment. A partial amount (this payment's own amountMinor still exceeds it) can't go
      // through that path: reversesTransactionId is @unique, so only one reversal could ever link
      // back to the original SERVICE_PAYMENT transaction, but multiple partial-refund events (or a
      // partial followed later by the remaining balance) each need their own. Those post a
      // same-shape but smaller REFUND transaction directly, linked back via metadata instead of
      // the FK — reverseTransactionInTx's own contract and every other caller are untouched.
      let ledgerTransactionId: string
      if (isFullRefund) {
        const reversal = await reverseTransactionInTx(tx, businessId, {
          transactionId: payment.ledgerTransactionId,
          idempotencyKey: input.idempotencyKey,
          reason: input.reason,
        })
        ledgerTransactionId = reversal.id
      } else {
        const chart = await ensureChartOfAccounts(tx, businessId, payment.currency)
        const posted = await postLedger(tx, {
          businessId,
          currency: payment.currency,
          type: 'REFUND',
          idempotencyKey: input.idempotencyKey,
          metadata: {
            reason: input.reason ?? null,
            paymentId: payment.id,
            partialReversalOf: payment.ledgerTransactionId,
          },
          entries: balancedPair(chart.LOOPIE_REVENUE.id, chart.PROCESSOR_CLEARING.id, amountMinor),
        })
        ledgerTransactionId = posted.id
      }
      const refund = await tx.refund.create({
        data: {
          businessId,
          paymentId: payment.id,
          amountMinor,
          currency: payment.currency,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey,
          ledgerTransactionId,
        },
      })
      return toRefundDTO(refund)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.refund.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
      })
      return row ? toRefundDTO(row) : null
    })
  }
}
