import { db } from '@project/db'
import { ACTIVE_SALE_WHERE } from './salePredicates'

export type AdRunPerformance = { leads: number; sales: number; revenue: number }

const EMPTY: AdRunPerformance = { leads: 0, sales: 0, revenue: 0 }

// Per-run leads/sales/revenue, keyed by adRunId — the one rollup AdRun's own denormalized
// spend/impressions/clicks columns don't cover, since attribution lives on Lead/Sale via
// sourceAdRunId, not on the run row itself. Mirrors AdvertisementPerformanceService's
// businessId-scoped, ACTIVE_SALE_WHERE-filtered convention, just grouped by run instead of summed
// across all of an Advertisement's runs.
export async function leadsSalesRevenueByAdRun(
  businessId: string,
  adRunIds: string[],
): Promise<Map<string, AdRunPerformance>> {
  const result = new Map<string, AdRunPerformance>()
  if (adRunIds.length === 0) return result

  const [leadsByAdRun, salesByAdRun, revenueByAdRun] = await Promise.all([
    db.lead.groupBy({
      by: ['sourceAdRunId'],
      where: { businessId, sourceAdRunId: { in: adRunIds } },
      _count: { _all: true },
    }),
    db.sale.groupBy({
      by: ['sourceAdRunId'],
      where: { businessId, sourceAdRunId: { in: adRunIds }, ...ACTIVE_SALE_WHERE },
      _count: { _all: true },
    }),
    db.sale.groupBy({
      by: ['sourceAdRunId'],
      where: { businessId, sourceAdRunId: { in: adRunIds }, ...ACTIVE_SALE_WHERE },
      _sum: { amount: true },
    }),
  ])

  for (const id of adRunIds) result.set(id, { ...EMPTY })
  for (const row of leadsByAdRun) {
    if (!row.sourceAdRunId) continue
    result.get(row.sourceAdRunId)!.leads = row._count._all
  }
  for (const row of salesByAdRun) {
    if (!row.sourceAdRunId) continue
    result.get(row.sourceAdRunId)!.sales = row._count._all
  }
  for (const row of revenueByAdRun) {
    if (!row.sourceAdRunId) continue
    result.get(row.sourceAdRunId)!.revenue = Number(row._sum.amount ?? 0)
  }
  return result
}

export function withPerformance<T extends { id: string }>(
  adRun: T,
  performance: Map<string, AdRunPerformance>,
): T & AdRunPerformance {
  return { ...adRun, ...(performance.get(adRun.id) ?? EMPTY) }
}
