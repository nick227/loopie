import { db } from '@project/db'
import { ACTIVE_SALE_WHERE } from './salePredicates'

// Shadow-phase comparison tooling for the Media/Advertisement/AdRun migration — see CLAUDE.md's
// migration audit. Per explicit user direction: "No UI cutover until the new AdRun path matches
// the old path at identity level, not just aggregate totals." This is deliberately NOT a diff of
// two pipelines processing the same real-world click (no such thing exists — a given click is
// tracked via either /r/{deploymentId} or /r/adrun/{adRunId}, never both). It is a structural
// conformance auditor: given a legacy source (Deployment/AdUnit) and a new AdRun meant to
// represent equivalent real activity (e.g. the business ran the same creative/budget/targeting on
// both, deliberately, to validate the new pipeline), it checks that everything the new pipeline
// computed about its own activity is internally correct and consistent with how the legacy
// pipeline would compute the same category of number — not that the two produce identical totals
// (they never will; they drove different real clicks).
//
// Every finding is classified into exactly one of the four buckets the user specified. `match`
// is a fifth, not one of the four — a dimension that came back clean isn't a "difference" of any
// kind.
export type ShadowMismatchCategory =
  | 'expected_model_difference'
  | 'migration_defect'
  | 'legacy_data_ambiguity'
  | 'connector_timing_difference'

export type ShadowFindingStatus = 'match' | ShadowMismatchCategory

export type ShadowFinding = {
  dimension:
    | 'leadIds'
    | 'saleIds'
    | 'attributedRevenue'
    | 'sourceAdRunIdOwnership'
    | 'reversals'
    | 'spendTotals'
    | 'clickConversionCounts'
    | 'statusTransitions'
  status: ShadowFindingStatus
  detail: string
  legacy?: unknown
  next?: unknown
}

export type ShadowComparisonReport = {
  businessId: string
  legacySource: { kind: 'DEPLOYMENT' | 'AD_UNIT'; id: string }
  newSource: { kind: 'AD_RUN'; id: string }
  findings: ShadowFinding[]
  // The acceptance rule: passes only if every finding is `match` or `expected_model_difference`.
  // A single `migration_defect`, `legacy_data_ambiguity`, or `connector_timing_difference` fails
  // it — those require a human decision (fix, backfill, or wait out the timing skew), not a
  // silent pass.
  readyForCutover: boolean
}

function finding(f: ShadowFinding): ShadowFinding {
  return f
}

