import { db } from '@project/db'

export class CampaignPerformanceService {
  async getPerformance(businessId: string, campaignId: string) {
    const campaign = await db.campaign.findFirst({ where: { id: campaignId, businessId } })
    if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }

    const [deployments, adUnits] = await Promise.all([
      db.deployment.findMany({
        where: { campaignId: campaign.id },
        include: { creative: { select: { name: true } } },
      }),
      db.adUnit.findMany({
        where: { campaignId: campaign.id },
        include: { creative: { select: { name: true } } },
      }),
    ])

    const spend = deployments.reduce((sum, d) => sum + Number(d.spend), 0)
    const views =
      deployments.reduce((sum, d) => sum + d.impressions, 0) +
      adUnits.reduce((sum, a) => sum + a.impressions, 0)
    const clicks =
      deployments.reduce((sum, d) => sum + d.clicks, 0) +
      adUnits.reduce((sum, a) => sum + a.clicks, 0)
    const deploymentIds = deployments.map((d) => d.id)
    const adUnitIds = adUnits.map((a) => a.id)

    const [
      leadsD,
      salesD,
      revenueD,
      leadsByDeployment,
      salesByDeployment,
      leadsA,
      salesA,
      revenueA,
      leadsByAdUnit,
      salesByAdUnit,
    ] = await Promise.all([
      db.lead.count({ where: { businessId, sourceDeploymentId: { in: deploymentIds } } }),
      db.sale.count({ where: { businessId, sourceDeploymentId: { in: deploymentIds } } }),
      db.sale.aggregate({
        where: { businessId, sourceDeploymentId: { in: deploymentIds } },
        _sum: { amount: true },
      }),
      db.lead.groupBy({
        by: ['sourceDeploymentId'],
        where: { businessId, sourceDeploymentId: { in: deploymentIds } },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceDeploymentId'],
        where: { businessId, sourceDeploymentId: { in: deploymentIds } },
        _count: { _all: true },
      }),
      db.lead.count({ where: { businessId, sourceAdUnitId: { in: adUnitIds } } }),
      db.sale.count({ where: { businessId, sourceAdUnitId: { in: adUnitIds } } }),
      db.sale.aggregate({
        where: { businessId, sourceAdUnitId: { in: adUnitIds } },
        _sum: { amount: true },
      }),
      db.lead.groupBy({
        by: ['sourceAdUnitId'],
        where: { businessId, sourceAdUnitId: { in: adUnitIds } },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceAdUnitId'],
        where: { businessId, sourceAdUnitId: { in: adUnitIds } },
        _count: { _all: true },
      }),
    ])

    const leads = leadsD + leadsA
    const sales = salesD + salesA
    const revenue = Number(revenueD._sum.amount ?? 0) + Number(revenueA._sum.amount ?? 0)
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

    const byLandingPage = await this._landingPagePerformanceForCampaign(
      businessId,
      deployments,
      adUnits,
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
  ) {
    const landingPageIds = [
      ...new Set(
        [...deployments, ...adUnits]
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
        const leadIds = submissionRows.map((r) => r.leadId).filter((v): v is string => !!v)
        const sales = await db.sale.count({ where: { businessId, leadId: { in: leadIds } } })

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
