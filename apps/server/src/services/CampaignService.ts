import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { requireCreatives } from '../lib/ownership'
import { reconcileCampaignInventory } from '../lib/campaignInventory'
import { FinanceService } from './FinanceService'
import { CampaignPerformanceService } from './CampaignPerformanceService'

const financeService = new FinanceService()
const performanceService = new CampaignPerformanceService()

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
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
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
      await reconcileCampaignInventory(tx, {
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

  // Reconciles live Deployment/AdUnit inventory whenever creativeIds and/or platforms change —
  // see lib/campaignInventory.ts. Always diffs against the *effective* post-update set (falling
  // back to the campaign's current creatives/platforms for whichever field wasn't sent), so a
  // platforms-only edit still reconciles correctly against the unchanged creative list and vice
  // versa.
  async update(businessId: string, campaignId: string, data: any) {
    const current = await this._find(businessId, campaignId)
    if (current.status === 'ENDED') throw { statusCode: 409, message: 'Ended campaigns are frozen' }

    if (data.creativeIds !== undefined) {
      await requireCreatives(businessId, data.creativeIds)
    }

    const nextCreativeIds: string[] =
      data.creativeIds !== undefined
        ? data.creativeIds
        : current.creativeLinks.map((c: any) => c.creativeId)
    const nextPlatforms: string[] =
      data.platforms !== undefined ? data.platforms : ((current.platforms as string[] | null) ?? [])
    const nextDestinationUrl: string | null =
      data.destinationUrl !== undefined ? data.destinationUrl : current.destinationUrl

    const campaign = await db.$transaction(async (tx) => {
      if (data.creativeIds !== undefined) {
        await tx.campaignCreative.deleteMany({ where: { campaignId } })
        await tx.campaignCreative.createMany({
          data: data.creativeIds.map((creativeId: string) => ({ campaignId, creativeId })),
        })
      }
      const updated = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.budget !== undefined ? { budget: data.budget } : {}),
          ...(data.endDate !== undefined
            ? { endDate: data.endDate ? new Date(data.endDate) : null }
            : {}),
          ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl } : {}),
          ...(data.platforms !== undefined ? { platforms: data.platforms } : {}),
        },
        include: INCLUDE,
      })
      if (data.creativeIds !== undefined || data.platforms !== undefined) {
        await reconcileCampaignInventory(tx, {
          businessId,
          campaignId,
          platforms: nextPlatforms,
          creativeIds: nextCreativeIds,
          destinationUrl: nextDestinationUrl,
        })
      }
      return updated
    })
    return toCampaignDTO(campaign)
  }

  // Deployment/AdUnit status cascades run in the same transaction as the campaign's own status
  // write — a crash partway through must never leave live inventory in a status that disagrees
  // with the campaign it belongs to (e.g. a "paused" campaign with deployments still ACTIVE).
  async pause(businessId: string, campaignId: string) {
    const current = await this._find(businessId, campaignId)
    if (current.status !== 'ACTIVE')
      throw { statusCode: 409, message: 'Only active campaigns can be paused' }
    const campaign = await db.$transaction(async (tx) => {
      await tx.deployment.updateMany({ where: { campaignId }, data: { status: 'PAUSED' } })
      await tx.adUnit.updateMany({ where: { campaignId }, data: { status: 'PAUSED' } })
      return tx.campaign.update({
        where: { id: campaignId },
        data: { status: 'PAUSED' },
        include: INCLUDE,
      })
    })
    return toCampaignDTO(campaign)
  }

  // Also the Draft → Active transition — the spec has no separate "activate" endpoint, and
  // "resume" reads naturally as "make this campaign active" whether it was Draft or Paused.
  async resume(businessId: string, campaignId: string) {
    const current = await this._find(businessId, campaignId)
    if (current.status !== 'DRAFT' && current.status !== 'PAUSED') {
      throw { statusCode: 409, message: 'Only draft or paused campaigns can be activated' }
    }
    const campaign = await db.$transaction(async (tx) => {
      await tx.deployment.updateMany({ where: { campaignId }, data: { status: 'ACTIVE' } })
      await tx.adUnit.updateMany({
        where: { campaignId, status: { in: ['DRAFT', 'PAUSED'] } },
        data: { status: 'ACTIVE' },
      })
      return tx.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
        include: INCLUDE,
      })
    })
    return toCampaignDTO(campaign)
  }

  async end(businessId: string, campaignId: string) {
    const current = await this._find(businessId, campaignId)
    if (current.status === 'ENDED') throw { statusCode: 409, message: 'Campaign already ended' }
    const campaign = await db.$transaction(async (tx) => {
      await tx.deployment.updateMany({ where: { campaignId }, data: { status: 'ENDED' } })
      await tx.adUnit.updateMany({ where: { campaignId }, data: { status: 'ENDED' } })
      return tx.campaign.update({
        where: { id: campaignId },
        data: { status: 'ENDED' },
        include: INCLUDE,
      })
    })
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
      await reconcileCampaignInventory(tx, {
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
            servingConfig:
              unit.servingConfig === null
                ? undefined
                : (unit.servingConfig as Prisma.InputJsonValue),
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
    return performanceService.getPerformance(businessId, campaignId)
  }

  async authorizeBudget(
    businessId: string,
    campaignId: string,
    data: Parameters<FinanceService['authorizeCampaignBudget']>[2],
  ) {
    await this._find(businessId, campaignId)
    return financeService.authorizeCampaignBudget(businessId, campaignId, data)
  }

  async funding(businessId: string, campaignId: string) {
    await this._find(businessId, campaignId)
    return financeService.getCampaignFunding(businessId, campaignId)
  }

  async recordAdSpend(businessId: string, data: Parameters<FinanceService['recordAdSpend']>[1]) {
    return financeService.recordAdSpend(businessId, data)
  }

  async _find(businessId: string, campaignId: string) {
    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, businessId },
      include: INCLUDE,
    })
    if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }
    return campaign
  }
}
