import { db, resolveVisitorSid, verifySid } from '@project/db'
import type { Prisma, SourceType } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { hostedPageUrl, landingPageSubmitUrl } from '../lib/urls'
import { renderLandingPageHtml, defaultContentFromSchema } from '../lib/renderLandingPage'
import { resolveContactAndLead } from '../lib/identityResolution'
import { snapshotForm, isFormLive, type FormSnapshot } from '../lib/formSnapshot'

function toLandingPageDTO(page: any) {
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
    publishedVersionId: page.publishedVersionId,
    hostedUrl: hostedPageUrl(page.slug),
    formStartCount: page.formStartCount,
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
  return { id: form.id, submitLabel: form.submitLabel, fields: form.fields }
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
    })
    const hasMore = pages.length > limit
    const items = hasMore ? pages.slice(0, limit) : pages
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toLandingPageDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
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

    const page = await db.landingPage.create({
      data: {
        businessId,
        templateId: data.templateId,
        formId: data.formId,
        name: data.name,
        slug: data.slug,
        content: data.content ?? (defaultContentFromSchema(template.schema as any) as any),
        theme: data.theme,
      },
    })
    return toLandingPageDTO(page)
  }

  async get(businessId: string, landingPageId: string) {
    return toLandingPageDTO(await this._find(businessId, landingPageId))
  }

  async update(businessId: string, landingPageId: string, data: any) {
    const current = await this._find(businessId, landingPageId)
    if (data.slug !== undefined && data.slug !== current.slug) {
      const clash = await db.landingPage.findUnique({ where: { slug: data.slug } })
      if (clash) throw { statusCode: 409, message: 'Slug already in use' }
    }
    if (data.formId) {
      const form = await db.form.findFirst({
        where: { id: data.formId, businessId, deletedAt: null },
      })
      if (!form) throw { statusCode: 404, message: 'Form not found' }
    }
    const page = await db.landingPage.update({
      where: { id: landingPageId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.customDomain !== undefined ? { customDomain: data.customDomain } : {}),
        ...(data.formId !== undefined ? { formId: data.formId } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.theme !== undefined ? { theme: data.theme } : {}),
      },
    })
    return toLandingPageDTO(page)
  }

  async delete(businessId: string, landingPageId: string) {
    await this._find(businessId, landingPageId)
    await db.landingPage.update({
      where: { id: landingPageId },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    })
  }

  async publish(businessId: string, landingPageId: string, publishedBy?: string) {
    return db.$transaction(async (tx) => {
      const current = await tx.landingPage.findFirst({
        where: { id: landingPageId, businessId, deletedAt: null },
      })
      if (!current) throw { statusCode: 404, message: 'Landing page not found' }

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

      // Freeze the form's fields as they exist right now — this version must keep rendering and
      // validating against exactly this snapshot even if the live Form is edited afterward.
      const formSnapshot = await snapshotForm(tx, current.formId)

      const version = await tx.publishedPageVersion.create({
        data: {
          landingPageId,
          version: (last?.version ?? 0) + 1,
          content: current.content as Prisma.InputJsonValue,
          theme: current.theme as Prisma.InputJsonValue | undefined,
          formId: current.formId,
          formSnapshot: formSnapshot as unknown as Prisma.InputJsonValue | undefined,
          publishedBy,
        },
      })

      await tx.landingPage.update({
        where: { id: landingPageId },
        data: { status: 'PUBLISHED', publishedVersionId: version.id },
      })

      return toVersionDTO(version)
    })
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
    const html = renderLandingPageHtml({
      pageName: page.name,
      templateSchema: template.schema as any,
      content: page.content as any,
      theme: page.theme as any,
      form,
      submitActionUrl: landingPageSubmitUrl(page.id),
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
    const leadIds = submissionRows.map((r) => r.leadId).filter((v): v is string => !!v)

    const [sales, revenueAgg] = await Promise.all([
      db.sale.count({ where: { businessId, leadId: { in: leadIds } } }),
      db.sale.aggregate({ where: { businessId, leadId: { in: leadIds } }, _sum: { amount: true } }),
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
    })
    if (!page) throw { statusCode: 404, message: 'Landing page not found' }
    return page
  }
}
