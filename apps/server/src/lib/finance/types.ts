import type { Prisma } from '@prisma/client'

export type AuditMetadata = Prisma.InputJsonObject

export type FundingInput = {
  amountMinor: number
  currency: string
  idempotencyKey: string
  externalRef?: string
  processor?: string
  metadata?: AuditMetadata
}

export type CreditInput = {
  amountMinor: number
  currency: string
  idempotencyKey: string
  reason?: string
  metadata?: AuditMetadata
}

export type RefundInput = {
  amountMinor: number
  currency: string
  idempotencyKey: string
  paymentId?: string
  reason?: string
  metadata?: AuditMetadata
}

export type ReverseInput = {
  transactionId: string
  idempotencyKey: string
  reason?: string
}

export type AuthorizeBudgetInput = {
  amountMinor: number
  currency: string
  idempotencyKey: string
  metadata?: AuditMetadata
}

export type RecordAdSpendInput = {
  campaignId: string
  amountMinor: number
  currency: string
  platform: 'META' | 'GOOGLE' | 'TIKTOK' | 'LOOPIE'
  externalChargeId: string
  periodStart: string
  periodEnd: string
  idempotencyKey: string
  deploymentId?: string
  adUnitId?: string
  metadata?: AuditMetadata
}

export type SettleAdSpendInput = {
  settledAmountMinor: number
  idempotencyKey: string
}

export type FeeInput = {
  amountMinor: number
  currency: string
  idempotencyKey: string
  campaignId?: string
  description?: string
  metadata?: AuditMetadata
}

export type CreateCommissionInput = {
  amountMinor: number
  currency: string
  payeeRef: string
  idempotencyKey: string
  sourceRef?: string
  metadata?: AuditMetadata
}

export type CreatePayoutInput = {
  commissionIds: string[]
  payeeRef: string
  idempotencyKey: string
  metadata?: AuditMetadata
}

export type ReconcileInput = {
  adSpendId: string
  trackedAmountMinor: number
  platformReportedAmountMinor: number
  settledAmountMinor: number
  idempotencyKey: string
  notes?: string
}

export type ServicePaymentInput = {
  amountMinor: number
  currency: string
  idempotencyKey: string
  externalRef: string
  stripePaymentIntentId?: string | null
  stripeChargeId?: string | null
  metadata?: AuditMetadata
}

export type ServiceRefundInput = {
  paymentId: string
  idempotencyKey: string
  reason?: string
}
