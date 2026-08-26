import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { requireCreatives } from '../lib/ownership'
import { createCampaignInventory } from '../lib/campaignInventory'

const INCLUDE = { creativeLinks: true }

function toCampaignDTO(campaign: any) {
  return {
    id: campaign.id,
    businessId: campaign.businessId,
    name: campaign.name,
    budget: Number(campaign.budget),
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate?.toISOString() ?? null,
    destinationUrl: campaign.destinationUrl,
    status: campaign.status,
    platforms: (campaign.platforms as string[] | null) ?? [],
    creativeIds: campaign.creativeLinks?.map((c: any) => c.creativeId) ?? [],
    createdAt: campaign.createdAt.toISOString(),
  }
}

export class CampaignService {
  async list(businessId: string, opts: { cursor?: string; limit?: number; status?: string }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (opts.status) AND.push({ status: opts.status })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const campaigns = await db.campaign.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: INCLUDE,
    })
    const hasMore = campaigns.length > limit
    const items = hasMore ? campaigns.slice(0, limit) : campaigns
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toCampaignDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    await requireCreatives(businessId, data.creativeIds)
    return db.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          businessId,
          name: data.name,
          budget: data.budget,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          destinationUrl: data.destinationUrl,
          platforms: data.platforms,
          status: 'DRAFT',
          creativeLinks: { create: data.creativeIds.map((creativeId: string) => ({ creativeId })) },
        },
        include: INCLUDE,
      })
      await createCampaignInventory(tx, {
        businessId,
        campaignId: campaign.id,
        platforms: data.platforms,
        creativeIds: data.creativeIds,
        destinationUrl: campaign.destinationUrl,
      })
      return toCampaignDTO(campaign)
    })
  }

  async get(businessId: string, campaignId: string) {
    return toCampaignDTO(await this._find(businessId, campaignId))
  }

  async update(businessId: string, campaignId: string, data: any) {
    const current = await this._find(businessId, campaignId)
    if (current.status === 'ENDED') throw { statusCode: 409, message: 'Ended campaigns are frozen' }

    if (data.creativeIds !== undefined) {
      await requireCreatives(businessId, data.creativeIds)
      await db.campaignCreative.deleteMany({ where: { campaignId } })
      await db.campaignCreative.createMany({
        data: data.creativeIds.map((creativeId: string) => ({ campaignId, creativeId })),
      })
    }

    const campaign = await db.campaign.update({
      where: { id: campaignId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.budget !== undefined ? { budget: data.budget } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
        ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl } : {}),
      },
      include: INCLUDE,
    })
    return toCampaignDTO(campaign)
  }

  async pause(businessId: string, campaignId: string) {
    const current = await this._find(businessId, campaignId)
    if (current.status !== 'ACTIVE') throw { statusCode: 409, message: 'Only active campaigns can be paused' }
    await db.deployment.updateMany({ where: { campaignId }, data: { status: 'PAUSED' } })
    await db.adUnit.updateMany({ where: { campaignId }, data: { status: 'PAUSED' } })
    const campaign = await db.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' }, include: INCLUDE })
    return toCampaignDTO(campaign)
  }

  // Also the Draft → Active transition — the spec has no separate "activate" endpoint, and
  // "resume" reads naturally as "make this campaign active" whether it was Draft or Paused.
  async resume(businessId: string, campaignId: string) {
    const current = await this._find(businessId, campaignId)
    if (current.status !== 'DRAFT' && current.status !== 'PAUSED') {
      throw { statusCode: 409, message: 'Only draft or paused campaigns can be activated' }
    }
    await db.deployment.updateMany({ where: { campaignId }, data: { status: 'ACTIVE' } })
    await db.adUnit.updateMany({
      where: { campaignId, status: { in: ['DRAFT', 'PAUSED'] } },
      data: { status: 'ACTIVE' },
    })
    const campaign = await db.campaign.update({ where: { id: campaignId }, data: { status: 'ACTIVE' }, include: INCLUDE })
    return toCampaignDTO(campaign)
  }

  async end(businessId: string, campaignId: string) {
    const current = await this._find(businessId, campaignId)
    if (current.status === 'ENDED') throw { statusCode: 409, message: 'Campaign already ended' }
    await db.deployment.updateMany({ where: { campaignId }, data: { status: 'ENDED' } })
    await db.adUnit.updateMany({ where: { campaignId }, data: { status: 'ENDED' } })
    const campaign = await db.campaign.update({ where: { id: campaignId }, data: { status: 'ENDED' }, include: INCLUDE })
    return toCampaignDTO(campaign)
  }

  async duplicate(businessId: string, campaignId: string) {
    const current = await this._find(businessId, campaignId)
    const creativeIds = current.creativeLinks.map((c: any) => c.creativeId)
    const platforms = (current.platforms as string[] | null) ?? []
    const duplicate = await db.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          businessId,
          name: `${current.name} (copy)`,
          budget: current.budget,
          startDate: current.startDate,
          endDate: current.endDate,
          destinationUrl: current.destinationUrl,
          platforms: current.platforms as Prisma.InputJsonValue,
          status: 'DRAFT',
          duplicatedFromId: current.id,
          creativeLinks: { create: creativeIds.map((creativeId: string) => ({ creativeId })) },
        },
        include: INCLUDE,
      })
      await createCampaignInventory(tx, {
        businessId,
        campaignId: created.id,
        platforms,
        creativeIds,
        destinationUrl: created.destinationUrl,
      })
      const sourceUnits = await tx.adUnit.findMany({ where: { campaignId: current.id } })
      if (sourceUnits.length && !platforms.includes('LOOPIE')) {
        await tx.adUnit.createMany({
          data: sourceUnits.map((unit) => ({
            businessId,
            campaignId: created.id,
            creativeId: unit.creativeId,
            format: unit.format,
            status: 'DRAFT',
            destinationLandingPageId: unit.destinationLandingPageId,
            destinationUrl: unit.destinationUrl,
            servingConfig: unit.servingConfig === null ? undefined : (unit.servingConfig as Prisma.InputJsonValue),
          })),
        })
      }
      return created
    })
    return toCampaignDTO(duplicate)
  }

  // Rolls up Landing Page -> Creative -> Campaign -> Platform, blending external Deployments
  // and first-party AdUnits into one view. AdUnits report under a synthetic 'LOOPIE' platform
  // row (see the Platform enum) rather than requiring the business to add it to
  // campaign.platforms manually.
  async performance(businessId: string, campaignId: string) {
    const campaign = await this._find(businessId, campaignId)
    const [deployments, adUnits] = await Promise.all([
      db.deployment.findMany({ where: { campaignId: campaign.id }, include: { creative: { select: { name: true } } } }),
      db.adUnit.findMany({ where: { campaignId: campaign.id }, include: { creative: { select: { name: true } } } }),
    ])

    const spend = deployments.reduce((sum, d) => sum + Number(d.spend), 0)
    const views = deployments.reduce((sum, d) => sum + d.impressions, 0) + adUnits.reduce((sum, a) => sum + a.impressions, 0)
    const clicks = deployments.reduce((sum, d) => sum + d.clicks, 0) + adUnits.reduce((sum, a) => sum + a.clicks, 0)
    const deploymentIds = deployments.map((d) => d.id)
    const adUnitIds = adUnits.map((a) => a.id)

    const [
      leadsD, salesD, revenueD, leadsByDeployment, salesByDeployment,
      leadsA, salesA, revenueA, leadsByAdUnit, salesByAdUnit,
    ] = await Promise.all([
      db.lead.count({ where: { businessId, sourceDeploymentId: { in: deploymentIds } } }),
      db.sale.count({ where: { businessId, sourceDeploymentId: { in: deploymentIds } } }),
      db.sale.aggregate({ where: { businessId, sourceDeploymentId: { in: deploymentIds } }, _sum: { amount: true } }),
      db.lead.groupBy({ by: ['sourceDeploymentId'], where: { businessId, sourceDeploymentId: { in: deploymentIds } }, _count: { _all: true } }),
      db.sale.groupBy({ by: ['sourceDeploymentId'], where: { businessId, sourceDeploymentId: { in: deploymentIds } }, _count: { _all: true } }),
      db.lead.count({ where: { businessId, sourceAdUnitId: { in: adUnitIds } } }),
      db.sale.count({ where: { businessId, sourceAdUnitId: { in: adUnitIds } } }),
      db.sale.aggregate({ where: { businessId, sourceAdUnitId: { in: adUnitIds } }, _sum: { amount: true } }),
      db.lead.groupBy({ by: ['sourceAdUnitId'], where: { businessId, sourceAdUnitId: { in: adUnitIds } }, _count: { _all: true } }),
      db.sale.groupBy({ by: ['sourceAdUnitId'], where: { businessId, sourceAdUnitId: { in: adUnitIds } }, _count: { _all: true } }),
    ])

    const leads = leadsD + leadsA
    const sales = salesD + salesA
    const revenue = Number(revenueD._sum.amount ?? 0) + Number(revenueA._sum.amount ?? 0)
    const cpl = leads > 0 ? spend / leads : null

    const deploymentToCreative = new Map(deployments.map((d) => [d.id, { id: d.creativeId, name: d.creative.name }]))
    const deploymentToPlatform = new Map(deployments.map((d) => [d.id, d.platform as string]))
    const adUnitToCreative = new Map(adUnits.map((a) => [a.id, { id: a.creativeId, name: a.creative.name }]))

    const byCreative = new Map<string, { creativeId: string; creativeName: string; views: number; clicks: number; leads: number; sales: number }>()
    for (const d of deployments) {
      const entry = byCreative.get(d.creativeId) ?? { creativeId: d.creativeId, creativeName: d.creative.name, views: 0, clicks: 0, leads: 0, sales: 0 }
      entry.views += d.impressions
      entry.clicks += d.clicks
      byCreative.set(d.creativeId, entry)
    }
    for (const a of adUnits) {
      const entry = byCreative.get(a.creativeId) ?? { creativeId: a.creativeId, creativeName: a.creative.name, views: 0, clicks: 0, leads: 0, sales: 0 }
      entry.views += a.impressions
      entry.clicks += a.clicks
      byCreative.set(a.creativeId, entry)
    }

    const byPlatform = new Map<string, { platform: string; spend: number; leads: number; sales: number }>()
    for (const d of deployments) {
      const entry = byPlatform.get(d.platform) ?? { platform: d.platform, spend: 0, leads: 0, sales: 0 }
      entry.spend += Number(d.spend)
      byPlatform.set(d.platform, entry)
    }
    if (adUnits.length) {
      // First-party inventory has no external spend concept — see AdUnit in schema.prisma.
      byPlatform.set('LOOPIE', byPlatform.get('LOOPIE') ?? { platform: 'LOOPIE', spend: 0, leads: 0, sales: 0 })
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

    const byLandingPage = await this._landingPagePerformanceForCampaign(businessId, deployments, adUnits)

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

    const pages = await db.landingPage.findMany({ where: { id: { in: landingPageIds }, businessId } })

    return Promise.all(
      pages.map(async (page) => {
        const [views, uniqueSessionRows, submissionRows] = await Promise.all([
          db.pageView.count({ where: { landingPageId: page.id } }),
          db.pageView.findMany({
            where: { landingPageId: page.id, sessionId: { not: null } },
            distinct: ['sessionId'],
            select: { sessionId: true },
          }),
          db.formSubmission.findMany({ where: { landingPageId: page.id }, select: { leadId: true } }),
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

  async _find(businessId: string, campaignId: string) {
    const campaign = await db.campaign.findFirst({ where: { id: campaignId, businessId }, include: INCLUDE })
    if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }
    return campaign
  }
}
