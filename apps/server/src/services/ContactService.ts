import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { LIFECYCLE_INCLUDE, toContactDTO } from '../lib/contactDto'
import { normalizeEmail, normalizePhone, tombstoneIdentity } from '../lib/identityResolution'

export class ContactService {
  async list(
    businessId: string,
    opts: { cursor?: string; limit?: number; q?: string; tag?: string; lifecycleStatus?: string },
  ) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)

    const AND: any[] = []
    if (opts.q) AND.push({ OR: [{ name: { contains: opts.q } }, { email: { contains: opts.q } }] })
    if (opts.tag) AND.push({ tags: { array_contains: opts.tag } })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }

    const contacts = await db.contact.findMany({
      where: { businessId, deletedAt: null, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: LIFECYCLE_INCLUDE,
    })

    const hasMore = contacts.length > limit
    const items = hasMore ? contacts.slice(0, limit) : contacts
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null

    // lifecycleStatus is derived, so filtering by it happens after the page is fetched —
    // acceptable at MVP scale; a status-heavy filter would need it pushed into the query.
    let mapped = items.map(toContactDTO)
    if (opts.lifecycleStatus) mapped = mapped.filter((c) => c.lifecycleStatus === opts.lifecycleStatus)

    return { data: mapped, meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    const contact = await db.contact.create({
      data: {
        businessId,
        name: data.name,
        email: normalizeEmail(data.email),
        phone: normalizePhone(data.phone),
        company: data.company,
        source: data.source,
        tags: data.tags ?? [],
        emailEligible: data.emailEligible ?? true,
        smsEligible: data.smsEligible ?? true,
      },
      include: LIFECYCLE_INCLUDE,
    })
    return toContactDTO(contact)
  }

  async importMany(businessId: string, contacts: any[]) {
    let created = 0
    let skipped = 0
    for (const c of contacts) {
      try {
        await db.contact.create({
          data: {
            businessId,
            name: c.name,
            email: normalizeEmail(c.email),
            phone: normalizePhone(c.phone),
            company: c.company,
            source: c.source ?? 'import',
            tags: c.tags ?? [],
            emailEligible: c.emailEligible ?? true,
            smsEligible: c.smsEligible ?? true,
          },
        })
        created++
      } catch {
        skipped++
      }
    }
    return { created, skipped }
  }

  async get(businessId: string, contactId: string) {
    const contact = await db.contact.findFirst({
      where: { id: contactId, businessId, deletedAt: null },
      include: LIFECYCLE_INCLUDE,
    })
    if (!contact) throw { statusCode: 404, message: 'Contact not found' }
    return toContactDTO(contact)
  }

  async update(businessId: string, contactId: string, data: any) {
    await this.get(businessId, contactId) // 404 + tenant guard
    const contact = await db.contact.update({
      where: { id: contactId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: normalizeEmail(data.email) } : {}),
        ...(data.phone !== undefined ? { phone: normalizePhone(data.phone) } : {}),
        ...(data.company !== undefined ? { company: data.company } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.emailEligible !== undefined
          ? { emailEligible: data.emailEligible, emailOptOutAt: data.emailEligible ? null : new Date() }
          : {}),
        ...(data.smsEligible !== undefined
          ? { smsEligible: data.smsEligible, smsOptOutAt: data.smsEligible ? null : new Date() }
          : {}),
      },
      include: LIFECYCLE_INCLUDE,
    })
    return toContactDTO(contact)
  }

  async delete(businessId: string, contactId: string) {
    const contact = await this.get(businessId, contactId)
    await db.contact.update({
      where: { id: contactId },
      data: {
        deletedAt: new Date(),
        email: tombstoneIdentity(contact.email, contactId),
        phone: tombstoneIdentity(contact.phone, contactId),
      },
    })
  }

  async listInteractions(businessId: string, contactId: string, opts: { cursor?: string; limit?: number }) {
    await this.get(businessId, contactId)
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)

    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { occurredAt: { lt: new Date(cursor.createdAt) } },
          { occurredAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }

    const interactions = await db.interaction.findMany({
      where: { contactId, businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })

    const hasMore = interactions.length > limit
    const items = hasMore ? interactions.slice(0, limit) : interactions
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last ? encodeCursor({ createdAt: last.occurredAt.toISOString(), id: last.id }) : null

    return {
      data: items.map((i) => ({
        id: i.id,
        contactId: i.contactId,
        type: i.type,
        sourceType: i.sourceType,
        sourceMessageId: i.sourceMessageId,
        sourceDeploymentId: i.sourceDeploymentId,
        sourceAdUnitId: i.sourceAdUnitId,
        metadata: i.metadata,
        occurredAt: i.occurredAt.toISOString(),
      })),
      meta: { hasMore, nextCursor },
    }
  }
}
