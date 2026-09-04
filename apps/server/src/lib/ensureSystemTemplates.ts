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
} from '@project/db'

type TemplateClient = {
  landingPageTemplate: {
    upsert: Prisma.TransactionClient['landingPageTemplate']['upsert']
  }
}

export async function ensureSystemTemplates(tx: TemplateClient) {
  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_LEAD_GEN_TEMPLATE_ID },
    update: {
      name: 'Sales page',
      description: 'Simple vertical page: offer, proof points, photo, and a contact form.',
      schema: SYSTEM_LEAD_GEN_SCHEMA,
    },
    create: {
      id: SYSTEM_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Sales page',
      description: 'Simple vertical page: offer, proof points, photo, and a contact form.',
      category: 'lead-gen',
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
    },
    create: {
      id: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Email capture',
      description: 'Full-height split: image beside a short pitch and signup form.',
      category: 'lead-gen',
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
    },
    create: {
      id: SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID,
      isSystem: true,
      name: corporateProfessionalTitle,
      description: corporateProfessionalDescription,
      category: 'advanced',
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
    },
    create: {
      id: SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID,
      isSystem: true,
      name: webinarSignupTitle,
      description: webinarSignupDescription,
      category: 'advanced',
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
    },
    create: {
      id: SYSTEM_STUDIO_TEMPLATE_ID,
      isSystem: true,
      name: studioTitle,
      description: studioDescription,
      category: 'advanced',
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
    },
    create: {
      id: SYSTEM_PORTFOLIO_TEMPLATE_ID,
      isSystem: true,
      name: portfolioTitle,
      description: portfolioDescription,
      category: 'advanced',
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
    },
    create: {
      id: SYSTEM_STORE_TEMPLATE_ID,
      isSystem: true,
      name: storeTitle,
      description: storeDescription,
      category: 'advanced',
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
    },
    create: {
      id: SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID,
      isSystem: true,
      name: emailOutreachTitle,
      description: emailOutreachDescription,
      category: 'advanced',
      formatVersion: '2.0',
      schema: emailOutreachSchema as any,
    },
  })
}
