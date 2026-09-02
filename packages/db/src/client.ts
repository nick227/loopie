import { PrismaClient } from '@prisma/client'

declare global {
  // `var` is required here, not stylistic — global augmentation only attaches to the actual
  // global object via `var`; `let`/`const` would create a block-scoped binding `global.__db`
  // can't see. Standard Prisma singleton-across-hot-reloads pattern.
  // eslint-disable-next-line no-var
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
export { parseYoutubeId, youtubeEmbedUrl } from './youtube'
export {
  normalizeLegacyPageContent,
  SECTION_TYPE_TO_SLOT_GROUP,
  KNOWN_SLOT_GROUPS,
} from './content'
export type { PageContent, LayoutConfig, SlotGroupKey } from './content'
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
export { SYSTEM_TEMPLATE_STARTER_CONTENT } from './systemTemplates'
