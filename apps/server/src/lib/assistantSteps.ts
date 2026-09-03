import type { LandingPage } from '@prisma/client'
import type { BusinessService } from '../services/BusinessService'

// Matches CORPORATE_PROFESSIONAL_TEMPLATE_ID in
// apps/web/src/pages/landing-pages/components/types.ts — the same seeded system template
// PagesStartRow.tsx's "Homepage" tile already uses.
export const HOMEPAGE_TEMPLATE_ID = 'system-template-corporate-professional'

type BusinessDTO = Awaited<ReturnType<BusinessService['get']>>

export interface AssistantState {
  business: BusinessDTO
  homepage: LandingPage | null
}

export type AssistantActionId =
  'business_info' | 'business_logo' | 'homepage_create' | 'homepage_publish'

export interface AssistantFieldSpec {
  name: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'email' | 'phone'
  required: boolean
}

interface AssistantStepDef {
  actionId: AssistantActionId
  operationId: 'updateBusiness' | 'createLandingPage' | 'publishLandingPage'
  question: string
  isComplete: (state: AssistantState) => boolean
  getFields?: (state: AssistantState) => AssistantFieldSpec[]
}

const BUSINESS_INFO_FIELDS: { key: keyof BusinessDTO; spec: AssistantFieldSpec }[] = [
  { key: 'name', spec: { name: 'name', label: 'Business name', type: 'text', required: true } },
  { key: 'industry', spec: { name: 'industry', label: 'Industry', type: 'text', required: true } },
  { key: 'location', spec: { name: 'location', label: 'Location', type: 'text', required: true } },
]

export const ASSISTANT_STEPS: AssistantStepDef[] = [
  {
    actionId: 'business_info',
    operationId: 'updateBusiness',
    question: "Let's set up your business info",
    isComplete: (s) => BUSINESS_INFO_FIELDS.every((f) => !!s.business[f.key]),
    getFields: (s) => BUSINESS_INFO_FIELDS.filter((f) => !s.business[f.key]).map((f) => f.spec),
  },
  {
    actionId: 'business_logo',
    operationId: 'updateBusiness',
    question: 'Add your logo',
    isComplete: (s) => !!s.business.logoUrl,
  },
  {
    actionId: 'homepage_create',
    operationId: 'createLandingPage',
    question: 'Create your homepage',
    isComplete: (s) => !!s.homepage,
  },
  {
    actionId: 'homepage_publish',
    operationId: 'publishLandingPage',
    question: 'Publish your homepage',
    isComplete: (s) => s.homepage?.status === 'PUBLISHED',
  },
]
