import type { Prisma } from '@prisma/client'
import {
  SYSTEM_LEAD_GEN_SCHEMA,
  SYSTEM_LEAD_GEN_TEMPLATE_ID,
  SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
  SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
  SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID,
  corporateProfessionalTitle,
  corporateProfessionalDescription,
  corporateProfessionalSchema,
  SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID,
  webinarSignupTitle,
  webinarSignupDescription,
  webinarSignupSchema,
  SYSTEM_STUDIO_TEMPLATE_ID,
  studioTitle,
  studioDescription,
  studioSchema,
  SYSTEM_PORTFOLIO_TEMPLATE_ID,
  portfolioTitle,
  portfolioDescription,
  portfolioSchema,
  SYSTEM_STORE_TEMPLATE_ID,
  storeTitle,
  storeDescription,
  storeSchema,
  SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID,
  emailOutreachTitle,
  emailOutreachDescription,
  emailOutreachSchema,
  SYSTEM_GENERAL_TEMPLATE_ID,
  generalTitle,
  generalDescription,
  generalSchema,
  ensureCatalogVocabulary,
  ensurePageTypeCapabilityMatrix,
  ensurePageLayoutContract,
  type PageTypeKey,
} from '@project/db'
import type { TemplateSchema } from '@project/db'

type TemplateClient = {
  landingPageTemplate: {
    upsert: Prisma.TransactionClient['landingPageTemplate']['upsert']
  }
  capability: Prisma.TransactionClient['capability']
  genre: Prisma.TransactionClient['genre']
  pageTypeCapability: Prisma.TransactionClient['pageTypeCapability']
  pageLayoutCapability: Prisma.TransactionClient['pageLayoutCapability']
  pageLayoutSlotSupport: Prisma.TransactionClient['pageLayoutSlotSupport']
}

// Page Type assignment per Layout — see docs/strategy/pages-page-types-and-style-axes-roadmap.md
// §2.1. Sales page and Email capture share one `renderer` ('standard') but are two distinct
// catalog rows (Layouts) with two different Page Types — PageType is a property of the Layout
// row, not the renderer.
const LAYOUT_PAGE_TYPE: Record<string, PageTypeKey> = {
  [SYSTEM_LEAD_GEN_TEMPLATE_ID]: 'LANDING',
  [SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID]: 'EMAIL_CAPTURE',
  [SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID]: 'HOME',
  [SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID]: 'EVENT',
  [SYSTEM_STUDIO_TEMPLATE_ID]: 'STUDIO',
  // Split from STUDIO 2026-09-10 — see docs/strategy/pages-page-types-and-style-axes-roadmap.md
  // §9. Portfolio has no gallery section and serves a distinct intent; the two only shared a
  // Page Type as an artifact of sharing render code, which is exactly what let the in-editor
  // "Layout" switcher swap a page's entire renderer while claiming to stay the same Page Type.
  [SYSTEM_PORTFOLIO_TEMPLATE_ID]: 'PORTFOLIO',
  [SYSTEM_STORE_TEMPLATE_ID]: 'STORE',
  [SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID]: 'EMAIL_CAPTURE',
  [SYSTEM_GENERAL_TEMPLATE_ID]: 'GENERAL',
}

