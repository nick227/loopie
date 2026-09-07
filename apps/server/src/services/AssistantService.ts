import { db } from '@project/db'
import { BusinessService } from './BusinessService'
import { AssistantGoalCycleService } from './AssistantGoalCycleService'
import { AssistantConversationService } from './AssistantConversationService'
import { readBusinessKnowledge } from '../business-guidance/knowledge/businessKnowledge'
import type { ConversationCategory } from '../business-guidance/conversation/types'
import { hostedPageUrl } from '../lib/urls'
import {
  HOMEPAGE_TEMPLATE_ID,
  resolveBusinessProfileAction,
  resolvePageAction,
  resolveAdvertisingAction,
  resolveCalendarAction,
  flattenAssistantAction,
  type AssistantAction,
} from '../lib/assistantActions'
import type { LandingPage } from '@prisma/client'

const businessService = new BusinessService()
const assistantGoalCycleService = new AssistantGoalCycleService()
const assistantConversationService = new AssistantConversationService()

function normalizeUrl(url: string) {
  return url.trim().toLowerCase().replace(/\/$/, '')
}

// A signal's client-facing actionId -> the Conversation category it's most relevant to (see
// AssistantConversationService.resolve's signalCategory param). Kept here, not in the
// conversation service, since it's specifically about translating an Action's signal into a
// Conversation hint — the one place both concepts meet.
function conversationCategoryForSignalActionId(actionId: string): ConversationCategory | null {
  switch (actionId) {
    case 'page_traffic_no_leads':
      return 'MARKETING'
    case 'interested_leads_followup':
      return 'SALES'
    case 'sale_recorded':
      return 'RETENTION'
    default:
      return null
  }
}

export class AssistantService {
  // Resolve up to three available actions in priority order, alongside independent advice.
  async getNextAction(businessId: string) {
    const business = await businessService.get(businessId)
    const knowledgeRow = await db.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { knowledge: true, targetAudience: true, location: true },
    })
    const knowledge = readBusinessKnowledge(knowledgeRow)

    const goalCycleResult = await assistantGoalCycleService.resolveAction(businessId)
    const actions: AssistantAction[] = []
    if (goalCycleResult?.type === 'SIGNAL') actions.push(goalCycleResult)

    const businessAction = resolveBusinessProfileAction(business)
    if (businessAction) actions.push(businessAction)
    // Adding a logo is available independently of completing the profile.
    if (businessAction?.actionId === 'business_info' && !business.logoUrl) {
      actions.push({
        type: 'BUSINESS_PROFILE',
        actionId: 'business_logo',
        operationId: 'updateBusiness',
      })
    }

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
    if (pageAction) actions.push(pageAction)

    if (actions.length < 3) {
      const draftCampaign = await db.campaign.findFirst({
        where: { businessId, status: 'DRAFT', creativeLinks: { none: {} } },
        orderBy: { createdAt: 'desc' },
      })
      const unpromoted = draftCampaign ? null : await this.findUnpromotedPublishedPage(businessId)
      const adAction = resolveAdvertisingAction(draftCampaign, unpromoted)
      if (adAction) actions.push(adAction)
    }
    if (goalCycleResult && goalCycleResult.type !== 'SIGNAL') actions.push(goalCycleResult)
    if (!actions.length) actions.push(resolveCalendarAction())
    const visibleActions = actions.slice(0, 3)
    const action = visibleActions[0]!

    const signalCategory =
      action.type === 'SIGNAL' ? conversationCategoryForSignalActionId(action.actionId) : null

    const conversation = await assistantConversationService.resolve(
      businessId,
      knowledge,
      signalCategory,
    )

    return {
      action: this.toDTO(action, homepage),
      actions: visibleActions.map((item) => this.toDTO(item, homepage)),
      conversation,
    }
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
    return flattenAssistantAction(
      action,
      homepage?.status === 'PUBLISHED' ? hostedPageUrl(homepage.slug) : null,
    )
  }
}
