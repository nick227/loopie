import { db } from '@project/db'
import { BusinessService } from './BusinessService'
import { hostedPageUrl } from '../lib/urls'
import {
  HOMEPAGE_TEMPLATE_ID,
  resolveBusinessProfileAction,
  resolvePageAction,
  resolveAdvertisingAction,
  resolveCalendarAction,
  type AssistantAction,
} from '../lib/assistantActions'
import type { LandingPage } from '@prisma/client'

const businessService = new BusinessService()

function normalizeUrl(url: string) {
  return url.trim().toLowerCase().replace(/\/$/, '')
}

export class AssistantService {
  async getNextAction(businessId: string) {
    const business = await businessService.get(businessId)

    const businessAction = resolveBusinessProfileAction(business)
    if (businessAction) return this.toDTO(businessAction, null)

    const homepage = await db.landingPage.findFirst({
      where: { businessId, templateId: HOMEPAGE_TEMPLATE_ID, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    const otherDraft =
      homepage?.status === 'PUBLISHED'
        ? await db.landingPage.findFirst({
            where: {
              businessId,
              deletedAt: null,
              status: 'DRAFT',
              templateId: { not: HOMEPAGE_TEMPLATE_ID },
            },
            orderBy: { createdAt: 'desc' },
          })
        : null

    const pageAction = resolvePageAction(homepage, otherDraft)
    if (pageAction) return this.toDTO(pageAction, homepage)

    const draftCampaign = await db.campaign.findFirst({
      where: { businessId, status: 'DRAFT', creativeLinks: { none: {} } },
      orderBy: { createdAt: 'desc' },
    })
    const unpromoted = draftCampaign ? null : await this.findUnpromotedPublishedPage(businessId)

    const adAction = resolveAdvertisingAction(draftCampaign, unpromoted)
    if (adAction) return this.toDTO(adAction, homepage)

    return this.toDTO(resolveCalendarAction(), homepage)
  }

  private async findUnpromotedPublishedPage(businessId: string) {
    const [publishedPages, campaigns] = await Promise.all([
      db.landingPage.findMany({
        where: { businessId, deletedAt: null, status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
      }),
      db.campaign.findMany({
        where: { businessId, destinationUrl: { not: null } },
        select: { destinationUrl: true },
      }),
    ])
    const promoted = new Set(campaigns.map((c) => normalizeUrl(c.destinationUrl!)))
    for (const page of publishedPages) {
      const url = hostedPageUrl(page.slug)
      if (!promoted.has(normalizeUrl(url))) return { id: page.id, name: page.name, url }
    }
    return null
  }

  private toDTO(action: AssistantAction, homepage: LandingPage | null) {
    return {
      type: action.type,
      actionId: action.actionId,
      operationId: action.operationId,
      fields: 'fields' in action ? action.fields : null,
      landingPageId: 'landingPageId' in action ? action.landingPageId : null,
      pageName: 'pageName' in action ? action.pageName : null,
      pageUrl: 'pageUrl' in action ? action.pageUrl : null,
      campaignId: 'campaignId' in action ? action.campaignId : null,
      homepageUrl: homepage?.status === 'PUBLISHED' ? hostedPageUrl(homepage.slug) : null,
    }
  }
}
