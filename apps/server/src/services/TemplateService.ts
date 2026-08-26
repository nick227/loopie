import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { requireAsset, requireAudience } from '../lib/ownership'

const INCLUDE = { media: { take: 1 } }

function toTemplateDTO(template: any) {
  return {
    id: template.id,
    businessId: template.businessId,
    name: template.name,
    channel: template.channel,
    purpose: template.purpose,
    subject: template.subject,
    body: template.body,
    // Prisma schema keeps a many-to-many TemplateMedia join for future flexibility;
    // the API surfaces only the first attached asset as mediaAssetId for V1.
    mediaAssetId: template.media?.[0]?.assetId ?? null,
    cta: template.cta,
    personalizationTokens: (template.personalizationTokens as string[] | null) ?? [],
    suggestedAudienceId: template.suggestedAudienceId,
    createdAt: template.createdAt.toISOString(),
  }
}

export class TemplateService {
  async list(businessId: string, opts: { cursor?: string; limit?: number; channel?: string }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (opts.channel) AND.push({ channel: opts.channel })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const templates = await db.template.findMany({
      where: { businessId, deletedAt: null, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: INCLUDE,
    })
    const hasMore = templates.length > limit
    const items = hasMore ? templates.slice(0, limit) : templates
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toTemplateDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    if (data.suggestedAudienceId) await requireAudience(businessId, data.suggestedAudienceId)
    if (data.mediaAssetId) await requireAsset(businessId, data.mediaAssetId)
    const template = await db.template.create({
      data: {
        businessId,
        name: data.name,
        channel: data.channel,
        purpose: data.purpose,
        subject: data.subject,
        body: data.body,
        cta: data.cta,
        personalizationTokens: data.personalizationTokens ?? [],
        suggestedAudienceId: data.suggestedAudienceId,
        ...(data.mediaAssetId ? { media: { create: { assetId: data.mediaAssetId } } } : {}),
      },
      include: INCLUDE,
    })
    return toTemplateDTO(template)
  }

  async get(businessId: string, templateId: string) {
    const template = await db.template.findFirst({
      where: { id: templateId, businessId, deletedAt: null },
      include: INCLUDE,
    })
    if (!template) throw { statusCode: 404, message: 'Template not found' }
    return toTemplateDTO(template)
  }

  async update(businessId: string, templateId: string, data: any) {
    await this.get(businessId, templateId)
    const template = await db.template.update({
      where: { id: templateId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.subject !== undefined ? { subject: data.subject } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.cta !== undefined ? { cta: data.cta } : {}),
      },
      include: INCLUDE,
    })
    return toTemplateDTO(template)
  }

  async delete(businessId: string, templateId: string) {
    await this.get(businessId, templateId)
    await db.template.update({ where: { id: templateId }, data: { deletedAt: new Date() } })
  }
}
