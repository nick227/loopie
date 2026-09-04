import type { Prisma } from '@prisma/client'
import {
  SYSTEM_LEAD_GEN_TEMPLATE_ID,
  SYSTEM_LEAD_GEN_SCHEMA,
  starterContentForTemplate,
  DEFAULT_PAGE_THEME,
} from '@project/db'
import { snapshotForm } from '@project/page-renderer'
import { CONTACT_FORM_FIELDS } from './contactForm'
import { ensureSystemTemplates } from './ensureSystemTemplates'

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
  await ensureSystemTemplates(tx)

  const form = await tx.form.create({
    data: {
      businessId: input.businessId,
      name: 'Contact',
      submitLabel: 'Request a callback',
      successMessage: "Thanks — we'll be in touch.",
      fields: { create: CONTACT_FORM_FIELDS },
    },
  })

  let slug = slugify(input.businessName)
  const clash = await tx.landingPage.findUnique({ where: { slug } })
  if (clash) slug = `${slug}-${input.businessId.slice(-6).toLowerCase()}`

  const content = starterContentForTemplate(
    SYSTEM_LEAD_GEN_SCHEMA,
    input.businessName,
  ) as Prisma.InputJsonValue

  const page = await tx.landingPage.create({
    data: {
      businessId: input.businessId,
      templateId: SYSTEM_LEAD_GEN_TEMPLATE_ID,
      formId: form.id,
      name: 'Home',
      slug,
      content,
      theme: DEFAULT_PAGE_THEME,
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
        {
          placement: 'AFTER_HERO',
          sortOrder: 0,
          context: 'CONTAINED',
          adRunIds: [],
          advertisementIds: [],
          items: [],
        },
        {
          placement: 'BEFORE_FORM',
          sortOrder: 1,
          context: 'CONTAINED',
          adRunIds: [],
          advertisementIds: [],
          items: [],
        },
      ],
      schemaSnapshot: SYSTEM_LEAD_GEN_SCHEMA as Prisma.InputJsonValue,
    },
  })
  await tx.landingPage.update({
    where: { id: page.id },
    data: { status: 'PUBLISHED', publishedVersionId: version.id },
  })
  return page
}
