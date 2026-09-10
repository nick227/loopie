import { PrismaClient } from '@prisma/client'
export type * from '@prisma/client'

declare global {
  // `var` is required here, not stylistic — global augmentation only attaches to the actual
  // global object via `var`; `let`/`const` would create a block-scoped binding `global.__db`
  // can't see. Standard Prisma singleton-across-hot-reloads pattern.

  var __db: PrismaClient | undefined
}

export const db = global.__db ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.__db = db
}

export { issueSid, verifySid, resolveVisitorSid } from './signedSid'
export { hashSessionToken, randomSessionToken } from './sessionToken'
export { consumeRateLimit, cleanupExpiredRateLimitBuckets, type RateLimitResult } from './rateLimit'
export { assertTestDatabaseUrl } from './testGuard'
export {
  withSid,
  clickRedirectUrl,
  trackBaseClick,
  isCampaignEnded,
  isAdRunEnded,
} from './tracking'
export { absoluteMediaUrl } from './mediaUrl'
export {
  SYSTEM_LEAD_GEN_TEMPLATE_ID,
  SYSTEM_LEAD_GEN_SCHEMA,
  SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
  SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
  DEFAULT_PAGE_THEME,
  PAGE_THEME_PRESETS,
  MOCK_FEATURE_ITEMS,
  MOCK_STARTER_IMAGE,
  defaultLayoutConfigFromSchema,
  starterContentForTemplate,
  themeFromPreset,
  matchThemePreset,
} from './leadGenTemplate'
export type { PageThemePreset, TemplateSchema, TemplateSectionDef } from './leadGenTemplate'
export {
  PALETTE_OPTIONS,
  TYPOGRAPHY_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_BUNDLES,
  themeFromAxes,
  matchPalette,
  matchTypography,
  matchShape,
  matchBundle,
} from './pageThemes'
export type { PaletteOption, TypographyOption, ShapeOption, StyleBundle } from './pageThemes'
export { parseYoutubeId, youtubeEmbedUrl } from './youtube'
export {
  normalizeLegacyPageContent,
  SECTION_TYPE_TO_SLOT_GROUP,
  KNOWN_SLOT_GROUPS,
  DEFAULT_PAGE_FAVICON_URL,
} from './content'
export type { PageContent, PageBrowserSettings, LayoutConfig, SlotGroupKey } from './content'
export type { StarterPageBusiness } from './starterPageBusiness'
export {
  CAPABILITY_VOCABULARY,
  GENRE_VOCABULARY,
  ensureCatalogVocabulary,
} from './catalogVocabulary'
export type { CapabilityVocabularyEntry } from './catalogVocabulary'
export {
  CAPABILITY_KEYS,
  PAGE_TYPE_KEYS,
  PAGE_TYPE_CAPABILITY_MATRIX,
  deriveLayoutSlotSupport,
  deriveLayoutCapabilitySupport,
  ensurePageTypeCapabilityMatrix,
  ensurePageLayoutContract,
} from './pageCompatibilityCatalog'
export type {
  CapabilityKey,
  PageTypeKey,
  RequirementLevel,
  SupportLevel,
} from './pageCompatibilityCatalog'
export {
  SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID,
  corporateProfessionalTitle,
  corporateProfessionalDescription,
  corporateProfessionalSchema,
  corporateProfessionalStarterContent,
} from './data/corporate-professional'
export {
  SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID,
  webinarSignupTitle,
  webinarSignupDescription,
  webinarSignupSchema,
  webinarSignupStarterContent,
} from './data/webinar-signup'
export {
  SYSTEM_STUDIO_TEMPLATE_ID,
  studioTitle,
  studioDescription,
  studioSchema,
  studioStarterContent,
} from './data/studio'
export {
  SYSTEM_PORTFOLIO_TEMPLATE_ID,
  portfolioTitle,
  portfolioDescription,
  portfolioSchema,
  portfolioStarterContent,
} from './data/portfolio'
export {
  SYSTEM_STORE_TEMPLATE_ID,
  storeTitle,
  storeDescription,
  storeSchema,
  storeStarterContent,
} from './data/store'
export {
  SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID,
  emailOutreachTitle,
  emailOutreachDescription,
  emailOutreachSchema,
  emailOutreachStarterContent,
} from './data/email-outreach'
export {
  SYSTEM_GENERAL_TEMPLATE_ID,
  generalTitle,
  generalDescription,
  generalSchema,
  generalStarterContent,
} from './data/general'
export { SYSTEM_TEMPLATE_STARTER_CONTENT } from './systemTemplates'
export {
  STATIC_GOAL_IDEA_TEMPLATES,
  DYNAMIC_GOAL_IDEA_TEMPLATES,
  type GoalIdeaTemplateSeed,
} from './data/goalIdeas'
