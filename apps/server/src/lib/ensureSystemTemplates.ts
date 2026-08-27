import type { Prisma } from '@prisma/client'
import {
  SYSTEM_LEAD_GEN_SCHEMA,
  SYSTEM_LEAD_GEN_TEMPLATE_ID,
  SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
  SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
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
      name: 'Simple Lead Gen',
      description:
        'Hero, photograph, feature grid, form, footer — a single-purpose lead capture page.',
      schema: SYSTEM_LEAD_GEN_SCHEMA,
    },
    create: {
      id: SYSTEM_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Simple Lead Gen',
      description:
        'Hero, photograph, feature grid, form, footer — a single-purpose lead capture page.',
      category: 'lead-gen',
      formatVersion: '1.0',
      schema: SYSTEM_LEAD_GEN_SCHEMA,
    },
  })
  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID },
    update: {
      name: 'Lead gen with media',
      description: 'Hero, image, audio, YouTube, form, and footer — media slots on a lead page.',
      schema: SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
    },
    create: {
      id: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Lead gen with media',
      description: 'Hero, image, audio, YouTube, form, and footer — media slots on a lead page.',
      category: 'lead-gen',
      formatVersion: '1.0',
      schema: SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
    },
  })
}
