import type { Prisma } from '@prisma/client'

// LOOPIE's own platform-affiliate revenue share (paying people who refer new businesses to
// LOOPIE) is not a client business's money — it's LOOPIE's own P&L. The double-entry ledger's
// postLedger/ensureChartOfAccounts machinery is businessId-scoped, so rather than a schema change
// this designates one fixed, lazily-created Business row as that ledger's scope. Every other
// business's chart of accounts stays untouched; this one only ever holds LOOPIE_REVENUE /
// AFFILIATE_PAYABLE / LOOPIE_CASH entries for the platform-affiliate program.
export const HOUSE_BUSINESS_SLUG = 'loopie-platform-house'

export async function getOrCreateHouseBusinessId(tx: Prisma.TransactionClient): Promise<string> {
  const existing = await tx.business.findUnique({ where: { slug: HOUSE_BUSINESS_SLUG } })
  if (existing) return existing.id
  try {
    const created = await tx.business.create({
      data: { name: 'LOOPIE (platform affiliate ledger)', slug: HOUSE_BUSINESS_SLUG },
    })
    return created.id
  } catch {
    // Lost a create race against a concurrent caller — the row exists now either way.
    const row = await tx.business.findUnique({ where: { slug: HOUSE_BUSINESS_SLUG } })
    if (!row) throw { statusCode: 500, message: 'Failed to establish the house ledger business' }
    return row.id
  }
}
