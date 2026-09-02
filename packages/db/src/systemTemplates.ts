import type { PageContent } from './content'
import {
  SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID,
  corporateProfessionalStarterContent,
} from './data/corporate-professional'
import {
  SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID,
  webinarSignupStarterContent,
} from './data/webinar-signup'
import { SYSTEM_STUDIO_TEMPLATE_ID, studioStarterContent } from './data/studio'

// One lookup for "does this system template have rich starter content to seed at creation time"
// — grows by adding an entry here, not by adding another if/else branch at the call site
// (LandingPageService.create()). Templates with no entry fall back to the generic
// starterContentForTemplate(schema, businessName) in leadGenTemplate.ts.
export const SYSTEM_TEMPLATE_STARTER_CONTENT: Record<string, PageContent> = {
  [SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID]: corporateProfessionalStarterContent,
  [SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID]: webinarSignupStarterContent,
  [SYSTEM_STUDIO_TEMPLATE_ID]: studioStarterContent,
}
