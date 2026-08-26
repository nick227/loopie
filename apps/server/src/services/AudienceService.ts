import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { LIFECYCLE_INCLUDE, toContactDTO } from '../lib/contactDto'
import { requireContacts } from '../lib/ownership'

type AudienceFilter = {
  tag?: string
  hasEmail?: boolean
  hasMobile?: boolean
  leadStatus?: string
  source?: string
  lastPurchaseBeforeDays?: number
}

// Maps the filter keys documented in docs/05-audience-segmentation-spec.md onto the Contact
// schema. Location/ZIP filtering is out of scope for V1 — Contact has no location field.
function buildFilterWhere(businessId: string, filter: AudienceFilter): any {
  const AND: any[] = []
  if (filter.tag) AND.push({ tags: { array_contains: filter.tag } })
  if (filter.hasEmail) AND.push({ email: { not: null } })
  if (filter.hasMobile) AND.push({ phone: { not: null } })
  if (filter.source) AND.push({ source: filter.source })
  if (filter.leadStatus) AND.push({ leads: { some: { stage: filter.leadStatus as any } } })
  if (filter.lastPurchaseBeforeDays) {
    const cutoff = new Date(Date.now() - filter.lastPurchaseBeforeDays * 24 * 60 * 60 * 1000)
    AND.push({ sales: { some: { date: { lt: cutoff } } } })
  }
  return { businessId, deletedAt: null, ...(AND.length ? { AND } : {}) }
}

// PREDEFINED audiences resolve by name — the default set from docs/05-audience-segmentation-spec.md.
function buildPredefinedWhere(businessId: string, name: string): any {
  const base = { businessId, deletedAt: null }
  switch (name) {
    case 'Everyone':
      return base
    case 'Leads':
      return { ...base, leads: { some: { stage: { notIn: ['WON', 'LOST'] } } } }
    case 'Customers':
    case 'Repeat customers': // approximated as "has a sale" — a true 2+ count needs a raw query
      return { ...base, sales: { some: {} } }
    case 'No response':
      return { ...base, interactions: { none: { type: 'REPLY' } }, lastContactedAt: { not: null } }
    case 'Recently contacted':
      return { ...base, lastContactedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } }
    case 'Past customers':
      return { ...base, sales: { some: { date: { lt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } } }
    default:
      return base
  }
}

// Returns a Contact where-clause for SAVED_FILTER/PREDEFINED audiences, or null for
// MANUAL_LIST/IMPORTED_LIST (those resolve via the AudienceMember join instead).
function resolveAudienceWhere(audience: { businessId: string; type: string; name: string; filter: unknown }): any {
  if (audience.type === 'SAVED_FILTER') return buildFilterWhere(audience.businessId, (audience.filter as AudienceFilter) ?? {})
  if (audience.type === 'PREDEFINED') return buildPredefinedWhere(audience.businessId, audience.name)
  return null
}

export class AudienceService {
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

    const audiences = await db.audience.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })

    const hasMore = audiences.length > limit
    const items = hasMore ? audiences.slice(0, limit) : audiences
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null

    const data = await Promise.all(items.map((a) => this._toDTO(a)))
    return { data, meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    if ((data.type === 'MANUAL_LIST' || data.type === 'IMPORTED_LIST') && data.contactIds?.length) {
      await requireContacts(businessId, data.contactIds)
    }
    const audience = await db.audience.create({
      data: { businessId, name: data.name, type: data.type, filter: data.filter ?? undefined },
    })
    if ((data.type === 'MANUAL_LIST' || data.type === 'IMPORTED_LIST') && data.contactIds?.length) {
      await db.audienceMember.createMany({
        data: data.contactIds.map((contactId: string) => ({ audienceId: audience.id, contactId })),
        skipDuplicates: true,
      })
    }
    return this._toDTO(audience)
  }

  async get(businessId: string, audienceId: string) {
    return this._toDTO(await this._find(businessId, audienceId))
  }

  async update(businessId: string, audienceId: string, data: any) {
    await this._find(businessId, audienceId)
    const audience = await db.audience.update({
      where: { id: audienceId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.filter !== undefined ? { filter: data.filter } : {}),
      },
    })
    return this._toDTO(audience)
  }

  async delete(businessId: string, audienceId: string) {
    await this._find(businessId, audienceId)
    await db.audienceMember.deleteMany({ where: { audienceId } })
    await db.audience.delete({ where: { id: audienceId } })
  }

  async listContacts(businessId: string, audienceId: string, opts: { cursor?: string; limit?: number }) {
    const audience = await this._find(businessId, audienceId)
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const cursorClause = cursor
      ? [
          {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
            ],
          },
        ]
      : []

    const filterWhere = resolveAudienceWhere(audience)
    const where = filterWhere
      ? { ...filterWhere, ...(cursorClause.length ? { AND: [...(filterWhere.AND ?? []), ...cursorClause] } : {}) }
      : {
          businessId,
          deletedAt: null,
          audienceMemberships: { some: { audienceId } },
          ...(cursorClause.length ? { AND: cursorClause } : {}),
        }

    const contacts = await db.contact.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: LIFECYCLE_INCLUDE,
    })

    const hasMore = contacts.length > limit
    const items = hasMore ? contacts.slice(0, limit) : contacts
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null

    return { data: items.map(toContactDTO), meta: { hasMore, nextCursor } }
  }

  private async _find(businessId: string, audienceId: string) {
    const audience = await db.audience.findFirst({ where: { id: audienceId, businessId } })
    if (!audience) throw { statusCode: 404, message: 'Audience not found' }
    return audience
  }

  private async _toDTO(audience: any) {
    const filterWhere = resolveAudienceWhere(audience)
    const memberWhere =
      filterWhere ?? { businessId: audience.businessId, deletedAt: null, audienceMemberships: { some: { audienceId: audience.id } } }
    const memberCount = await db.contact.count({ where: memberWhere })
    const eligibleCount = await db.contact.count({
      where: { ...memberWhere, OR: [{ emailEligible: true }, { smsEligible: true }] },
    })
    return {
      id: audience.id,
      businessId: audience.businessId,
      name: audience.name,
      type: audience.type,
      filter: audience.filter ?? null,
      memberCount,
      eligibleCount,
      createdAt: audience.createdAt.toISOString(),
    }
  }
}

export { resolveAudienceWhere }
