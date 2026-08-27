import { db } from '@project/db'
import { ACTIVE_SALE_WHERE } from '../lib/salePredicates'
import { attributionSourceWhereOr } from '../lib/attributionSource'

// Restored after this file was briefly replaced in-place by an uncoordinated, incomplete
// Advertisement/AdRun rewrite (see AdvertisementPerformanceService.ts, kept alongside this rather
// than deleted) that only read sourceAdRunId — since nothing has ever populated AdRun/adRunId in
// real data yet, that swap would have silently dropped every existing campaign's performance to
// zero. Rolls up Landing Page -> Creative -> Campaign -> Platform, blending external Deployments
// and first-party AdUnits into one view. AdUnits report under a synthetic 'LOOPIE' platform row
// (see the Platform enum) rather than requiring the business to add it to campaign.platforms
// manually.
export class CampaignPerformanceService {
  async getPerformance(businessId: string, campaignId: string) {
    const campaign = await db.campaign.findFirst({ where: { id: campaignId, businessId } })
    if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }

    const [deployments, adUnits, campaignAdRuns] = await Promise.all([
      db.deployment.findMany({
        where: { campaignId: campaign.id },
        include: { creative: { select: { name: true } } },
      }),
      db.adUnit.findMany({
        where: { campaignId: campaign.id },
        include: { creative: { select: { name: true } } },
      }),
      // AdRuns grouped under this campaign via the optional CampaignAdRun join — see
      // CLAUDE.md's Media/Advertisement/AdRun migration audit. A standalone AdRun with no
      // CampaignAdRun row never shows up here, which is correct: it isn't this campaign's.
      db.campaignAdRun.findMany({
        where: { campaignId: campaign.id },
        include: { adRun: true },
      }),
    ])
    const adRuns = campaignAdRuns.map((c) => c.adRun)

    const spend =
      deployments.reduce((sum, d) => sum + Number(d.spend), 0) +
      adRuns.reduce((sum, r) => sum + Number(r.spend), 0)
    const views =
      deployments.reduce((sum, d) => sum + d.impressions, 0) +
      adUnits.reduce((sum, a) => sum + a.impressions, 0) +
      adRuns.reduce((sum, r) => sum + r.impressions, 0)
    const clicks =
      deployments.reduce((sum, d) => sum + d.clicks, 0) +
      adUnits.reduce((sum, a) => sum + a.clicks, 0) +
      adRuns.reduce((sum, r) => sum + r.clicks, 0)
    const deploymentIds = deployments.map((d) => d.id)
    const adUnitIds = adUnits.map((a) => a.id)
    const adRunIds = adRuns.map((r) => r.id)

    // Union across all three attribution-source dimensions in one query each — the canonical
    // "campaign/dashboard/page reporting all consume the same normalized source set" query shape
    // from lib/attributionSource.ts, so the top-level totals can never drift from whichever
    // dimensions this campaign's inventory actually spans.
    const sourceOr = attributionSourceWhereOr({ deploymentIds, adUnitIds, adRunIds })
    const hasAnyInventory = sourceOr.length > 0

