import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { LIFECYCLE_INCLUDE, toContactDTO, withGraph } from '../lib/contactDto'
import { normalizeEmail, normalizePhone, tombstoneIdentity } from '../lib/identityResolution'
import { syncPrimaryIdentifiers, tombstoneIdentifiers } from '../lib/contactIdentifiers'
import { ImportJobService, type ImportRow } from './ImportJobService'
import { ACTIVE_SALE_WHERE } from '../lib/salePredicates'

const importJobs = new ImportJobService()

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
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null

    // lifecycleStatus is derived, so filtering by it happens after the page is fetched —
    // acceptable at MVP scale; a status-heavy filter would need it pushed into the query.
    let mapped = items.map(toContactDTO)
    if (opts.lifecycleStatus)
      mapped = mapped.filter((c) => c.lifecycleStatus === opts.lifecycleStatus)

    return { data: mapped, meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    const contact = await db.$transaction(async (tx) => {
      const created = await tx.contact.create({
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
      })
      await syncPrimaryIdentifiers(tx, created, data.source ?? 'LOOPIE')
      return tx.contact.findFirstOrThrow({ where: { id: created.id }, include: LIFECYCLE_INCLUDE })
    })
    return toContactDTO(contact)
  }

  async importMany(businessId: string, contacts: ImportRow[]) {
    return importJobs.importContacts(businessId, contacts)
  }

  async get(businessId: string, contactId: string) {
    const contact = await db.contact.findFirst({
      where: { id: contactId, businessId, deletedAt: null },
      include: LIFECYCLE_INCLUDE,
    })
    if (!contact) throw { statusCode: 404, message: 'Contact not found' }
    const [identifiers, records, revenueAgg] = await Promise.all([
      db.contactIdentifier.findMany({ where: { contactId } }),
      db.externalContactRecord.findMany({ where: { contactId }, orderBy: { syncedAt: 'desc' } }),
      db.sale.aggregate({
        where: { contactId, businessId, ...ACTIVE_SALE_WHERE },
        _sum: { amount: true },
      }),
    ])
    return withGraph(contact, {
      identifiers,
      records,
      revenue: Number(revenueAgg._sum.amount ?? 0),
    })
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
          ? {
              emailEligible: data.emailEligible,
              emailOptOutAt: data.emailEligible ? null : new Date(),
            }
          : {}),
        ...(data.smsEligible !== undefined
          ? { smsEligible: data.smsEligible, smsOptOutAt: data.smsEligible ? null : new Date() }
          : {}),
      },
    })
    await db.$transaction((tx) => syncPrimaryIdentifiers(tx, contact, 'LOOPIE'))
    const withLifecycle = await db.contact.findFirstOrThrow({
      where: { id: contactId },
      include: LIFECYCLE_INCLUDE,
    })
    return toContactDTO(withLifecycle)
  }

  async delete(businessId: string, contactId: string) {
    const contact = await this.get(businessId, contactId)
    await db.$transaction(async (tx) => {
      await tombstoneIdentifiers(tx, contactId)
      await tx.contact.update({
        where: { id: contactId },
        data: {
          deletedAt: new Date(),
          email: tombstoneIdentity(contact.email, contactId),
          phone: tombstoneIdentity(contact.phone, contactId),
        },
      })
    })
  }

  async listInteractions(
    businessId: string,
    contactId: string,
    opts: { cursor?: string; limit?: number },
  ) {
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
      hasMore && last
        ? encodeCursor({ createdAt: last.occurredAt.toISOString(), id: last.id })
        : null

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
