import type { LedgerDirection, LedgerTransactionType, Prisma } from '@prisma/client'
import { isUniqueConflict } from '../prismaError'
import { isDebitNormal } from './accounts'

export type EntryInput = {
  accountId: string
  direction: LedgerDirection
  amountMinor: number
}

export function assertBalanced(entries: EntryInput[]): void {
  if (entries.length < 2) {
    throw { statusCode: 400, message: 'Ledger transaction requires at least two entries' }
  }
  let debits = 0
  let credits = 0
  for (const entry of entries) {
    if (!Number.isInteger(entry.amountMinor) || entry.amountMinor <= 0) {
      throw { statusCode: 400, message: 'amountMinor must be a positive integer' }
    }
    if (entry.direction === 'DEBIT') debits += entry.amountMinor
    else credits += entry.amountMinor
  }
  if (debits !== credits) {
    throw {
      statusCode: 400,
      message: `Unbalanced ledger transaction: debits ${debits} !== credits ${credits}`,
    }
  }
}

export function balancedPair(
  debitAccountId: string,
  creditAccountId: string,
  amountMinor: number,
): EntryInput[] {
  return [
    { accountId: debitAccountId, direction: 'DEBIT', amountMinor },
    { accountId: creditAccountId, direction: 'CREDIT', amountMinor },
  ]
}

export function invertEntries(
  entries: { accountId: string; direction: LedgerDirection; amountMinor: number }[],
): EntryInput[] {
  return entries.map((entry) => ({
    accountId: entry.accountId,
    direction: entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
    amountMinor: entry.amountMinor,
  }))
}

export function transactionBalance(
  entries: { direction: LedgerDirection; amountMinor: number }[],
): number {
  let debits = 0
  let credits = 0
  for (const entry of entries) {
    if (entry.direction === 'DEBIT') debits += entry.amountMinor
    else credits += entry.amountMinor
  }
  return debits - credits
}

type PostArgs = {
  businessId: string
  currency: string
  type: LedgerTransactionType
  idempotencyKey: string
  externalRef?: string | null
  externalProvider?: string | null
  reversesTransactionId?: string | null
  metadata?: Prisma.InputJsonValue
  campaignId?: string | null // @deprecated
  adRunId?: string | null
  entries: EntryInput[]
}

export async function postLedger(tx: Prisma.TransactionClient, args: PostArgs) {
  assertBalanced(args.entries)
  const accountIds = [...new Set(args.entries.map((entry) => entry.accountId))]
  const accounts = await tx.financialAccount.findMany({
    where: { id: { in: accountIds }, businessId: args.businessId },
  })
  if (accounts.length !== accountIds.length) {
    throw { statusCode: 400, message: 'Ledger entry references an account outside this tenant' }
  }
  for (const account of accounts) {
    if (account.currency !== args.currency) {
      throw { statusCode: 400, message: 'Ledger entry currency does not match the transaction' }
    }
  }
  return tx.ledgerTransaction.create({
    data: {
      businessId: args.businessId,
      currency: args.currency,
      type: args.type,
      idempotencyKey: args.idempotencyKey,
      externalRef: args.externalRef ?? null,
      externalProvider: args.externalProvider ?? null,
      reversesTransactionId: args.reversesTransactionId ?? null,
      metadata: args.metadata ?? undefined,
      entries: {
        create: args.entries.map((entry) => ({
          businessId: args.businessId,
          accountId: entry.accountId,
          campaignId: args.campaignId ?? null,
          adRunId: args.adRunId ?? null,
          direction: entry.direction,
          amountMinor: entry.amountMinor,
          currency: args.currency,
        })),
      },
    },
    include: { entries: true },
  })
}

// campaignId and adRunId are two independent, additive scoping dimensions (see CLAUDE.md's
// Media/Advertisement/AdRun migration audit) — real reserved-fund balances today are entirely
// campaignId-scoped (nothing writes adRunId-scoped LedgerEntry rows yet), so both must keep
// working rather than one replacing the other in this shared helper.
export async function accountBalanceMinor(
  tx: Prisma.TransactionClient,
  businessId: string,
  accountId: string,
  campaignId?: string,
  adRunId?: string,
): Promise<number> {
  const account = await tx.financialAccount.findFirst({ where: { id: accountId, businessId } })
  if (!account) throw { statusCode: 404, message: 'Account not found' }
  const grouped = await tx.ledgerEntry.groupBy({
    by: ['direction'],
    where: {
      businessId,
      accountId,
      ...(campaignId ? { campaignId } : {}),
      ...(adRunId ? { adRunId } : {}),
    },
    _sum: { amountMinor: true },
  })
  const debit = grouped.find((row) => row.direction === 'DEBIT')?._sum.amountMinor ?? 0
  const credit = grouped.find((row) => row.direction === 'CREDIT')?._sum.amountMinor ?? 0
  return isDebitNormal(account.kind) ? debit - credit : credit - debit
}

export async function replayOnConflict<T>(
  err: unknown,
  replay: () => Promise<T | null>,
): Promise<T> {
  if (!isUniqueConflict(err)) throw err
  const existing = await replay()
  if (!existing) throw err
  return existing
}