    const [
      leads,
      sales,
      revenueAgg,
      leadsByDeployment,
      salesByDeployment,
      leadsByAdUnit,
      salesByAdUnit,
      leadsByAdRun,
      salesByAdRun,
    ] = await Promise.all([
      hasAnyInventory ? db.lead.count({ where: { businessId, OR: sourceOr } }) : Promise.resolve(0),
      hasAnyInventory
        ? db.sale.count({ where: { businessId, OR: sourceOr, ...ACTIVE_SALE_WHERE } })
        : Promise.resolve(0),
      hasAnyInventory
        ? db.sale.aggregate({
            where: { businessId, OR: sourceOr, ...ACTIVE_SALE_WHERE },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null } }),
      db.lead.groupBy({
        by: ['sourceDeploymentId'],
        where: { businessId, sourceDeploymentId: { in: deploymentIds } },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceDeploymentId'],
        where: { businessId, sourceDeploymentId: { in: deploymentIds }, ...ACTIVE_SALE_WHERE },
        _count: { _all: true },
      }),
      db.lead.groupBy({
        by: ['sourceAdUnitId'],
        where: { businessId, sourceAdUnitId: { in: adUnitIds } },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceAdUnitId'],
        where: { businessId, sourceAdUnitId: { in: adUnitIds }, ...ACTIVE_SALE_WHERE },
        _count: { _all: true },
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

    const revenue = Number(revenueAgg._sum.amount ?? 0)
    const cpl = leads > 0 ? spend / leads : null

    const deploymentToCreative = new Map(
      deployments.map((d) => [d.id, { id: d.creativeId, name: d.creative.name }]),
    )
    const deploymentToPlatform = new Map(deployments.map((d) => [d.id, d.platform as string]))
    const adUnitToCreative = new Map(
      adUnits.map((a) => [a.id, { id: a.creativeId, name: a.creative.name }]),
    )

    const byCreative = new Map<
      string,
      {
        creativeId: string
        creativeName: string
        views: number
        clicks: number
        leads: number
        sales: number
      }
    >()
    for (const d of deployments) {
      const entry = byCreative.get(d.creativeId) ?? {
        creativeId: d.creativeId,
        creativeName: d.creative.name,
        views: 0,
        clicks: 0,
        leads: 0,
        sales: 0,
      }
      entry.views += d.impressions
      entry.clicks += d.clicks
      byCreative.set(d.creativeId, entry)
    }
    for (const a of adUnits) {
      const entry = byCreative.get(a.creativeId) ?? {
        creativeId: a.creativeId,
        creativeName: a.creative.name,
        views: 0,
        clicks: 0,
        leads: 0,
        sales: 0,
      }
      entry.views += a.impressions
      entry.clicks += a.clicks
      byCreative.set(a.creativeId, entry)
    }

    // AdRun has no creativeId of its own (its content comes from Advertisement -> Asset via
    // AdvertisementAsset, not the old Creative model) — deliberately not forced into byCreative's
    // Creative-shaped rows. It does have a real platform, so it merges into byPlatform below like
    // any other source. A future pass can add a parallel byAdvertisement breakdown if needed.
    const adRunToPlatform = new Map(adRuns.map((r) => [r.id, r.platform as string]))

    const byPlatform = new Map<
      string,
      { platform: string; spend: number; leads: number; sales: number }
    >()
    for (const d of deployments) {
      const entry = byPlatform.get(d.platform) ?? {
        platform: d.platform,
        spend: 0,
        leads: 0,
        sales: 0,
      }
      entry.spend += Number(d.spend)
      byPlatform.set(d.platform, entry)
    }
    for (const r of adRuns) {
      const entry = byPlatform.get(r.platform) ?? {
        platform: r.platform,
        spend: 0,
        leads: 0,
        sales: 0,
      }
      entry.spend += Number(r.spend)
      byPlatform.set(r.platform, entry)
    }
    if (adUnits.length) {
      byPlatform.set(
        'LOOPIE',
        byPlatform.get('LOOPIE') ?? { platform: 'LOOPIE', spend: 0, leads: 0, sales: 0 },
      )
    }

    for (const row of leadsByDeployment) {
      if (!row.sourceDeploymentId) continue
      const creative = deploymentToCreative.get(row.sourceDeploymentId)
      if (creative) byCreative.get(creative.id)!.leads += row._count._all
      const platform = deploymentToPlatform.get(row.sourceDeploymentId)
      if (platform) byPlatform.get(platform)!.leads += row._count._all
    }
    for (const row of salesByDeployment) {
      if (!row.sourceDeploymentId) continue
      const creative = deploymentToCreative.get(row.sourceDeploymentId)
      if (creative) byCreative.get(creative.id)!.sales += row._count._all
      const platform = deploymentToPlatform.get(row.sourceDeploymentId)
      if (platform) byPlatform.get(platform)!.sales += row._count._all
    }
    for (const row of leadsByAdUnit) {
      if (!row.sourceAdUnitId) continue
      const creative = adUnitToCreative.get(row.sourceAdUnitId)
      if (creative) byCreative.get(creative.id)!.leads += row._count._all
      byPlatform.get('LOOPIE')!.leads += row._count._all
    }
    for (const row of salesByAdUnit) {
      if (!row.sourceAdUnitId) continue
      const creative = adUnitToCreative.get(row.sourceAdUnitId)
      if (creative) byCreative.get(creative.id)!.sales += row._count._all
      byPlatform.get('LOOPIE')!.sales += row._count._all
    }
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

    const byLandingPage = await this._landingPagePerformanceForCampaign(
      businessId,
      deployments,
      adUnits,
      adRuns,
    )

    return {
      spend,
      views,
      clicks,
      leads,
      sales,
      revenue,
      cpl,
      byCreative: Array.from(byCreative.values()),
      byPlatform: Array.from(byPlatform.values()),
      byLandingPage,
    }
  }

  private async _landingPagePerformanceForCampaign(
    businessId: string,
    deployments: { destinationLandingPageId: string | null }[],
    adUnits: { destinationLandingPageId: string | null }[],
    adRuns: { destinationLandingPageId: string | null }[],
  ) {
    const landingPageIds = [
      ...new Set(
        [...deployments, ...adUnits, ...adRuns]
          .map((d) => d.destinationLandingPageId)
          .filter((v): v is string => !!v),
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
