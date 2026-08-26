import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

const AD_SERVER_URL = process.env.AD_SERVER_URL ?? 'http://localhost:3002'

function toAdUnitDTO(adUnit: any) {
  return {
    id: adUnit.id,
    businessId: adUnit.businessId,
    campaignId: adUnit.campaignId,
    creativeId: adUnit.creativeId,
    format: adUnit.format,
    status: adUnit.status,
    destinationLandingPageId: adUnit.destinationLandingPageId,
    destinationUrl: adUnit.destinationUrl,
    servingConfig: adUnit.servingConfig,
    impressions: adUnit.impressions,
    clicks: adUnit.clicks,
    conversions: adUnit.conversions,
    lastServedAt: adUnit.lastServedAt?.toISOString() ?? null,
    serveUrl: `${AD_SERVER_URL}/embed/${adUnit.id}`,
    createdAt: adUnit.createdAt.toISOString(),
  }
}

// CRUD only — this is account/campaign management and stays in the primary server per the
// architecture brief. Actual serving (impressions, click redirects, embeds) is apps/ad-server,
// a separate deployable process that reads/writes AdUnit rows directly via @project/db.
export class AdUnitService {
  async list(businessId: string, opts: { cursor?: string; limit?: number; campaignId?: string }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (opts.campaignId) AND.push({ campaignId: opts.campaignId })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const adUnits = await db.adUnit.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = adUnits.length > limit
    const items = hasMore ? adUnits.slice(0, limit) : adUnits
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toAdUnitDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    const campaign = await db.campaign.findFirst({ where: { id: data.campaignId, businessId } })
    if (!campaign) throw { statusCode: 404, message: 'Campaign not found' }
    const creative = await db.creative.findFirst({ where: { id: data.creativeId, businessId, deletedAt: null } })
    if (!creative) throw { statusCode: 404, message: 'Creative not found' }
    if (data.destinationLandingPageId) {
      const page = await db.landingPage.findFirst({ where: { id: data.destinationLandingPageId, businessId, deletedAt: null } })
      if (!page) throw { statusCode: 404, message: 'Landing page not found' }
    }

    const adUnit = await db.adUnit.create({
      data: {
        businessId,
        campaignId: data.campaignId,
        creativeId: data.creativeId,
        format: data.format,
        destinationLandingPageId: data.destinationLandingPageId,
        destinationUrl: data.destinationUrl,
        servingConfig: data.servingConfig,
      },
    })
    return toAdUnitDTO(adUnit)
  }

  async get(businessId: string, adUnitId: string) {
    const adUnit = await db.adUnit.findFirst({ where: { id: adUnitId, businessId } })
    if (!adUnit) throw { statusCode: 404, message: 'Ad unit not found' }
    return toAdUnitDTO(adUnit)
  }

  async update(businessId: string, adUnitId: string, data: any) {
    await this.get(businessId, adUnitId)
    if (data.destinationLandingPageId) {
      const page = await db.landingPage.findFirst({ where: { id: data.destinationLandingPageId, businessId, deletedAt: null } })
      if (!page) throw { statusCode: 404, message: 'Landing page not found' }
    }
    const adUnit = await db.adUnit.update({
      where: { id: adUnitId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.destinationLandingPageId !== undefined
          ? { destinationLandingPageId: data.destinationLandingPageId }
          : {}),
        ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl } : {}),
        ...(data.servingConfig !== undefined ? { servingConfig: data.servingConfig } : {}),
      },
    })
    return toAdUnitDTO(adUnit)
  }
}
