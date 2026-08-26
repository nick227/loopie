import { db } from '@project/db'
import { ensureChartOfAccounts } from '../../lib/finance/accounts'
import { toPaymentDTO, toRefundDTO } from '../../lib/finance/dto'
import { balancedPair, postLedger, replayOnConflict } from '../../lib/finance/ledger'
import { requireIdempotencyKey, requireMoney } from '../../lib/finance/money'
import type { ServicePaymentInput, ServiceRefundInput } from '../../lib/finance/types'
import { reverseTransaction } from './fundingOps'

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
  try {
    const reversal = await reverseTransaction(businessId, {
      transactionId: payment.ledgerTransactionId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
    })
    const refund = await db.refund.create({
      data: {
        businessId,
        paymentId: payment.id,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        ledgerTransactionId: reversal.id,
      },
    })
    return toRefundDTO(refund)
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.refund.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
      })
      return row ? toRefundDTO(row) : null
    })
  }
}
