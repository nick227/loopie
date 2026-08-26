import { db } from '@project/db'
import type { Prisma, SourceType } from '@prisma/client'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { hostedPageUrl, landingPageSubmitUrl } from '../lib/urls'
import { renderLandingPageHtml, defaultContentFromSchema } from '../lib/renderLandingPage'
import { resolveContactAndLead } from '../lib/identityResolution'

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
    publishedAt: version.publishedAt.toISOString(),
    archivedAt: version.archivedAt?.toISOString() ?? null,
  }
}

async function loadFormForRender(formId: string | null) {
  if (!formId) return null
  const form = await db.form.findUnique({ where: { id: formId }, include: { fields: { orderBy: { order: 'asc' } } } })
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
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
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
      const form = await db.form.findFirst({ where: { id: data.formId, businessId, deletedAt: null } })
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
      const form = await db.form.findFirst({ where: { id: data.formId, businessId, deletedAt: null } })
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

      const version = await tx.publishedPageVersion.create({
        data: {
          landingPageId,
          version: (last?.version ?? 0) + 1,
          content: current.content as Prisma.InputJsonValue,
          theme: current.theme as Prisma.InputJsonValue | undefined,
          formId: current.formId,
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

  async listVersions(businessId: string, landingPageId: string, opts: { cursor?: string; limit?: number }) {
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
      hasMore && last ? encodeCursor({ createdAt: last.publishedAt.toISOString(), id: last.id }) : null
    return { data: items.map(toVersionDTO), meta: { hasMore, nextCursor } }
  }

  async export(businessId: string, landingPageId: string) {
    const page = await this._find(businessId, landingPageId)
    const template = await db.landingPageTemplate.findUniqueOrThrow({ where: { id: page.templateId } })
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

  // Public, approximate, not deduplicated by session — a lightweight signal per the brief
  // ("form starts if captured"), not a precise funnel stage.
  async recordFormStart(landingPageId: string) {
    const page = await db.landingPage.findUnique({ where: { id: landingPageId } })
    if (!page || page.deletedAt || page.status !== 'PUBLISHED') {
      throw { statusCode: 404, message: 'Landing page not found' }
    }
    await db.landingPage.update({ where: { id: landingPageId }, data: { formStartCount: { increment: 1 } } })
  }

  // The hosted rendering path (GET /p/{slug}). Records a PageView on every hit — the raw
  // per-event table PageView.performance()/pageView reads back from, distinct from the
  // counter-based approach used for ad impressions (see AdUnit — much higher volume there).
  async serve(
    slug: string,
    opts: { sessionId?: string; referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string },
  ) {
    const page = await db.landingPage.findUnique({
      where: { slug },
      include: { publishedVersion: true, template: true },
    })
    if (!page || page.deletedAt || page.status !== 'PUBLISHED' || !page.publishedVersion) {
      throw { statusCode: 404, message: 'Page not found' }
    }

    await db.pageView.create({
      data: {
        landingPageId: page.id,
        publishedPageVersionId: page.publishedVersion.id,
        sessionId: opts.sessionId,
        referrer: opts.referrer,
        utmSource: opts.utmSource,
        utmMedium: opts.utmMedium,
        utmCampaign: opts.utmCampaign,
      },
    })

    const form = await loadFormForRender(page.publishedVersion.formId)
    return renderLandingPageHtml({
      pageName: page.name,
      templateSchema: page.template.schema as any,
      content: page.publishedVersion.content as any,
      theme: page.publishedVersion.theme as any,
      form,
      submitActionUrl: landingPageSubmitUrl(page.id),
    })
  }

  // The canonical identity transition for hosted landing pages: anonymous session ->
  // FormSubmission -> resolve/create Contact -> create Lead, via the same
  // resolveContactAndLead() AttributionService.submitForm uses — one Contact/Lead model, two
  // entry points. Enriches attribution from whichever Deployment/AdUnit click produced the
  // session (matched by sessionId); falls back to MANUAL when the visit wasn't tracked (e.g.
  // organic traffic, or a link with no prior click — a Message-originated visit is not yet
  // distinguished from organic in V1, a documented scope limit).
  async submit(
    landingPageId: string,
    input: {
      sessionId?: string
      data: Record<string, unknown>
      utmSource?: string
      utmMedium?: string
      utmCampaign?: string
      utmContent?: string
      utmTerm?: string
    },
  ) {
    const page = await db.landingPage.findUnique({
      where: { id: landingPageId },
      include: { form: { include: { fields: true } } },
    })
    if (!page || page.deletedAt || page.status !== 'PUBLISHED') {
      throw { statusCode: 404, message: 'Landing page not found' }
    }
    if (!page.form) throw { statusCode: 409, message: 'This landing page has no form configured' }

    for (const field of page.form.fields) {
      if (!field.required) continue
      const value = input.data[field.fieldKey]
      if (value === undefined || value === null || String(value).trim() === '') {
        throw { statusCode: 400, message: `Missing required field: ${field.fieldKey}` }
      }
    }

    return db.$transaction(async (tx) => {
      if (input.sessionId) {
        const existing = await tx.formSubmission.findFirst({
          where: { landingPageId: page.id, sessionId: input.sessionId },
        })
        if (existing?.contactId && existing.leadId) {
          return {
            submissionId: existing.id,
            contactId: existing.contactId,
            leadId: existing.leadId,
            successMessage: page.form!.successMessage,
          }
        }
      }

      const event = input.sessionId
        ? await tx.attributionEvent.findFirst({
            where: { sessionId: input.sessionId },
            orderBy: { createdAt: 'desc' },
            include: { deployment: { include: { campaign: true } }, adUnit: true },
          })
        : null
      const eventBusinessId = event?.deployment?.campaign.businessId ?? event?.adUnit?.businessId
      const attributed = event && eventBusinessId === page.businessId ? event : null

      const emailField = page.form!.fields.find((f) => f.type === 'EMAIL')
      const phoneField = page.form!.fields.find((f) => f.type === 'PHONE')
      const nameValue =
        (input.data['name'] as string) ?? (input.data['full_name'] as string) ?? 'Website visitor'
      const emailValue = emailField ? (input.data[emailField.fieldKey] as string | undefined) : undefined
      const phoneValue = phoneField ? (input.data[phoneField.fieldKey] as string | undefined) : undefined

      const submission = await tx.formSubmission.create({
        data: {
          businessId: page.businessId,
          formId: page.form!.id,
          landingPageId: page.id,
          publishedPageVersionId: page.publishedVersionId,
          data: input.data as Prisma.InputJsonValue,
          sessionId: input.sessionId,
          clickId: attributed?.clickId,
          utmSource: input.utmSource ?? attributed?.utmSource,
          utmMedium: input.utmMedium ?? attributed?.utmMedium,
          utmCampaign: input.utmCampaign ?? attributed?.utmCampaign,
          utmContent: input.utmContent ?? attributed?.utmContent,
          utmTerm: input.utmTerm ?? attributed?.utmTerm,
          sourceDeploymentId: attributed?.deploymentId,
          sourceAdUnitId: attributed?.adUnitId,
        },
      })

      const sourceType: SourceType = attributed?.deploymentId
        ? 'DEPLOYMENT'
        : attributed?.adUnitId
          ? 'AD_UNIT'
          : 'MANUAL'
      const { contact, lead } = await resolveContactAndLead(
        tx,
        page.businessId,
        { name: nameValue, email: emailValue, phone: phoneValue, source: 'landing-page' },
        {
          sourceType,
          sourceDeploymentId: attributed?.deploymentId,
          sourceAdUnitId: attributed?.adUnitId,
          clickId: attributed?.clickId,
          landingSessionId: input.sessionId,
        },
      )

      await tx.formSubmission.update({
        where: { id: submission.id },
        data: { contactId: contact.id, leadId: lead.id },
      })
      if (attributed?.deploymentId) {
        await tx.deployment.update({
          where: { id: attributed.deploymentId },
          data: { conversions: { increment: 1 } },
        })
      }
      if (attributed?.adUnitId) {
        await tx.adUnit.update({
          where: { id: attributed.adUnitId },
          data: { conversions: { increment: 1 } },
        })
      }

      return {
        submissionId: submission.id,
        contactId: contact.id,
        leadId: lead.id,
        successMessage: page.form!.successMessage,
      }
    })
  }

  private async _find(businessId: string, landingPageId: string) {
    const page = await db.landingPage.findFirst({ where: { id: landingPageId, businessId, deletedAt: null } })
    if (!page) throw { statusCode: 404, message: 'Landing page not found' }
    return page
  }
}
