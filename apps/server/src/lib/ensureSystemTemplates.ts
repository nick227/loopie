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
      name: 'Sales page',
      description: 'Vertical sales landing page: hero, photograph, proof, form, footer.',
      schema: SYSTEM_LEAD_GEN_SCHEMA,
    },
    create: {
      id: SYSTEM_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Sales page',
      description: 'Vertical sales landing page: hero, photograph, proof, form, footer.',
      category: 'lead-gen',
      formatVersion: '1.0',
      schema: SYSTEM_LEAD_GEN_SCHEMA,
    },
  })
  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID },
    update: {
      name: 'Email capture',
      description: 'Two-column email capture: image on the left, pitch and email on the right.',
      schema: SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
    },
    create: {
      id: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Email capture',
      description: 'Two-column email capture: image on the left, pitch and email on the right.',
      category: 'lead-gen',
      formatVersion: '1.0',
      schema: SYSTEM_MEDIA_LEAD_GEN_SCHEMA,
    },
  })
}