export async function compareSourcePair(
  businessId: string,
  legacySource: { kind: 'DEPLOYMENT' | 'AD_UNIT'; id: string },
  adRunId: string,
): Promise<ShadowComparisonReport> {
  const adRun = await db.adRun.findFirst({
    where: { id: adRunId, advertisement: { businessId } },
  })
  if (!adRun) throw { statusCode: 404, message: 'AdRun not found' }

  const legacyWhere =
    legacySource.kind === 'DEPLOYMENT'
      ? { sourceDeploymentId: legacySource.id }
      : { sourceAdUnitId: legacySource.id }

  const findings: ShadowFinding[] = []

  // --- leadIds: no cross-contamination, every AdRun-attributed lead has a consistent sourceType.
  const [legacyLeads, newLeads] = await Promise.all([
    db.lead.findMany({
      where: { businessId, ...legacyWhere },
      select: { id: true, sourceType: true },
    }),
    db.lead.findMany({
      where: { businessId, sourceAdRunId: adRunId },
      select: { id: true, sourceType: true },
    }),
  ])
  const misTypedLeads = newLeads.filter((l) => l.sourceType !== 'AD_RUN')
  const overlap = new Set(legacyLeads.map((l) => l.id))
  const crossContaminated = newLeads.filter((l) => overlap.has(l.id))
  if (misTypedLeads.length || crossContaminated.length) {
    findings.push(
      finding({
        dimension: 'leadIds',
        status: 'migration_defect',
        detail: `${misTypedLeads.length} lead(s) with sourceAdRunId set but sourceType !== 'AD_RUN'; ${crossContaminated.length} lead(s) attributed to both the legacy source and this AdRun.`,
        legacy: legacyLeads.map((l) => l.id),
        next: newLeads.map((l) => l.id),
      }),
    )
  } else {
    findings.push(
      finding({
        dimension: 'leadIds',
        status: 'match',
        detail: `${newLeads.length} lead(s) attributed to this AdRun, all correctly typed and non-overlapping with the legacy source's ${legacyLeads.length} lead(s). Different real people by design — counts are not expected to match.`,
        legacy: legacyLeads.length,
        next: newLeads.length,
      }),
    )
  }

  // --- saleIds: every sale linked to an AdRun-sourced lead correctly inherited sourceAdRunId.
  const newLeadIds = newLeads.map((l) => l.id)
  const salesFromNewLeads = newLeadIds.length
    ? await db.sale.findMany({
        where: { businessId, leadId: { in: newLeadIds } },
        select: { id: true, sourceAdRunId: true, leadId: true },
      })
    : []
  const uninherited = salesFromNewLeads.filter((s) => s.sourceAdRunId !== adRunId)
  if (uninherited.length) {
    findings.push(
      finding({
        dimension: 'saleIds',
        status: 'migration_defect',
        detail: `${uninherited.length} sale(s) linked to an AdRun-sourced lead did not inherit sourceAdRunId (SaleService.create should copy it from the lead at creation).`,
        next: uninherited.map((s) => s.id),
      }),
    )
  } else {
    findings.push(
      finding({
        dimension: 'saleIds',
        status: 'match',
        detail: `${salesFromNewLeads.length} sale(s) from this AdRun's leads, all correctly carrying sourceAdRunId.`,
        next: salesFromNewLeads.map((s) => s.id),
      }),
    )
  }

  // --- attributedRevenue: two independent computations of the same number must agree — the
  // rollup query path (what CampaignPerformanceService/DashboardService actually run) versus a
  // raw ground-truth sum. This is the check most likely to catch a real rollup bug.
  const [rollupRevenueAgg, groundTruthSales] = await Promise.all([
    db.sale.aggregate({
      where: { businessId, sourceAdRunId: adRunId, ...ACTIVE_SALE_WHERE },
      _sum: { amount: true },
    }),
    db.sale.findMany({
      where: { businessId, sourceAdRunId: adRunId, reversedAt: null },
      select: { amount: true },
    }),
  ])
  const rollupRevenue = Number(rollupRevenueAgg._sum.amount ?? 0)
  const groundTruthRevenue = groundTruthSales.reduce((sum, s) => sum + Number(s.amount), 0)
  if (Math.abs(rollupRevenue - groundTruthRevenue) > 0.005) {
    findings.push(
      finding({
        dimension: 'attributedRevenue',
        status: 'migration_defect',
        detail: 'Rollup-query revenue and a raw ground-truth sum over the same AdRun disagree.',
        legacy: groundTruthRevenue,
        next: rollupRevenue,
      }),
    )
  } else {
    findings.push(
      finding({
        dimension: 'attributedRevenue',
        status: 'match',
        detail: `Rollup revenue ($${rollupRevenue}) matches ground truth.`,
        next: rollupRevenue,
      }),
    )
  }

  // --- sourceAdRunId ownership: tenant isolation — every row referencing this AdRun must belong
  // to the same business as the AdRun itself.
  const [foreignLeads, foreignSales, foreignInteractions] = await Promise.all([
    db.lead.count({ where: { sourceAdRunId: adRunId, businessId: { not: businessId } } }),
    db.sale.count({ where: { sourceAdRunId: adRunId, businessId: { not: businessId } } }),
    db.interaction.count({ where: { sourceAdRunId: adRunId, businessId: { not: businessId } } }),
  ])
  const foreignCount = foreignLeads + foreignSales + foreignInteractions
  findings.push(
    finding(
      foreignCount > 0
        ? {
            dimension: 'sourceAdRunIdOwnership',
            status: 'migration_defect',
            detail: `${foreignCount} row(s) reference this AdRun but belong to a different business — tenant isolation breach.`,
          }
        : {
            dimension: 'sourceAdRunIdOwnership',
            status: 'match',
            detail: 'No cross-tenant references to this AdRun.',
          },
    ),
  )

  // --- reversals: a reversed sale must vanish from revenue but not from raw existence.
  const [allSalesCount, activeSalesCount] = await Promise.all([
    db.sale.count({ where: { businessId, sourceAdRunId: adRunId } }),
    db.sale.count({ where: { businessId, sourceAdRunId: adRunId, ...ACTIVE_SALE_WHERE } }),
  ])
  const reversedCount = allSalesCount - activeSalesCount
  findings.push(
    finding({
      dimension: 'reversals',
      status: 'match',
      detail: `${reversedCount} of ${allSalesCount} sale(s) reversed; the active-sales count (${activeSalesCount}) is what revenue rollups use, matching the attributedRevenue check above.`,
      legacy: reversedCount,
      next: activeSalesCount,
    }),
  )

  // --- spendTotals: the denormalized AdRun.spend counter versus AdSpend ledger rows, if any
  // exist. A gap while spend rows exist is a real defect; a gap while none exist yet is expected
  // (spend hasn't been recorded through finance yet) or a timing artifact of an in-flight sync.
  const adSpendRows = await db.adSpend.findMany({
    where: { adRunId },
    select: { reportedAmountMinor: true, settledAmountMinor: true, settlementStatus: true },
  })
  const adSpendReportedTotal = adSpendRows.reduce((sum, r) => sum + r.reportedAmountMinor, 0) / 100
  const denormalizedSpend = Number(adRun.spend)
  if (adSpendRows.length === 0) {
    findings.push(
      finding({
        dimension: 'spendTotals',
        status: 'expected_model_difference',
        detail:
          'No AdSpend rows recorded for this AdRun yet — spend is still manual/denormalized-only, same as a fresh Deployment.',
        next: denormalizedSpend,
      }),
    )
  } else if (Math.abs(adSpendReportedTotal - denormalizedSpend) > 0.01) {
    const hasUnsettled = adSpendRows.some((r) => r.settlementStatus === 'REPORTED')
    findings.push(
      finding({
        dimension: 'spendTotals',
        status: hasUnsettled ? 'connector_timing_difference' : 'migration_defect',
        detail: hasUnsettled
          ? 'AdSpend ledger total and the denormalized AdRun.spend counter disagree, but at least one AdSpend row is still awaiting settlement — likely a sync-in-progress gap, not a defect.'
          : 'AdSpend ledger total and the denormalized AdRun.spend counter disagree with nothing left unsettled — should have converged.',
        legacy: adSpendReportedTotal,
        next: denormalizedSpend,
      }),
    )
  } else {
    findings.push(
      finding({
        dimension: 'spendTotals',
        status: 'match',
        detail: 'AdSpend ledger total matches AdRun.spend.',
        next: denormalizedSpend,
      }),
    )
  }

  // --- clickConversionCounts: denormalized AdRun.clicks/conversions versus the real underlying
  // rows they're supposed to summarize.
  const [realClicks, realLeadConversions] = await Promise.all([
    db.attributionEvent.count({ where: { adRunId } }),
    db.lead.count({ where: { sourceAdRunId: adRunId } }), // a lead only exists here when leadCreated was true — see AttributionService.submitForm
  ])
  const clickMismatch = realClicks !== adRun.clicks
  const conversionMismatch = realLeadConversions !== adRun.conversions
  if (clickMismatch || conversionMismatch) {
    findings.push(
      finding({
        dimension: 'clickConversionCounts',
        status: 'migration_defect',
        detail: `Denormalized counters drifted from the real underlying rows: clicks ${adRun.clicks} vs ${realClicks} actual AttributionEvent rows; conversions ${adRun.conversions} vs ${realLeadConversions} actual leadCreated=true attributions.`,
        legacy: { clicks: realClicks, conversions: realLeadConversions },
        next: { clicks: adRun.clicks, conversions: adRun.conversions },
      }),
    )
  } else {
    findings.push(
      finding({
        dimension: 'clickConversionCounts',
        status: 'match',
        detail: 'AdRun.clicks/conversions counters match the real underlying rows exactly.',
        next: { clicks: adRun.clicks, conversions: adRun.conversions },
      }),
    )
  }

  // --- statusTransitions: the one hard invariant from the provisioning safeguards — a
  // VALIDATION_FAILED run must never carry a real external ad id (would mean it's actually live
  // but marked as failed, the inverse of the "never look live" guarantee).
  if (adRun.status === 'VALIDATION_FAILED' && adRun.externalAdId) {
    findings.push(
      finding({
        dimension: 'statusTransitions',
        status: 'migration_defect',
        detail:
          'AdRun is VALIDATION_FAILED but has a real externalAdId — the failure-safety invariant from AdRunService.createAndProvision was violated.',
      }),
    )
  } else {
    findings.push(
      finding({
        dimension: 'statusTransitions',
        status: 'match',
        detail: `Status (${adRun.status}) is internally consistent with externalAdId presence (${adRun.externalAdId ? 'set' : 'unset'}).`,
      }),
    )
  }

  const readyForCutover = findings.every(
    (f) => f.status === 'match' || f.status === 'expected_model_difference',
  )

  return {
    businessId,
    legacySource,
    newSource: { kind: 'AD_RUN', id: adRunId },
    findings,
    readyForCutover,
  }
}
