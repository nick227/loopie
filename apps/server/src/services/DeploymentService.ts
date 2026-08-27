import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { trackedDeploymentUrl } from '../lib/urls'
import { requireCreative } from '../lib/ownership'

// Restored after the /campaigns/{campaignId}/deployments* handlers were briefly repointed at
// AdRunService (which expects an advertisementId, not a campaignId, and operates on the adRun/
// advertisement tables) — see CLAUDE.md's Media/Advertisement/AdRun migration audit. Every real
// Deployment row and every attribution/finance FK pointing at one still needs this REST surface.
function toDeploymentDTO(deployment: any) {
  return {
    id: deployment.id,
    campaignId: deployment.campaignId,
    creativeId: deployment.creativeId,
    platform: deployment.platform,
    externalCampaignId: deployment.externalCampaignId,
    externalAdSetId: deployment.externalAdSetId,
    externalAdId: deployment.externalAdId,
    status: deployment.status,
    spend: Number(deployment.spend),
    impressions: deployment.impressions,
    clicks: deployment.clicks,
    conversions: deployment.conversions,
    lastSyncedAt: deployment.lastSyncedAt?.toISOString() ?? null,
    destinationLandingPageId: deployment.destinationLandingPageId ?? null,
    trackedUrl: trackedDeploymentUrl(deployment.id),
    createdAt: deployment.createdAt.toISOString(),
  }
}

export class DeploymentService {
  async list(businessId: string, campaignId: string, opts: { cursor?: string; limit?: number }) {
    await this._findCampaign(businessId, campaignId)
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const deployments = await db.deployment.findMany({
      where: { campaignId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = deployments.length > limit
    const items = hasMore ? deployments.slice(0, limit) : deployments
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toDeploymentDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, campaignId: string, data: any) {
    await this._findCampaign(businessId, campaignId)
    if (data.platform === 'LOOPIE') {
      throw { statusCode: 409, message: 'LOOPIE inventory is created as AdUnits, not Deployments' }
    }
    await requireCreative(businessId, data.creativeId)
    if (data.destinationLandingPageId)
      await this._findLandingPage(businessId, data.destinationLandingPageId)
    const deployment = await db.deployment.create({
      data: {
        campaignId,
        creativeId: data.creativeId,
        platform: data.platform,
        externalCampaignId: data.externalCampaignId,
        externalAdSetId: data.externalAdSetId,
        externalAdId: data.externalAdId,
        destinationLandingPageId: data.destinationLandingPageId,
      },
    })
    return toDeploymentDTO(deployment)
  }

  async get(businessId: string, deploymentId: string) {
    const deployment = await db.deployment.findFirst({
      where: { id: deploymentId, campaign: { businessId } },
    })
    if (!deployment) throw { statusCode: 404, message: 'Deployment not found' }
    return toDeploymentDTO(deployment)
  }

  // Spend/status/metrics may still be entered manually. POST /deployments/{id}/push
  // creates a PAUSED draft on a registered connector when one exists.
  async update(businessId: string, deploymentId: string, data: any) {
    const deployment = await db.deployment.findFirst({
      where: { id: deploymentId, campaign: { businessId } },
    })
    if (!deployment) throw { statusCode: 404, message: 'Deployment not found' }
    if (data.destinationLandingPageId)
      await this._findLandingPage(businessId, data.destinationLandingPageId)

    const updated = await db.deployment.update({
      where: { id: deploymentId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.spend !== undefined ? { spend: data.spend } : {}),
        ...(data.impressions !== undefined ? { impressions: data.impressions } : {}),
        ...(data.clicks !== undefined ? { clicks: data.clicks } : {}),
        ...(data.conversions !== undefined ? { conversions: data.conversions } : {}),
        ...(data.destinationLandingPageId !== undefined
          ? { destinationLandingPageId: data.destinationLandingPageId }
          : {}),
        lastSyncedAt: new Date(),
      },
    })
    return toDeploymentDTO(updated)
  }

  private async _findLandingPage(businessId: string, landingPageId: string) {
    const page = await db.landingPage.findFirst({
      where: { id: landingPageId, businessId, deletedAt: null },
    })
    if (!page) throw { statusCode: 404, message: 'Landing page not found' }
    return page
  }

  private async _findCampaign(businessId: string, campaignId: string) {
    const campaign = await db.campaign.findFirst({ where: { id: campaignId, businessId } })
    if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }
    return campaign
  }
}
