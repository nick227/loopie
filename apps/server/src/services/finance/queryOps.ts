import { db } from '@project/db'
import { ensureChartOfAccounts, isDebitNormal } from '../../lib/finance/accounts'
import { toReconciliationDTO } from '../../lib/finance/dtoEntities'
import { toTransactionDTO } from '../../lib/finance/dto'
import { replayOnConflict } from '../../lib/finance/ledger'
import { decodeCursor, encodeCursor, normalizeLimit } from '../../lib/pagination'
import { requireIdempotencyKey } from '../../lib/finance/money'
import type { ReconcileInput } from '../../lib/finance/types'

export async function listAccounts(businessId: string, currency: string) {
  await db.$transaction((tx) => ensureChartOfAccounts(tx, businessId, currency))
  const accounts = await db.financialAccount.findMany({
    where: { businessId, currency },
    orderBy: { kind: 'asc' },
  })
  const grouped = await db.ledgerEntry.groupBy({
    by: ['accountId', 'direction'],
    where: { businessId, currency },
    _sum: { amountMinor: true },
  })
  const sums = new Map<string, { debit: number; credit: number }>()
  for (const row of grouped) {
    const current = sums.get(row.accountId) ?? { debit: 0, credit: 0 }
    if (row.direction === 'DEBIT') current.debit += row._sum.amountMinor ?? 0
    else current.credit += row._sum.amountMinor ?? 0
    sums.set(row.accountId, current)
  }
  const data = accounts.map((account) => {
    const { debit, credit } = sums.get(account.id) ?? { debit: 0, credit: 0 }
    const balanceMinor = isDebitNormal(account.kind) ? debit - credit : credit - debit
    return {
      id: account.id,
      businessId: account.businessId,
      kind: account.kind,
      currency: account.currency,
      name: account.name,
      balanceMinor,
    }
  })
  return { data }
}

export async function listTransactions(
  businessId: string,
  opts: { cursor?: string; limit?: number },
) {
  const limit = normalizeLimit(opts.limit)
  const cursor = decodeCursor(opts.cursor)
  const AND = cursor
    ? [
        {
          OR: [
            { postedAt: { lt: new Date(cursor.createdAt) } },
            { postedAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
          ],
        },
      ]
    : []
  const rows = await db.ledgerTransaction.findMany({
    where: { businessId, ...(AND.length ? { AND } : {}) },
    orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    include: { entries: true },
  })
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.postedAt.toISOString(), id: last.id }) : null
  return { data: items.map(toTransactionDTO), meta: { hasMore, nextCursor } }
}

export async function getTransaction(businessId: string, transactionId: string) {
  const row = await db.ledgerTransaction.findFirst({
    where: { id: transactionId, businessId },
    include: { entries: true },
  })
  if (!row) throw { statusCode: 404, message: 'Transaction not found' }
  return toTransactionDTO(row)
}

// Restored alongside getAdRunFunding below rather than replaced by it — every existing
// BudgetAuthorization/AdSpend row in this app is campaignId-scoped (see CLAUDE.md's
// Media/Advertisement/AdRun migration audit), so CampaignService.funding still needs this.
export async function getCampaignFunding(businessId: string, campaignId: string) {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId, businessId } })
  if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }
  const authorization = await db.budgetAuthorization.findFirst({
    where: { campaignId, businessId, status: 'ACTIVE' },
  })
  const currency = authorization?.currency ?? 'USD'
  const accounts = await listAccounts(businessId, currency)
  const byKind = Object.fromEntries(accounts.data.map((row) => [row.kind, row.balanceMinor]))
  const reservedEntries = await db.ledgerEntry.groupBy({
    by: ['direction'],
    where: {
      businessId,
      campaignId,
      account: { kind: 'CLIENT_FUNDS_RESERVED' },
    },
    _sum: { amountMinor: true },
  })
  const reservedDebit =
    reservedEntries.find((row) => row.direction === 'DEBIT')?._sum.amountMinor ?? 0
  const reservedCredit =
    reservedEntries.find((row) => row.direction === 'CREDIT')?._sum.amountMinor ?? 0
  const reservedAmountMinor = reservedCredit - reservedDebit
  const spendRows = await db.adSpend.findMany({ where: { businessId, campaignId } })
  const platformReportedAmountMinor = spendRows.reduce(
    (sum, row) => sum + row.reportedAmountMinor,
    0,
  )
  const settledAmountMinor = spendRows.reduce((sum, row) => sum + row.settledAmountMinor, 0)
  return {
    campaignId,
    currency,
    planningBudget: Number(campaign.budget),
    authorizedAmountMinor: authorization?.authorizedAmountMinor ?? 0,
    reservedAmountMinor,
    platformReportedAmountMinor,
    settledAmountMinor,
    clientAvailableAmountMinor: byKind.CLIENT_AD_FUNDS ?? 0,
  }
}

