import type { AccountKind, Prisma } from '@prisma/client'

export const ACCOUNT_KINDS: AccountKind[] = [
  'CLIENT_AD_FUNDS',
  'CLIENT_FUNDS_RESERVED',
  'LOOPIE_CASH',
  'PROCESSOR_CLEARING',
  'AD_PLATFORM_CLEARING',
  'LOOPIE_REVENUE',
  'AFFILIATE_PAYABLE',
  'REFUNDS_CREDITS',
]

const ACCOUNT_NAMES: Record<AccountKind, string> = {
  CLIENT_AD_FUNDS: 'Client ad funds',
  CLIENT_FUNDS_RESERVED: 'Client funds reserved',
  LOOPIE_CASH: 'LOOPIE cash',
  PROCESSOR_CLEARING: 'Processor clearing',
  AD_PLATFORM_CLEARING: 'Ad platform clearing',
  LOOPIE_REVENUE: 'LOOPIE revenue',
  AFFILIATE_PAYABLE: 'Affiliate payable',
  REFUNDS_CREDITS: 'Refunds and credits',
}

const DEBIT_NORMAL: ReadonlySet<AccountKind> = new Set([
  'LOOPIE_CASH',
  'PROCESSOR_CLEARING',
  'REFUNDS_CREDITS',
])

export function isDebitNormal(kind: AccountKind): boolean {
  return DEBIT_NORMAL.has(kind)
}

export type Chart = Record<AccountKind, { id: string; kind: AccountKind; currency: string }>

export async function ensureChartOfAccounts(
  tx: Prisma.TransactionClient,
  businessId: string,
  currency: string,
): Promise<Chart> {
  const existing = await tx.financialAccount.findMany({ where: { businessId, currency } })
  const byKind = new Map(existing.map((row) => [row.kind, row]))
  for (const kind of ACCOUNT_KINDS) {
    if (byKind.has(kind)) continue
    const created = await tx.financialAccount.create({
      data: { businessId, kind, currency, name: ACCOUNT_NAMES[kind] },
    })
    byKind.set(kind, created)
  }
  const chart = {} as Chart
  for (const kind of ACCOUNT_KINDS) {
    const row = byKind.get(kind)
    if (!row) throw { statusCode: 500, message: `Missing account ${kind}` }
    chart[kind] = { id: row.id, kind: row.kind, currency: row.currency }
  }
  return chart
}