export async function ensureSystemTemplates(tx: TemplateClient) {
  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_LEAD_GEN_TEMPLATE_ID },
    update: {
      name: 'Sales page',
      description: 'Simple vertical page: offer, proof points, photo, and a contact form.',
      schema: SYSTEM_LEAD_GEN_SCHEMA,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_LEAD_GEN_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Sales page',
      description: 'Simple vertical page: offer, proof points, photo, and a contact form.',
      category: 'lead-gen',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_LEAD_GEN_TEMPLATE_ID],
      formatVersion: '1.0',
      schema: SYSTEM_LEAD_GEN_SCHEMA,
    },
  })

  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID },
    update: {
      name: 'Email capture',
      description: 'Full-height split: image beside a short pitch and signup form.',
      schema: SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Email capture',
      description: 'Full-height split: image beside a short pitch and signup form.',
      category: 'lead-gen',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID],
      formatVersion: '1.0',
      schema: SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
    },
  })

  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID },
    update: {
      name: corporateProfessionalTitle,
      description: corporateProfessionalDescription,
      schema: corporateProfessionalSchema as any,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID,
      isSystem: true,
      name: corporateProfessionalTitle,
      description: corporateProfessionalDescription,
      category: 'advanced',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID],
      formatVersion: '2.0',
      schema: corporateProfessionalSchema as any,
    },
  })

  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID },
    update: {
      name: webinarSignupTitle,
      description: webinarSignupDescription,
      schema: webinarSignupSchema as any,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID,
      isSystem: true,
      name: webinarSignupTitle,
      description: webinarSignupDescription,
      category: 'advanced',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID],
      formatVersion: '2.0',
      schema: webinarSignupSchema as any,
    },
  })

  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_STUDIO_TEMPLATE_ID },
    update: {
      name: studioTitle,
      description: studioDescription,
      schema: studioSchema as any,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_STUDIO_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_STUDIO_TEMPLATE_ID,
      isSystem: true,
      name: studioTitle,
      description: studioDescription,
      category: 'advanced',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_STUDIO_TEMPLATE_ID],
      formatVersion: '2.0',
      schema: studioSchema as any,
    },
  })

  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_PORTFOLIO_TEMPLATE_ID },
    update: {
      name: portfolioTitle,
      description: portfolioDescription,
      schema: portfolioSchema as any,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_PORTFOLIO_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_PORTFOLIO_TEMPLATE_ID,
      isSystem: true,
      name: portfolioTitle,
      description: portfolioDescription,
      category: 'advanced',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_PORTFOLIO_TEMPLATE_ID],
      formatVersion: '2.0',
      schema: portfolioSchema as any,
    },
  })

  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_STORE_TEMPLATE_ID },
    update: {
      name: storeTitle,
      description: storeDescription,
      schema: storeSchema as any,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_STORE_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_STORE_TEMPLATE_ID,
      isSystem: true,
      name: storeTitle,
      description: storeDescription,
      category: 'advanced',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_STORE_TEMPLATE_ID],
      formatVersion: '2.0',
      schema: storeSchema as any,
    },
  })

  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID },
    update: {
      name: emailOutreachTitle,
      description: emailOutreachDescription,
      schema: emailOutreachSchema as any,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID,
      isSystem: true,
      name: emailOutreachTitle,
      description: emailOutreachDescription,
      category: 'advanced',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID],
      formatVersion: '2.0',
      schema: emailOutreachSchema as any,
    },
  })

  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_GENERAL_TEMPLATE_ID },
    update: {
      name: generalTitle,
      description: generalDescription,
      schema: generalSchema as any,
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_GENERAL_TEMPLATE_ID],
    },
    create: {
      id: SYSTEM_GENERAL_TEMPLATE_ID,
      isSystem: true,
      name: generalTitle,
      description: generalDescription,
      category: 'lead-gen',
      pageType: LAYOUT_PAGE_TYPE[SYSTEM_GENERAL_TEMPLATE_ID],
      formatVersion: '1.0',
      schema: generalSchema as any,
    },
  })

  // Phase 0 + Pages Phase 1 (2026-09-10) — see docs/strategy/pages-page-types-and-style-axes-roadmap.md
  // and docs/strategy/pages-and-ads-shared-catalog-boundary.md. Shared vocabulary first (the
  // contract tables below reference Capability by id), then the static PageType matrix, then each
  // Layout's own derived contract. All idempotent upserts, safe to re-run on every call.
  await ensureCatalogVocabulary(tx)
  await ensurePageTypeCapabilityMatrix(tx)
  const layoutSchemas: Array<[string, TemplateSchema]> = [
    [SYSTEM_LEAD_GEN_TEMPLATE_ID, SYSTEM_LEAD_GEN_SCHEMA],
    [SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID, SYSTEM_MEDIA_LEAD_GEN_SCHEMA],
    [SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID, corporateProfessionalSchema],
    [SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID, webinarSignupSchema],
    [SYSTEM_STUDIO_TEMPLATE_ID, studioSchema],
    [SYSTEM_PORTFOLIO_TEMPLATE_ID, portfolioSchema],
    [SYSTEM_STORE_TEMPLATE_ID, storeSchema],
    [SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID, emailOutreachSchema],
    [SYSTEM_GENERAL_TEMPLATE_ID, generalSchema],
  ]
  for (const [templateId, schema] of layoutSchemas) {
    await ensurePageLayoutContract(tx, templateId, schema)
  }
}
