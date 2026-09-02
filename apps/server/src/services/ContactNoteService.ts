import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

function toContactNoteDTO(note: {
  id: string
  contactId: string
  authorUserId: string
  body: string
  pinnedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: note.id,
    contactId: note.contactId,
    authorUserId: note.authorUserId,
    body: note.body,
    pinnedAt: note.pinnedAt?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}

// 404s if the contact doesn't exist (or belongs to another business) — every note operation
// below goes through this first so a note can never be read/written against a contact this
// business can't see, same tenant-scoping discipline as ContactService.get.
async function requireContact(businessId: string, contactId: string) {
  const contact = await db.contact.findFirst({
    where: { id: contactId, businessId, deletedAt: null },
    select: { id: true },
  })
  if (!contact) throw { statusCode: 404, message: 'Contact not found' }
}

export class ContactNoteService {
  async list(businessId: string, contactId: string, opts: { cursor?: string; limit?: number }) {
    await requireContact(businessId, contactId)
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

    const notes = await db.contactNote.findMany({
      where: { contactId, businessId, deletedAt: null, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })

    const hasMore = notes.length > limit
    const items = hasMore ? notes.slice(0, limit) : notes
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null

    return { data: items.map(toContactNoteDTO), meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, contactId: string, authorUserId: string, body: string) {
    await requireContact(businessId, contactId)
    const note = await db.contactNote.create({
      data: { businessId, contactId, authorUserId, body },
    })
    return toContactNoteDTO(note)
  }

  async update(
    businessId: string,
    contactId: string,
    noteId: string,
    data: { body?: string; pinned?: boolean },
  ) {
    const existing = await db.contactNote.findFirst({
      where: { id: noteId, contactId, businessId, deletedAt: null },
    })
    if (!existing) throw { statusCode: 404, message: 'Note not found' }

    const note = await db.contactNote.update({
      where: { id: noteId },
      data: {
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.pinned !== undefined ? { pinnedAt: data.pinned ? new Date() : null } : {}),
      },
    })
    return toContactNoteDTO(note)
  }

  async delete(businessId: string, contactId: string, noteId: string) {
    const existing = await db.contactNote.findFirst({
      where: { id: noteId, contactId, businessId, deletedAt: null },
    })
    if (!existing) throw { statusCode: 404, message: 'Note not found' }
    await db.contactNote.update({ where: { id: noteId }, data: { deletedAt: new Date() } })
  }
}
