import type { AdSpend, AdSpendSettlementStatus, BudgetAuthorization, Commission, Payout, Reconciliation } from '@prisma/client'

export function toBudgetAuthorizationDTO(row: BudgetAuthorization) {
  return {
    id: row.id,
    businessId: row.businessId,
    campaignId: row.campaignId,
    currency: row.currency,
    authorizedAmountMinor: row.authorizedAmountMinor,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    ledgerTransactionId: row.ledgerTransactionId,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toAdSpendDTO(row: AdSpend) {
  return {
    id: row.id,
    businessId: row.businessId,
    campaignId: row.campaignId,
    budgetAuthorizationId: row.budgetAuthorizationId,
    deploymentId: row.deploymentId,
    adUnitId: row.adUnitId,
    platform: row.platform,
    externalChargeId: row.externalChargeId,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    currency: row.currency,
    reportedAmountMinor: row.reportedAmountMinor,
    settledAmountMinor: row.settledAmountMinor,
    settlementStatus: row.settlementStatus as AdSpendSettlementStatus,
    idempotencyKey: row.idempotencyKey,
    ledgerTransactionId: row.ledgerTransactionId,
    settlementTransactionId: row.settlementTransactionId,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toCommissionDTO(row: Commission) {
  return {
    id: row.id,
    businessId: row.businessId,
    payeeRef: row.payeeRef,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    sourceRef: row.sourceRef,
    idempotencyKey: row.idempotencyKey,
    ledgerTransactionId: row.ledgerTransactionId,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toPayoutDTO(row: Payout & { items?: { commissionId: string; amountMinor: number }[] }) {
  return {
    id: row.id,
    businessId: row.businessId,
    payeeRef: row.payeeRef,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    ledgerTransactionId: row.ledgerTransactionId,
    commissionIds: row.items?.map((item) => item.commissionId) ?? [],
    createdAt: row.createdAt.toISOString(),
  }
}

export function toReconciliationDTO(row: Reconciliation) {
  return {
    id: row.id,
    businessId: row.businessId,
    campaignId: row.campaignId,
    adSpendId: row.adSpendId,
    currency: row.currency,
    trackedAmountMinor: row.trackedAmountMinor,
    platformReportedAmountMinor: row.platformReportedAmountMinor,
    settledAmountMinor: row.settledAmountMinor,
    discrepancyMinor: row.discrepancyMinor,
    status: row.status,
    notes: row.notes,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
  }
}