export async function getAdRunFunding(businessId: string, adRunId: string) {
  const adRun = await db.adRun.findFirst({ where: { id: adRunId, advertisement: { businessId } } })
  if (!adRun) throw { statusCode: 404, message: 'AdRun not found' }
  const authorization = await db.budgetAuthorization.findFirst({
    where: { adRunId, businessId, status: 'ACTIVE' },
  })
  const currency = authorization?.currency ?? 'USD'
  const accounts = await listAccounts(businessId, currency)
  const byKind = Object.fromEntries(accounts.data.map((row) => [row.kind, row.balanceMinor]))
  const reservedEntries = await db.ledgerEntry.groupBy({
    by: ['direction'],
    where: {
      businessId,
      adRunId,
      account: { kind: 'CLIENT_FUNDS_RESERVED' },
    },
    _sum: { amountMinor: true },
  })
  const reservedDebit =
    reservedEntries.find((row) => row.direction === 'DEBIT')?._sum.amountMinor ?? 0
  const reservedCredit =
    reservedEntries.find((row) => row.direction === 'CREDIT')?._sum.amountMinor ?? 0
  const reservedAmountMinor = reservedCredit - reservedDebit
  const spendRows = await db.adSpend.findMany({ where: { businessId, adRunId } })
  const platformReportedAmountMinor = spendRows.reduce(
    (sum, row) => sum + row.reportedAmountMinor,
    0,
  )
  const settledAmountMinor = spendRows.reduce((sum, row) => sum + row.settledAmountMinor, 0)
  return {
    adRunId,
    currency,
    planningBudget: Number(adRun.budget ?? 0),
    authorizedAmountMinor: authorization?.authorizedAmountMinor ?? 0,
    reservedAmountMinor,
    platformReportedAmountMinor,
    settledAmountMinor,
    clientAvailableAmountMinor: byKind.CLIENT_AD_FUNDS ?? 0,
  }
}

export async function reconcileAdSpend(businessId: string, input: ReconcileInput) {
  requireIdempotencyKey(input.idempotencyKey)
  const existing = await db.reconciliation.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
  })
  if (existing) return toReconciliationDTO(existing)
  try {
    const spend = await db.adSpend.findFirst({ where: { id: input.adSpendId, businessId } })
    if (!spend) throw { statusCode: 404, message: 'Ad spend not found' }
    if (
      !Number.isInteger(input.trackedAmountMinor) ||
      !Number.isInteger(input.platformReportedAmountMinor) ||
      !Number.isInteger(input.settledAmountMinor) ||
      input.trackedAmountMinor < 0 ||
      input.platformReportedAmountMinor < 0 ||
      input.settledAmountMinor < 0
    ) {
      throw { statusCode: 400, message: 'Reconciliation amounts must be non-negative integers' }
    }
    const discrepancyMinor = Math.max(
      Math.abs(input.platformReportedAmountMinor - input.trackedAmountMinor),
      Math.abs(input.settledAmountMinor - input.trackedAmountMinor),
      Math.abs(input.settledAmountMinor - input.platformReportedAmountMinor),
    )
    const matched =
      input.trackedAmountMinor === input.platformReportedAmountMinor &&
      input.platformReportedAmountMinor === input.settledAmountMinor
    const row = await db.reconciliation.create({
      data: {
        businessId,
        campaignId: spend.campaignId,
        adRunId: spend.adRunId,
        adSpendId: spend.id,
        currency: spend.currency,
        trackedAmountMinor: input.trackedAmountMinor,
        platformReportedAmountMinor: input.platformReportedAmountMinor,
        settledAmountMinor: input.settledAmountMinor,
        discrepancyMinor,
        status: matched ? 'MATCHED' : 'DISCREPANCY',
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
      },
    })
    if (matched && spend.settlementStatus === 'REPORTED') {
      await db.adSpend.update({
        where: { id: spend.id },
        data: { settlementStatus: 'RECONCILED' },
      })
    } else if (!matched) {
      await db.adSpend.update({
        where: { id: spend.id },
        data: { settlementStatus: 'DISPUTED' },
      })
    }
    return toReconciliationDTO(row)
  } catch (err) {
    return replayOnConflict(err, async () => {
      const row = await db.reconciliation.findUnique({
        where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
      })
      return row ? toReconciliationDTO(row) : null
    })
  }
}
