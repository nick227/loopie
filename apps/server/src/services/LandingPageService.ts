import {
  db,
  starterContentForTemplate,
  defaultLayoutConfigFromSchema,
  normalizeLegacyPageContent,
  DEFAULT_PAGE_THEME,
  SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
  SYSTEM_TEMPLATE_STARTER_CONTENT,
  DEFAULT_PAGE_FAVICON_URL,
} from '@project/db'
import type { Prisma } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import {
  hostedPageUrl,
  landingPagePreviewUrl,
  landingPageSubmitUrl,
  PUBLIC_SERVER_URL,
} from '../lib/urls'
import { renderLandingPageHtml } from '@project/page-renderer'
import { nextUniqueLandingPageSlug } from '../lib/landingPageSlug'
import { snapshotForm } from '@project/page-renderer'
import crypto from 'crypto'
import { ACTIVE_SALE_WHERE } from '../lib/salePredicates'
import { snapshotSlots, toSlotDTO } from '../lib/adSlots'
import { CONTACT_FORM_FIELDS, EMAIL_CAPTURE_FIELDS } from '../lib/contactForm'
import { ensureSystemTemplates } from '../lib/ensureSystemTemplates'
import { withResolvedMedia } from '../lib/pageMedia'
import { assertYoutubeUrlsInContent } from '../lib/youtubeContent'

function toLandingPageDTO(
  page: {
    id: string
    businessId: string
    templateId: string
    formId: string | null
    name: string
    slug: string
    customDomain: string | null
    status: string
    content: unknown
    theme: unknown
    layoutConfig: unknown
    publishedVersionId: string | null
    formStartCount: number
    createdAt: Date
    adSlots?: {
      id: string
      sortOrder: number
      placement: string
      context?: string | null
      assignments: {
        id: string
        slotId: string
        adRunId: string | null
        advertisementId: string | null
        status: string
        weight: number
      }[]
    }[]
  },
  submissionCount = 0,
) {
  const slots = (page.adSlots ?? []).map(toSlotDTO)
  return {
    id: page.id,
    businessId: page.businessId,
    templateId: page.templateId,
    formId: page.formId,
    name: page.name,
    slug: page.slug,
    customDomain: page.customDomain,
    status: page.status,
    content: page.content,
    theme: page.theme,
    layoutConfig: page.layoutConfig,
    publishedVersionId: page.publishedVersionId,
    hostedUrl: hostedPageUrl(page.slug),
    previewUrl: landingPagePreviewUrl(page.id),
    formStartCount: page.formStartCount,
    // Real completed submissions, distinct from formStartCount (abandoned attempts count too) —
    // added for the Inbox "Running" panel's Pages card (docs/strategy/03-product-principles.md),
    // which needs the actionable outcome, not the funnel's top of it.
    submissionCount,
    adSlotCount: slots.length,
    slots,
    createdAt: page.createdAt.toISOString(),
  }
}

function toVersionDTO(version: any) {
  return {
    id: version.id,
    landingPageId: version.landingPageId,
    version: version.version,
    content: version.content,
    theme: version.theme,
    layoutConfig: version.layoutConfig ?? null,
    formId: version.formId,
    formSnapshot: version.formSnapshot ?? null,
    publishedAt: version.publishedAt.toISOString(),
    archivedAt: version.archivedAt?.toISOString() ?? null,
  }
}

export async function loadFormForRender(formId: string | null) {
  if (!formId) return null
  const form = await db.form.findFirst({
    where: { id: formId, deletedAt: null },
    include: { fields: { orderBy: { order: 'asc' } } },
  })
  if (!form) return null
  return {
    id: form.id,
    submitLabel: form.submitLabel,
    successMessage: form.successMessage,
    fields: form.fields,
  }
}

export class LandingPageService {
  async list(businessId: string, opts: { cursor?: string; limit?: number; status?: string }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (opts.status) AND.push({ status: opts.status })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const pages = await db.landingPage.findMany({
      where: { businessId, deletedAt: null, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        adSlots: { include: { assignments: true }, orderBy: { sortOrder: 'asc' as const } },
      },
    })
    const hasMore = pages.length > limit
    const items = hasMore ? pages.slice(0, limit) : pages
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null

    // One batched groupBy for the whole page, not N+1 count queries per row.
    const pageIds = items.map((p) => p.id)
    const submissionRows = pageIds.length
      ? await db.formSubmission.groupBy({
          by: ['landingPageId'],
          where: { landingPageId: { in: pageIds } },
          _count: { _all: true },
        })
      : []
    const submissionCountByPageId = new Map(
      submissionRows
        .filter((row): row is typeof row & { landingPageId: string } => row.landingPageId !== null)
        .map((row) => [row.landingPageId, row._count._all]),
    )

    return {
      data: items.map((page) => toLandingPageDTO(page, submissionCountByPageId.get(page.id) ?? 0)),
      meta: { hasMore, nextCursor },
    }
  }

