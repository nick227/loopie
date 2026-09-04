import type { Campaign, LandingPage } from '@prisma/client'
import type { BusinessService } from '../services/BusinessService'
import type { AssistantChoiceStep } from '../business-guidance/types'
import type { GrowDirection } from '../business-guidance/phaseEngine'

// Matches CORPORATE_PROFESSIONAL_TEMPLATE_ID in
// apps/web/src/pages/landing-pages/components/types.ts — the same seeded system template
// PagesStartRow.tsx's "Homepage" tile already uses.
export const HOMEPAGE_TEMPLATE_ID = 'system-template-corporate-professional'

type BusinessDTO = Awaited<ReturnType<BusinessService['get']>>

export interface AssistantFieldSpec {
  name: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'email' | 'phone'
  required: boolean
}

// The cross-product operator's action union. Each resolver below is a pure function — no Prisma,
// no side effects — so the priority chain is unit-testable without a DB and AssistantService.ts
// stays the one place raw Prisma queries live (its existing precedent). CRM/Messaging are
// deliberately not members yet: an enum value the server never returns is dead surface area for
// SDK consumers, not future-proofing — add them in the pass that actually implements them.
export type AssistantAction =
  | {
      type: 'BUSINESS_PROFILE'
      actionId: 'business_info'
      operationId: 'updateBusiness'
      fields: AssistantFieldSpec[]
    }
  | { type: 'BUSINESS_PROFILE'; actionId: 'business_logo'; operationId: 'updateBusiness' }
  | { type: 'PAGE'; actionId: 'homepage_create'; operationId: 'createLandingPage' }
  | {
      type: 'PAGE'
      actionId: 'homepage_publish'
      operationId: 'publishLandingPage'
      landingPageId: string
    }
  | {
      type: 'PAGE'
      actionId: 'page_publish'
      operationId: 'publishLandingPage'
      landingPageId: string
      pageName: string
    }
  | {
      type: 'ADVERTISING'
      actionId: 'campaign_create'
      operationId: 'createCampaign'
      landingPageId: string
      pageName: string
      pageUrl: string
    }
  | { type: 'ADVERTISING'; actionId: 'campaign_resume'; operationId: null; campaignId: string }
  | { type: 'CALENDAR'; actionId: 'calendar'; operationId: null }
  // ---------- Assistant business-consultant pass (2026-09-04) ----------
  // Learn -> Act -> Review -> Grow (see apps/server/src/business-guidance/). Content
  // (headings/choices/computed numbers) travels in the DTO itself, unlike the static per-actionId
  // copy above — this content is inherently dynamic (varies by taxonomy node/playbook/live
  // quantities), so the frontend renders it generically instead of looking it up by actionId.
  // cycleId is null only for the very first learn_step (venture_family) — no AssistantGoalCycle
  // row exists yet until a primaryGoal is answered (see AssistantGoalCycleService.answer).
  | {
      type: 'GOAL_CYCLE'
      actionId: 'learn_step'
      operationId: null
      cycleId: string | null
      step: AssistantChoiceStep
      // Ordered label trail of everything already established this cycle (e.g. ["Local
      // service", "Home services", "Roofing"]) — cumulative progress without a question-count/
      // percentage, which the docs explicitly avoid since known facts get skipped and the total
      // isn't knowable in advance.
      knownFacts: string[]
    }
  | {
      type: 'GOAL_CYCLE'
      actionId: 'build_plan'
      operationId: null
      cycleId: string
      plan: PlannedTaskDTO[]
    }
  | {
      type: 'GOAL_CYCLE'
      actionId: 'grow'
      operationId: null
      cycleId: string
      growSummary: GrowSummaryDTO
    }
  | {
      type: 'SIGNAL'
      actionId: 'page_traffic_no_leads' | 'interested_leads_followup' | 'sale_recorded'
      operationId: null
      cycleId: string
      signalSummary: SignalSummaryDTO
    }

export type PlannedTaskDTO = {
  templateId: string
  title: string
  horizon: 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK'
}
export type GrowSummaryDTO = {
  headline: string
  detail?: string
  directions: { value: GrowDirection; label: string }[]
}
export type SignalSummaryDTO = {
  headline: string
  detail?: string
  actionLabel: string
  actionTarget: string | null
}

