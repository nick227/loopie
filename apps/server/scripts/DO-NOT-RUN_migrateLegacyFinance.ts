// QUARANTINED — DO NOT RUN.
//
// This script calls db.adSpend.update / db.ledgerEntry.update / db.budgetAuthorization.update to
// retroactively stamp adRunId onto EXISTING historical rows. LedgerEntry in particular has no
// updatedAt column at all and is documented elsewhere in this project (CLAUDE.md, "Money & Ledger")
// as immutable — never edited after posting. Mutating it here directly conflicts with the
// permanent schema policy established during the Media/Advertisement/AdRun migration: "deprecated
// means stop writing, never means delete or rewrite history" (see schema.prisma's header comment
// and CLAUDE.md's migration audit).
//
// Renamed with this prefix specifically so it can't be run by accident. If this mapping is still
// needed, rewrite it to be read-only (compute and print the legacy -> AdRun mapping, no .update
// calls at all) before it's ever executed against loopie_test or the shared loopie database.
import { db } from '@project/db'
import { Prisma } from '@project/db'

async function migrate() {
  console.log('Starting Legacy Finance Migration...')

  // Get totals before migration
  const beforeAdSpend = await db.adSpend.aggregate({ _sum: { reportedAmountMinor: true } })
  const beforeLedgerDebit = await db.ledgerEntry.aggregate({
    where: { direction: 'DEBIT' },
    _sum: { amountMinor: true },
  })
  const beforeLedgerCredit = await db.ledgerEntry.aggregate({
    where: { direction: 'CREDIT' },
    _sum: { amountMinor: true },
  })

  console.log(`Pre-migration AdSpend Total: ${beforeAdSpend._sum.reportedAmountMinor ?? 0}`)
  console.log(`Pre-migration Ledger Debits: ${beforeLedgerDebit._sum.amountMinor ?? 0}`)
  console.log(`Pre-migration Ledger Credits: ${beforeLedgerCredit._sum.amountMinor ?? 0}`)

  const legacyAdSpends = await db.adSpend.findMany({
    where: { adRunId: null, campaignId: { not: null } },
  })

  const legacyLedgerEntries = await db.ledgerEntry.findMany({
    where: { adRunId: null, campaignId: { not: null } },
  })

  const legacyBudgetAuths = await db.budgetAuthorization.findMany({
    where: { adRunId: null, campaignId: { not: null } },
  })

  console.log(`Found ${legacyAdSpends.length} legacy AdSpends`)
  console.log(`Found ${legacyLedgerEntries.length} legacy LedgerEntries`)
  console.log(`Found ${legacyBudgetAuths.length} legacy BudgetAuthorizations`)

  const stats = { exact: 0, deterministic: 0, ambiguous: 0, orphaned: 0 }

  // Helper to find AdRun mapping
  async function findAdRunMatch(campaignId: string, deploymentId: string | null) {
    const campaignAdRuns = await db.campaignAdRun.findMany({
      where: { campaignId },
      include: { adRun: true },
    })

    if (campaignAdRuns.length === 0) {
      return { matchType: 'orphaned', adRunId: null }
    }

    if (campaignAdRuns.length === 1) {
      return { matchType: 'exact', adRunId: campaignAdRuns[0].adRunId }
    }

    // Deterministic match via deployment
    if (deploymentId) {
      const deployment = await db.deployment.findUnique({ where: { id: deploymentId } })
      if (deployment) {
        const matchingRun = campaignAdRuns.find(
          (cr) =>
            cr.adRun.platform === deployment.platform &&
            (cr.adRun.externalCampaignId === deployment.externalCampaignId ||
              !deployment.externalCampaignId),
        )
        if (matchingRun) {
          return { matchType: 'deterministic', adRunId: matchingRun.adRunId }
        }
      }
    }

    return { matchType: 'ambiguous', adRunId: null }
  }

  // Migrate AdSpends
  for (const spend of legacyAdSpends) {
    const { matchType, adRunId } = await findAdRunMatch(spend.campaignId!, spend.deploymentId)
    stats[matchType as keyof typeof stats]++

    if (adRunId) {
      await db.adSpend.update({
        where: { id: spend.id },
        data: { adRunId },
      })
    } else {
      console.log(`[AdSpend ${spend.id}] ${matchType}: Keeping campaignId ${spend.campaignId}`)
    }
  }

  // Migrate LedgerEntries
  for (const entry of legacyLedgerEntries) {
    let matchType = 'ambiguous',
      adRunId = null
    const baseMatch = await findAdRunMatch(entry.campaignId!, null)

    if (baseMatch.matchType === 'exact' || baseMatch.matchType === 'orphaned') {
      matchType = baseMatch.matchType
      adRunId = baseMatch.adRunId
    } else if (entry.purpose === 'PLATFORM_SPEND') {
      // deterministic attempt could go here based on matching AdSpend amounts
    }

    stats[matchType as keyof typeof stats]++
    if (adRunId) {
      await db.ledgerEntry.update({
        where: { id: entry.id },
        data: { adRunId },
      })
    } else {
      console.log(`[LedgerEntry ${entry.id}] ${matchType}: Keeping campaignId ${entry.campaignId}`)
    }
  }

  // Migrate BudgetAuths
  for (const auth of legacyBudgetAuths) {
    const { matchType, adRunId } = await findAdRunMatch(auth.campaignId!, null)
    stats[matchType as keyof typeof stats]++

    if (adRunId) {
      await db.budgetAuthorization.update({
        where: { id: auth.id },
        data: { adRunId },
      })
    } else {
      console.log(`[BudgetAuth ${auth.id}] ${matchType}: Keeping campaignId ${auth.campaignId}`)
    }
  }

  console.log('Migration Complete. Stats:', stats)

  // Verify Invariants Post-Migration
  const afterAdSpend = await db.adSpend.aggregate({ _sum: { reportedAmountMinor: true } })
  const afterLedgerDebit = await db.ledgerEntry.aggregate({
    where: { direction: 'DEBIT' },
    _sum: { amountMinor: true },
  })
  const afterLedgerCredit = await db.ledgerEntry.aggregate({
    where: { direction: 'CREDIT' },
    _sum: { amountMinor: true },
  })

  console.log(`Post-migration AdSpend Total: ${afterAdSpend._sum.reportedAmountMinor ?? 0}`)
  console.log(`Post-migration Ledger Debits: ${afterLedgerDebit._sum.amountMinor ?? 0}`)
  console.log(`Post-migration Ledger Credits: ${afterLedgerCredit._sum.amountMinor ?? 0}`)

  if (
    beforeAdSpend._sum.reportedAmountMinor?.toString() !==
    afterAdSpend._sum.reportedAmountMinor?.toString()
  ) {
    console.error('INVARIANT FAILED: AdSpend total changed!')
  }
  if (
    beforeLedgerDebit._sum.amountMinor?.toString() !== afterLedgerDebit._sum.amountMinor?.toString()
  ) {
    console.error('INVARIANT FAILED: Ledger Debits changed!')
  }
  if (
    beforeLedgerCredit._sum.amountMinor?.toString() !==
    afterLedgerCredit._sum.amountMinor?.toString()
  ) {
    console.error('INVARIANT FAILED: Ledger Credits changed!')
  }
}

migrate()
  .catch(console.error)
  .finally(() => process.exit(0))
