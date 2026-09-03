import type { Campaign, LandingPage } from '@prisma/client'
import type { BusinessService } from '../services/BusinessService'

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
