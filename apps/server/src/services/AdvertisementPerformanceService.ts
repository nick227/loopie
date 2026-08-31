import { db } from '@project/db'
import { ACTIVE_SALE_WHERE } from '../lib/salePredicates'

export class AdvertisementPerformanceService {
  async getPerformance(businessId: string, advertisementId: string) {
    const advertisement = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId },
    })
    if (!advertisement) throw { statusCode: 404, message: 'Advertisement not found' }

    const [adRuns] = await Promise.all([
      db.adRun.findMany({
        where: { advertisementId: advertisement.id },
      }),
    ])

    const spend = adRuns.reduce((sum, d) => sum + Number(d.spend ?? 0), 0)
    const views = adRuns.reduce((sum, d) => sum + d.impressions, 0)
    const clicks = adRuns.reduce((sum, d) => sum + d.clicks, 0)
    const adRunIds = adRuns.map((d) => d.id)

    const [leadsA, salesA, revenueA, leadsByAdRun, salesByAdRun] = await Promise.all([
      db.lead.count({ where: { businessId, sourceAdRunId: { in: adRunIds } } }),
      db.sale.count({
        where: { businessId, sourceAdRunId: { in: adRunIds }, ...ACTIVE_SALE_WHERE },
      }),
      db.sale.aggregate({
        where: { businessId, sourceAdRunId: { in: adRunIds }, ...ACTIVE_SALE_WHERE },
        _sum: { amount: true },
      }),
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
    ])

    const leads = leadsA
    const sales = salesA
    const revenue = Number(revenueA._sum.amount ?? 0)
    const cpl = leads > 0 ? spend / leads : null

    const byPlatform = new Map<
      string,
      { platform: string; spend: number; leads: number; sales: number }
    >()
    for (const d of adRuns) {
      const entry = byPlatform.get(d.platform) ?? {
        platform: d.platform,
        spend: 0,
        leads: 0,
        sales: 0,
      }
      entry.spend += Number(d.spend ?? 0)
      byPlatform.set(d.platform, entry)
    }

    const adRunToPlatform = new Map(adRuns.map((d) => [d.id, d.platform as string]))

    for (const row of leadsByAdRun) {
      if (!row.sourceAdRunId) continue
      const platform = adRunToPlatform.get(row.sourceAdRunId)
      if (platform) byPlatform.get(platform)!.leads += row._count._all
    }
    for (const row of salesByAdRun) {
      if (!row.sourceAdRunId) continue
      const platform = adRunToPlatform.get(row.sourceAdRunId)
      if (platform) byPlatform.get(platform)!.sales += row._count._all
    }

    const byLandingPage = await this._landingPagePerformanceForAdvertisement(businessId, adRuns)

    return {
      spend,
      views,
      clicks,
      leads,
      sales,
      revenue,
      cpl,
      byPlatform: Array.from(byPlatform.values()),
      byLandingPage,
    }
  }

  private async _landingPagePerformanceForAdvertisement(
    businessId: string,
    adRuns: { destinationLandingPageId: string | null }[],
  ) {
    const landingPageIds = [
      ...new Set(
        [...adRuns].map((d) => d.destinationLandingPageId).filter((v): v is string => !!v),
      ),
    ]
    if (!landingPageIds.length) return []

    const pages = await db.landingPage.findMany({
      where: { id: { in: landingPageIds }, businessId },
    })

    return Promise.all(
      pages.map(async (page) => {
        const [views, uniqueSessionRows, submissionRows] = await Promise.all([
          db.pageView.count({ where: { landingPageId: page.id } }),
          db.pageView.findMany({
            where: { landingPageId: page.id, sessionId: { not: null } },
            distinct: ['sessionId'],
            select: { sessionId: true },
          }),
          db.formSubmission.findMany({
            where: { landingPageId: page.id },
            select: { leadId: true },
          }),
        ])
        const uniqueSessions = uniqueSessionRows.length
        const submissions = submissionRows.length
        // Distinct leads, not raw submission rows — a still-open Lead resubmitting the same page
        // (a repeat visit before converting) produces more than one FormSubmission but is still
        // exactly one lead. Submissions above deliberately stays the raw count.
        const leadIds = [
          ...new Set(submissionRows.map((r) => r.leadId).filter((v): v is string => !!v)),
        ]
        const sales = await db.sale.count({
          where: { businessId, leadId: { in: leadIds }, ...ACTIVE_SALE_WHERE },
        })

        return {
          landingPageId: page.id,
          landingPageName: page.name,
          views,
          uniqueSessions,
          submissions,
          conversionRate: uniqueSessions > 0 ? submissions / uniqueSessions : null,
          leads: leadIds.length,
          sales,
        }
      }),
    )
  }
}
