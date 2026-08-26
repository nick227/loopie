import { db } from '@project/db'
import { ensureChartOfAccounts } from '../../lib/finance/accounts'
import { toPayoutDTO } from '../../lib/finance/dtoEntities'
import { balancedPair, postLedger, replayOnConflict } from '../../lib/finance/ledger'
import { requireIdempotencyKey } from '../../lib/finance/money'
import type { CreatePayoutInput } from '../../lib/finance/types'
import { reverseTransaction } from './fundingOps'

const IN_FLIGHT = ['PENDING', 'TRANSFERRED'] as const

async function payoutById(businessId: string, payoutId: string) {
  const row = await db.payout.findFirst({
    where: { id: payoutId, businessId },
    include: { items: true },
  })
  if (!row) throw { statusCode: 404, message: 'Payout not found' }
  return row
}

export async function findInFlightPayout(businessId: string, payeeRef: string) {
  return db.payout.findFirst({
    where: { businessId, payeeRef, status: { in: [...IN_FLIGHT] } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createConnectPayout(businessId: string, input: CreatePayoutInput) {
  const idempotencyKey = requireIdempotencyKey(input.idempotencyKey)
  const existing = await db.payout.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
    include: { items: true },
  })
  if (existing) return toPayoutDTO(existing)
  const inFlight = await findInFlightPayout(businessId, input.payeeRef)
  if (inFlight) return toPayoutDTO(inFlight)
  try {
    return await db.$transaction(async (tx) => {
      const commissions = await tx.commission.findMany({
        where: { id: { in: input.commissionIds }, businessId },
      })
      if (commissions.length !== input.commissionIds.length) {
        throw { statusCode: 404, message: 'Commission not found' }
      }
      for (const commission of commissions) {
        if (commission.status !== 'PAYABLE')
          throw { statusCode: 409, message: 'Commission is not payable' }
        if (commission.payeeRef !== input.payeeRef)
          throw { statusCode: 409, message: 'Commission payee mismatch' }
      }
      const first = commissions[0]
      if (!first) throw { statusCode: 400, message: 'Payout requires at least one commission' }
      const currency = first.currency
      if (commissions.some((row) => row.currency !== currency)) {
        throw { statusCode: 409, message: 'Payout commissions must share a currency' }
      }
      const taken = await tx.payoutItem.findMany({
        where: { commissionId: { in: commissions.map((row) => row.id) } },
      })
      if (taken.length > 0) throw { statusCode: 409, message: 'Commission already on a payout' }
      const amountMinor = commissions.reduce((sum, row) => sum + row.amountMinor, 0)
      const payout = await tx.payout.create({
        data: {
          businessId,
          payeeRef: input.payeeRef,
          amountMinor,
          currency,
          status: 'PENDING',
          idempotencyKey,
          items: {
            create: commissions.map((row) => ({
              commissionId: row.id,
              amountMinor: row.amountMinor,
            })),
          },
        },
        include: { items: true },
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

export async function attachPayoutTransferRef(
  businessId: string,
  payoutId: string,
  stripeTransferId: string,
) {
  const payout = await payoutById(businessId, payoutId)
  if (payout.stripeTransferId && payout.stripeTransferId !== stripeTransferId) {
    throw { statusCode: 409, message: 'Payout already has a transfer' }
  }
  const row = await db.payout.update({
    where: { id: payout.id },
    data: { stripeTransferId },
    include: { items: true },
  })
  return toPayoutDTO(row)
}

export async function recordPayoutTransferred(
  businessId: string,
  input: { payoutId?: string; stripeTransferId?: string; idempotencyKey: string },
) {
  requireIdempotencyKey(input.idempotencyKey)
  const payout = input.payoutId
    ? await payoutById(businessId, input.payoutId)
    : await db.payout.findFirst({
        where: { businessId, stripeTransferId: input.stripeTransferId ?? '' },
        include: { items: true },
      })
  if (!payout) return null
  if (payout.status === 'TRANSFERRED' || payout.status === 'PAID') return toPayoutDTO(payout)
  if (payout.status !== 'PENDING') return toPayoutDTO(payout)
  try {
    return await db.$transaction(async (tx) => {
      const chart = await ensureChartOfAccounts(tx, businessId, payout.currency)
      const posted = await postLedger(tx, {
        businessId,
        currency: payout.currency,
        type: 'PAYOUT',
        idempotencyKey: input.idempotencyKey,
        externalProvider: 'STRIPE',
        externalRef: input.stripeTransferId ?? payout.stripeTransferId,
        metadata: {
          payoutId: payout.id,
          stripeTransferId: input.stripeTransferId ?? payout.stripeTransferId,
        },
        entries: balancedPair(chart.AFFILIATE_PAYABLE.id, chart.LOOPIE_CASH.id, payout.amountMinor),
      })
      const row = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'TRANSFERRED',
          ledgerTransactionId: posted.id,
          ...(input.stripeTransferId ? { stripeTransferId: input.stripeTransferId } : {}),
        },
        include: { items: true },
      })
      await tx.commission.updateMany({
        where: { id: { in: row.items.map((item) => item.commissionId) } },
        data: { status: 'PAID' },
      })
      return toPayoutDTO(row)
    })
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.payout.findFirst({
        where: { id: payout.id, businessId },
        include: { items: true },
      })
      return row ? toPayoutDTO(row) : null
    })
  }
}

export async function recordPayoutPaid(
  businessId: string,
  input: { payoutId?: string; payeeRef?: string; stripePayoutId: string },
) {
  const payout = input.payoutId
    ? await payoutById(businessId, input.payoutId)
    : await db.payout.findFirst({
        where: { businessId, payeeRef: input.payeeRef, status: 'TRANSFERRED' },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      })
  if (!payout) return null
  if (payout.status === 'PAID') return toPayoutDTO(payout)
  if (payout.status !== 'TRANSFERRED') return toPayoutDTO(payout)
  const row = await db.payout.update({
    where: { id: payout.id },
    data: { status: 'PAID', stripePayoutId: input.stripePayoutId },
    include: { items: true },
  })
  return toPayoutDTO(row)
}

export async function failConnectPayout(
  businessId: string,
  input: {
    payoutId?: string
    stripeTransferId?: string
    payeeRef?: string
    outcome: 'FAILED' | 'REVERSED'
    idempotencyKey: string
  },
) {
  requireIdempotencyKey(input.idempotencyKey)
  const payout = input.payoutId
    ? await payoutById(businessId, input.payoutId)
    : input.stripeTransferId
      ? await db.payout.findFirst({
          where: { businessId, stripeTransferId: input.stripeTransferId },
          include: { items: true },
        })
      : await db.payout.findFirst({
          where: { businessId, payeeRef: input.payeeRef, status: { in: [...IN_FLIGHT] } },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        })
  if (!payout) return null
  if (payout.status === 'FAILED' || payout.status === 'REVERSED') return toPayoutDTO(payout)
  if (payout.status === 'TRANSFERRED' || payout.status === 'PAID') {
    if (!payout.ledgerTransactionId)
      throw { statusCode: 409, message: 'Payout has no posted transaction to reverse' }
    await reverseTransaction(businessId, {
      transactionId: payout.ledgerTransactionId,
      idempotencyKey: input.idempotencyKey,
      reason: `connect.payout.${input.outcome.toLowerCase()}`,
    })
    await db.commission.updateMany({
      where: { id: { in: payout.items.map((item) => item.commissionId) } },
      data: { status: 'PAYABLE' },
    })
  }
  const row = await db.payout.update({
    where: { id: payout.id },
    data: { status: input.outcome },
    include: { items: true },
  })
  return toPayoutDTO(row)
}
