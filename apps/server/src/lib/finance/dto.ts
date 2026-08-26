import type { LedgerDirection, LedgerTransactionType } from '@prisma/client'

export function toTransactionDTO(row: {
  id: string
  businessId: string
  currency: string
  type: LedgerTransactionType
  status: string
  idempotencyKey: string
  externalRef: string | null
  metadata: unknown
  reversesTransactionId: string | null
  postedAt: Date
  createdAt: Date
  entries?: {
    id: string
    accountId: string
    campaignId: string | null
    direction: LedgerDirection
    amountMinor: number
    currency: string
  }[]
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    currency: row.currency,
    type: row.type,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    externalRef: row.externalRef,
    metadata: row.metadata,
    reversesTransactionId: row.reversesTransactionId,
    postedAt: row.postedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    entries: (row.entries ?? []).map((entry) => ({
      id: entry.id,
      accountId: entry.accountId,
      campaignId: entry.campaignId,
      direction: entry.direction,
      amountMinor: entry.amountMinor,
      currency: entry.currency,
    })),
  }
}

export function toPaymentDTO(row: {
  id: string
  businessId: string
  amountMinor: number
  currency: string
  status: string
  processor: string | null
  externalRef: string | null
  idempotencyKey: string
  ledgerTransactionId: string
  createdAt: Date
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    processor: row.processor,
    externalRef: row.externalRef,
    idempotencyKey: row.idempotencyKey,
    ledgerTransactionId: row.ledgerTransactionId,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toRefundDTO(row: {
  id: string
  businessId: string
  paymentId: string | null
  amountMinor: number
  currency: string
  status: string
  reason: string | null
  idempotencyKey: string
  ledgerTransactionId: string
  createdAt: Date
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    paymentId: row.paymentId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    reason: row.reason,
    idempotencyKey: row.idempotencyKey,
    ledgerTransactionId: row.ledgerTransactionId,
    createdAt: row.createdAt.toISOString(),
  }
}
