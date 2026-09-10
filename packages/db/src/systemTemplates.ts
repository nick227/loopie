import type { PageContent } from './content'
import type { StarterPageBusiness } from './starterPageBusiness'
import {
  SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID,
  corporateProfessionalStarterContent,
} from './data/corporate-professional'
import {
  SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID,
  webinarSignupStarterContent,
} from './data/webinar-signup'
import { SYSTEM_STUDIO_TEMPLATE_ID, studioStarterContent } from './data/studio'
import { SYSTEM_PORTFOLIO_TEMPLATE_ID, portfolioStarterContent } from './data/portfolio'
import { SYSTEM_STORE_TEMPLATE_ID, storeStarterContent } from './data/store'
import {
  SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID,
  emailOutreachStarterContent,
} from './data/email-outreach'
import { SYSTEM_GENERAL_TEMPLATE_ID, generalStarterContent } from './data/general'

// One lookup for "does this system template have rich starter content to seed at creation time"
// — grows by adding an entry here, not by adding another if/else branch at the call site
// (LandingPageService.create()). Templates with no entry fall back to the generic
// starterContentForTemplate(schema, business) in leadGenTemplate.ts. Each entry is a function, not
// a static object — see StarterPageBusiness's own doc comment for why (real business facts
// override generic copy where there's an honest mapping, e.g. nav brand/hero headline).
export const SYSTEM_TEMPLATE_STARTER_CONTENT: Record<
  string,
  (business: StarterPageBusiness) => PageContent
> = {
  [SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID]: corporateProfessionalStarterContent,
  [SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID]: webinarSignupStarterContent,
  [SYSTEM_STUDIO_TEMPLATE_ID]: studioStarterContent,
  [SYSTEM_PORTFOLIO_TEMPLATE_ID]: portfolioStarterContent,
  [SYSTEM_STORE_TEMPLATE_ID]: storeStarterContent,
  [SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID]: emailOutreachStarterContent,
  [SYSTEM_GENERAL_TEMPLATE_ID]: generalStarterContent,
}
