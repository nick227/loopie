import type { Prisma } from '@prisma/client'
import { SYSTEM_LEAD_GEN_TEMPLATE_ID, SYSTEM_LEAD_GEN_SCHEMA } from '@project/db'
import { defaultContentFromSchema } from './renderLandingPage'
import { snapshotForm } from './formSnapshot'

function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return slug || 'page'
}

export async function provisionDefaultPage(
  tx: Prisma.TransactionClient,
  input: { businessId: string; businessName: string },
) {
  await tx.landingPageTemplate.upsert({
    where: { id: SYSTEM_LEAD_GEN_TEMPLATE_ID },
    update: {},
    create: {
      id: SYSTEM_LEAD_GEN_TEMPLATE_ID,
      isSystem: true,
      name: 'Simple Lead Gen',
      description:
        'Hero, feature grid, embedded form, footer — a single-purpose lead capture page.',
      category: 'lead-gen',
      formatVersion: '1.0',
      schema: SYSTEM_LEAD_GEN_SCHEMA,
    },
  })

  const form = await tx.form.create({
    data: {
      businessId: input.businessId,
      name: 'Contact',
      submitLabel: 'Get in touch',
      successMessage: "Thanks — we'll be in touch.",
      fields: {
        create: [
          { label: 'Name', fieldKey: 'name', type: 'TEXT', required: true, order: 0 },
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 1 },
        ],
      },
    },
  })

  let slug = slugify(input.businessName)
  const clash = await tx.landingPage.findUnique({ where: { slug } })
  if (clash) slug = `${slug}-${input.businessId.slice(-6).toLowerCase()}`

  const content = {
    sections: {
      ...(defaultContentFromSchema(SYSTEM_LEAD_GEN_SCHEMA).sections ?? {}),
      hero: {
        hidden: false,
        headline: `Welcome to ${input.businessName}`,
        subheadline: 'Tell us what you need — this page is live and ready for ads.',
        ctaLabel: 'Get in touch',
        ctaLink: '#form',
      },
      footer: { hidden: false, text: input.businessName },
    },
  }

  const page = await tx.landingPage.create({
    data: {
      businessId: input.businessId,
      templateId: SYSTEM_LEAD_GEN_TEMPLATE_ID,
      formId: form.id,
      name: 'Home',
      slug,
      content,
      theme: {
        primaryColor: '#111827',
        backgroundColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
      },
      adSlots: {
        create: [
          { sortOrder: 0, placement: 'AFTER_HERO' },
          { sortOrder: 1, placement: 'BEFORE_FORM' },
        ],
      },
    },
  })

  const formSnapshot = await snapshotForm(tx, form.id)
  const version = await tx.publishedPageVersion.create({
    data: {
      landingPageId: page.id,
      version: 1,
      content,
      theme: page.theme as Prisma.InputJsonValue,
      formId: form.id,
      formSnapshot: formSnapshot as unknown as Prisma.InputJsonValue,
      adSlotSnapshot: [
        { placement: 'AFTER_HERO', sortOrder: 0, adUnitId: null, embedUrl: null },
        { placement: 'BEFORE_FORM', sortOrder: 1, adUnitId: null, embedUrl: null },
      ],
    },
  })
  await tx.landingPage.update({
    where: { id: page.id },
    data: { status: 'PUBLISHED', publishedVersionId: version.id },
  })
  return page
}