// Shared flattening of the discriminated AssistantAction union into one flat DTO object — used by
// both AssistantService.getNextAction and the assistant-goal-cycle mutation handlers, so every
// endpoint that can return "the next assistant action" returns the identical shape.
export function flattenAssistantAction(action: AssistantAction, homepageUrl: string | null) {
  return {
    type: action.type,
    actionId: action.actionId,
    operationId: action.operationId,
    fields: 'fields' in action ? action.fields : null,
    landingPageId: 'landingPageId' in action ? action.landingPageId : null,
    pageName: 'pageName' in action ? action.pageName : null,
    pageUrl: 'pageUrl' in action ? action.pageUrl : null,
    campaignId: 'campaignId' in action ? action.campaignId : null,
    cycleId: 'cycleId' in action ? action.cycleId : null,
    step: 'step' in action ? action.step : null,
    knownFacts: 'knownFacts' in action ? action.knownFacts : null,
    plan: 'plan' in action ? action.plan : null,
    growSummary: 'growSummary' in action ? action.growSummary : null,
    signalSummary: 'signalSummary' in action ? action.signalSummary : null,
    homepageUrl,
  }
}

// Beyond name (enforced product-wide), the assistant treats these as its own minimal "complete
// enough" identity — the product itself treats all of them as optional profile polish (see
// BusinessIdentityForm.tsx, only `name` has a required marker), so this is the assistant asking
// for a bit more than the product strictly requires, not new product-wide required-ness.
const CORE_BUSINESS_FIELDS: { key: keyof BusinessDTO; spec: AssistantFieldSpec }[] = [
  { key: 'industry', spec: { name: 'industry', label: 'Industry', type: 'text', required: true } },
  { key: 'location', spec: { name: 'location', label: 'Location', type: 'text', required: true } },
  { key: 'phone', spec: { name: 'phone', label: 'Phone', type: 'phone', required: true } },
  { key: 'email', spec: { name: 'email', label: 'Email', type: 'email', required: true } },
  {
    key: 'description',
    spec: { name: 'description', label: 'About your business', type: 'textarea', required: true },
  },
]

export function resolveBusinessProfileAction(business: BusinessDTO): AssistantAction | null {
  const missing = CORE_BUSINESS_FIELDS.filter((f) => !business[f.key]).map((f) => f.spec)
  if (missing.length) {
    return {
      type: 'BUSINESS_PROFILE',
      actionId: 'business_info',
      operationId: 'updateBusiness',
      fields: missing,
    }
  }
  if (!business.logoUrl) {
    return { type: 'BUSINESS_PROFILE', actionId: 'business_logo', operationId: 'updateBusiness' }
  }
  return null
}

export function resolvePageAction(
  homepage: LandingPage | null,
  otherDraft: LandingPage | null,
): AssistantAction | null {
  if (!homepage) {
    return { type: 'PAGE', actionId: 'homepage_create', operationId: 'createLandingPage' }
  }
  if (homepage.status !== 'PUBLISHED') {
    return {
      type: 'PAGE',
      actionId: 'homepage_publish',
      operationId: 'publishLandingPage',
      landingPageId: homepage.id,
    }
  }
  if (otherDraft) {
    return {
      type: 'PAGE',
      actionId: 'page_publish',
      operationId: 'publishLandingPage',
      landingPageId: otherDraft.id,
      pageName: otherDraft.name,
    }
  }
  return null
}

export function resolveAdvertisingAction(
  draftCampaignNeedingCreatives: Campaign | null,
  unpromotedPublishedPage: { id: string; name: string; url: string } | null,
): AssistantAction | null {
  if (draftCampaignNeedingCreatives) {
    return {
      type: 'ADVERTISING',
      actionId: 'campaign_resume',
      operationId: null,
      campaignId: draftCampaignNeedingCreatives.id,
    }
  }
  if (unpromotedPublishedPage) {
    return {
      type: 'ADVERTISING',
      actionId: 'campaign_create',
      operationId: 'createCampaign',
      landingPageId: unpromotedPublishedPage.id,
      pageName: unpromotedPublishedPage.name,
      pageUrl: unpromotedPublishedPage.url,
    }
  }
  return null
}

// Unconditional fallback — always resolves to something so the assistant never dead-ends. No
// params: Calendar's own board/ideas system (already built, already tested) is queried separately
// by the client via useCalendarBoard(), not duplicated here.
export function resolveCalendarAction(): AssistantAction {
  return { type: 'CALENDAR', actionId: 'calendar', operationId: null }
}