  async create(businessId: string, data: any) {
    await ensureSystemTemplates(db)
    const template = await db.landingPageTemplate.findFirst({
      where: { id: data.templateId, OR: [{ businessId: null }, { businessId }] },
    })
    if (!template) throw { statusCode: 404, message: 'Template not found' }

    const slugClash = await db.landingPage.findUnique({ where: { slug: data.slug } })
    if (slugClash) throw { statusCode: 409, message: 'Slug already in use' }

    if (data.formId) {
      const form = await db.form.findFirst({
        where: { id: data.formId, businessId, deletedAt: null },
      })
      if (!form) throw { statusCode: 404, message: 'Form not found' }
    }
    if (data.content) assertYoutubeUrlsInContent(data.content)

    const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })
    const selectedContent = normalizeLegacyPageContent(
      data.content ??
        SYSTEM_TEMPLATE_STARTER_CONTENT[data.templateId] ??
        starterContentForTemplate(template.schema as never, business.name),
    )
    const initialContent = {
      ...selectedContent,
      browser: {
        title: selectedContent.browser?.title ?? data.name,
        favicon:
          selectedContent.browser?.favicon ??
          (selectedContent.browser?.faviconUrl
            ? { url: selectedContent.browser.faviconUrl }
            : { url: DEFAULT_PAGE_FAVICON_URL }),
        ...(selectedContent.browser?.faviconUrl
          ? { faviconUrl: selectedContent.browser.faviconUrl }
          : {}),
      },
    }
    const page = await db.$transaction(async (tx) => {
      let formId = data.formId as string | undefined
      if (!formId) {
        const emailCapture = data.templateId === SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID
        const form = await tx.form.create({
          data: {
            businessId,
            name: emailCapture ? 'Email capture' : 'Contact',
            submitLabel: emailCapture ? 'Get updates' : 'Get in touch',
            successMessage: "Thanks — we'll be in touch.",
            fields: { create: emailCapture ? EMAIL_CAPTURE_FIELDS : CONTACT_FORM_FIELDS },
          },
        })
        formId = form.id
      }
      return tx.landingPage.create({
        data: {
          businessId,
          templateId: data.templateId,
          formId,
          name: data.name,
          slug: data.slug,
          content: initialContent as never,
          theme: data.theme ?? DEFAULT_PAGE_THEME,
          layoutConfig:
            data.layoutConfig ?? (defaultLayoutConfigFromSchema(template.schema as never) as never),
          adSlots: {
            create: [
              {
                sortOrder: 0,
                placement:
                  data.templateId === SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID
                    ? 'AFTER_FORM'
                    : 'AFTER_HERO',
              },
            ],
          },
        },
        include: {
          adSlots: { include: { assignments: true }, orderBy: { sortOrder: 'asc' as const } },
        },
      })
    })
    return toLandingPageDTO(page)
  }

  async get(businessId: string, landingPageId: string) {
    const page = await this._find(businessId, landingPageId)
    const submissionCount = await db.formSubmission.count({ where: { landingPageId: page.id } })
    return toLandingPageDTO(page, submissionCount)
  }

  async update(businessId: string, landingPageId: string, data: any) {
    const current = await this._find(businessId, landingPageId)
    const explicitSlugChange = data.slug !== undefined && data.slug !== current.slug
    if (explicitSlugChange) {
      const clash = await db.landingPage.findUnique({ where: { slug: data.slug } })
      if (clash) throw { statusCode: 409, message: 'Slug already in use' }
    }
    if (data.formId) {
      const form = await db.form.findFirst({
        where: { id: data.formId, businessId, deletedAt: null },
      })
      if (!form) throw { statusCode: 404, message: 'Form not found' }
    }
    if (data.templateId) {
      await ensureSystemTemplates(db)
      const template = await db.landingPageTemplate.findFirst({
        where: { id: data.templateId, OR: [{ businessId: null }, { businessId }] },
      })
      if (!template) throw { statusCode: 404, message: 'Template not found' }
    }
    if (data.content) assertYoutubeUrlsInContent(data.content)

    // Slug behavior: auto-follows the title on every draft save until either (a) it's
    // explicitly edited (e.g. via the Page URL settings field), or (b) the page is first
    // published — whichever comes first — so an already-shared, published URL never silently
    // moves out from under a later title edit. See CLAUDE.md's landing-page deployment note.
    let nextSlug: string | undefined
    let lockSlug = false
    if (explicitSlugChange) {
      nextSlug = data.slug
      lockSlug = true
    } else if (
      current.slugAutoManaged &&
      current.publishedVersionId === null &&
      data.name !== undefined &&
      data.name.trim() &&
      data.name !== current.name
    ) {
      nextSlug = await nextUniqueLandingPageSlug(data.name, current.id)
    }

    const page = await db.landingPage.update({
      where: { id: landingPageId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(lockSlug ? { slugAutoManaged: false } : {}),
        ...(data.customDomain !== undefined ? { customDomain: data.customDomain } : {}),
        ...(data.formId !== undefined ? { formId: data.formId } : {}),
        ...(data.templateId !== undefined ? { templateId: data.templateId } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.theme !== undefined ? { theme: data.theme } : {}),
        ...(data.layoutConfig !== undefined ? { layoutConfig: data.layoutConfig } : {}),
      },
      include: {
        adSlots: { include: { assignments: true }, orderBy: { sortOrder: 'asc' as const } },
      },
    })
    const submissionCount = await db.formSubmission.count({ where: { landingPageId: page.id } })
    return toLandingPageDTO(page, submissionCount)
  }

  async delete(businessId: string, landingPageId: string) {
    await this._find(businessId, landingPageId)
    await db.landingPage.update({
      where: { id: landingPageId },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    })
  }

  async publish(businessId: string, landingPageId: string, publishedBy?: string) {
    const result = await db.$transaction(async (tx) => {
      const current = await tx.landingPage.findFirst({
        where: { id: landingPageId, businessId, deletedAt: null },
        include: { template: true },
      })
      if (!current) throw { statusCode: 404, message: 'Landing page not found' }

      // Freeze the form's fields as they exist right now — this version must keep rendering and
      // validating against exactly this snapshot even if the live Form is edited afterward.
      const formSnapshot = await snapshotForm(tx, current.formId)

      // A required HIDDEN field has no human to fill it in — its only value source is
      // FormField.defaultValue (see formSnapshot.ts). Publishing with one required and unset
      // would freeze a form no visitor could ever successfully submit, so reject it here rather
      // than let that surface later as silent, unexplained submission failures.
      const impossibleHiddenField = formSnapshot?.fields.find(
        (field) => field.type === 'HIDDEN' && field.required && !field.defaultValue?.trim(),
      )
      if (impossibleHiddenField) {
        throw {
          statusCode: 400,
          message: `Hidden field "${impossibleHiddenField.label}" is required but has no default value configured — set a default value or make it optional before publishing.`,
        }
      }

      if (current.publishedVersionId) {
        await tx.publishedPageVersion.update({
          where: { id: current.publishedVersionId },
          data: { archivedAt: new Date() },
        })
      }

      const last = await tx.publishedPageVersion.findFirst({
        where: { landingPageId },
        orderBy: { version: 'desc' },
      })

      const slots = await tx.landingPageAdSlot.findMany({
        where: { landingPageId },
        include: { assignments: true },
        orderBy: { sortOrder: 'asc' },
      })

      const adSlotSnapshot = await snapshotSlots(slots)
      const schemaSnapshot = current.template.schema

      const canonicalPayload = JSON.stringify({
        content: current.content,
        theme: current.theme,
        layoutConfig: current.layoutConfig,
        formSnapshot,
        adSlotSnapshot,
        schemaSnapshot,
      })
      const checksum = crypto.createHash('sha256').update(canonicalPayload).digest('hex')

      const version = await tx.publishedPageVersion.create({
        data: {
          landingPageId,
          version: (last?.version ?? 0) + 1,
          content: current.content as Prisma.InputJsonValue,
          theme: current.theme as Prisma.InputJsonValue | undefined,
          layoutConfig: current.layoutConfig as Prisma.InputJsonValue | undefined,
          formId: current.formId,
          formSnapshot: formSnapshot as unknown as Prisma.InputJsonValue | undefined,
          adSlotSnapshot: adSlotSnapshot as unknown as Prisma.InputJsonValue,
          schemaSnapshot: schemaSnapshot as Prisma.InputJsonValue,
          checksum,
          publishedBy,
        },
      })

      const updatedPage = await tx.landingPage.update({
        where: { id: landingPageId },
        // Locks the slug on first publish, same as an explicit manual edit — see update()'s
        // auto-derive comment.
        data: { status: 'PUBLISHED', publishedVersionId: version.id, slugAutoManaged: false },
      })

      return { page: updatedPage, version }
    })

    try {
      const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
      await ActivityProjectionService.project(
        result.page.businessId,
        'LandingPage',
        result.page.id,
        'project',
        result.page,
      )
    } catch (err) {
      console.error('Failed to project page publication', err)
    }

    const { CalendarService } = await import('./CalendarService')
    await new CalendarService().completePagePublishGoals(result.page.businessId)

    return toVersionDTO(result.version)
  }

  async listVersions(
    businessId: string,
    landingPageId: string,
    opts: { cursor?: string; limit?: number },
  ) {
    await this._find(businessId, landingPageId)
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { publishedAt: { lt: new Date(cursor.createdAt) } },
          { publishedAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const versions = await db.publishedPageVersion.findMany({
      where: { landingPageId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = versions.length > limit
    const items = hasMore ? versions.slice(0, limit) : versions
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.publishedAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toVersionDTO), meta: { hasMore, nextCursor } }
  }

  async export(businessId: string, landingPageId: string) {
    const page = await this._find(businessId, landingPageId)
    const template = await db.landingPageTemplate.findUniqueOrThrow({
      where: { id: page.templateId },
    })
    const form = await loadFormForRender(page.formId)
    const slots = await db.landingPageAdSlot.findMany({
      where: { landingPageId: page.id },
      include: { assignments: true },
      orderBy: { sortOrder: 'asc' },
    })
    const content = await withResolvedMedia(
      page.businessId,
      normalizeLegacyPageContent(page.content),
    )
    const submissionCount = await db.formSubmission.count({ where: { landingPageId: page.id } })
    const html = renderLandingPageHtml({
      pageName: page.name,
      templateSchema: template.schema as any,
      content,
      theme: page.theme as any,
      layoutConfig: page.layoutConfig as any,
      form,
      submitActionUrl: landingPageSubmitUrl(page.id),
      adSlots: await snapshotSlots(slots),
      runtimeScriptUrl: `${PUBLIC_SERVER_URL}/loopie.js`,
      businessId: page.businessId,
      submissionCount,
    })
    return { filename: `${page.slug}.html`, html }
  }

  async performance(businessId: string, landingPageId: string) {
    const page = await this._find(businessId, landingPageId)
    const [views, uniqueSessionRows, submissionRows] = await Promise.all([
      db.pageView.count({ where: { landingPageId } }),
      db.pageView.findMany({
        where: { landingPageId, sessionId: { not: null } },
        distinct: ['sessionId'],
        select: { sessionId: true },
      }),
      db.formSubmission.findMany({ where: { landingPageId }, select: { leadId: true } }),
    ])
    const uniqueSessions = uniqueSessionRows.length
    const submissions = submissionRows.length
    // Distinct leads, not raw submission rows — see CampaignPerformanceService's identical fix.
    const leadIds = [
      ...new Set(submissionRows.map((r) => r.leadId).filter((v): v is string => !!v)),
    ]

    const [sales, revenueAgg] = await Promise.all([
      db.sale.count({ where: { businessId, leadId: { in: leadIds }, ...ACTIVE_SALE_WHERE } }),
      db.sale.aggregate({
        where: { businessId, leadId: { in: leadIds }, ...ACTIVE_SALE_WHERE },
        _sum: { amount: true },
      }),
    ])

    return {
      views,
      uniqueSessions,
      formStarts: page.formStartCount,
      submissions,
      conversionRate: uniqueSessions > 0 ? submissions / uniqueSessions : null,
      leads: leadIds.length,
      sales,
      revenue: Number(revenueAgg._sum.amount ?? 0),
    }
  }

  // `serve`, `submit`, and `recordFormStart` have been extracted to LandingPageRenderService and LandingPageSubmissionService.

  private async _find(businessId: string, landingPageId: string) {
    const page = await db.landingPage.findFirst({
      where: { id: landingPageId, businessId, deletedAt: null },
      include: {
        adSlots: { include: { assignments: true }, orderBy: { sortOrder: 'asc' as const } },
      },
    })
    if (!page) throw { statusCode: 404, message: 'Landing page not found' }
    return page
  }
}
