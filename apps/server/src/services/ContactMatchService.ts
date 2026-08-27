import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

function toDTO(row: {
  id: string
  businessId: string
  contactId: string | null
  integrationId: string | null
  provider: string
  externalId: string
  matchStatus: string
  candidateContactIds: unknown
  syncedAt: Date | null
  createdAt: Date
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    contactId: row.contactId,
    integrationId: row.integrationId,
    provider: row.provider,
    externalId: row.externalId,
    matchStatus: row.matchStatus,
    candidateContactIds: (row.candidateContactIds as string[] | null) ?? [],
    syncedAt: row.syncedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export class ContactMatchService {
  async list(businessId: string, opts: { cursor?: string; limit?: number; status?: string }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: object[] = [{ matchStatus: { in: ['AMBIGUOUS', 'UNMATCHED'] } }]
    if (opts.status) AND.push({ matchStatus: opts.status })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const rows = await db.externalContactRecord.findMany({
      where: { businessId, AND },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toDTO), meta: { hasMore, nextCursor } }
  }

  async resolve(businessId: string, recordId: string, contactId: string) {
    const record = await db.externalContactRecord.findFirst({ where: { id: recordId, businessId } })
    if (!record) throw { statusCode: 404, message: 'Match record not found' }
    const contact = await db.contact.findFirst({
      where: { id: contactId, businessId, deletedAt: null },
    })
    if (!contact) throw { statusCode: 404, message: 'Contact not found' }
    const updated = await db.externalContactRecord.update({
      where: { id: recordId },
      data: { contactId, matchStatus: 'LINKED', candidateContactIds: [] },
    })
    return toDTO(updated)
  }
}
