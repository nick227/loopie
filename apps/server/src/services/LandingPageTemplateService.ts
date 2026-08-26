import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

function toTemplateDTO(template: any) {
  return {
    id: template.id,
    businessId: template.businessId,
    isSystem: template.isSystem,
    name: template.name,
    description: template.description,
    category: template.category,
    formatVersion: template.formatVersion,
    previewImageUrl: template.previewImageUrl,
    schema: template.schema,
    createdAt: template.createdAt.toISOString(),
  }
}

// Read-only for V1 — no create/update endpoint. Authoring a custom template (vs. authoring a
// LandingPage from one) is out of scope until a template catalog import flow exists; system
// templates are seeded, businessId stays available for that future import to land in.
export class LandingPageTemplateService {
  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const templates = await db.landingPageTemplate.findMany({
      where: { OR: [{ businessId: null }, { businessId }], ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = templates.length > limit
    const items = hasMore ? templates.slice(0, limit) : templates
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toTemplateDTO), meta: { hasMore, nextCursor } }
  }

  async get(businessId: string, templateId: string) {
    const template = await db.landingPageTemplate.findFirst({
      where: { id: templateId, OR: [{ businessId: null }, { businessId }] },
    })
    if (!template) throw { statusCode: 404, message: 'Template not found' }
    return toTemplateDTO(template)
  }
}
