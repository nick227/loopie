import { db } from '@project/db'
// Relative path, not the '@project/sdk' package specifier — see AdRunService.ts's identical
// import for why (found live: MODULE_NOT_FOUND in the Railway runtime image despite the file
// physically being present, specific to this package's #exports-map package.json).
import { profileFromRaw } from '../../../../packages/sdk/src/lib/importContactSchema'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { LIFECYCLE_INCLUDE, toContactDTO, withGraph } from '../lib/contactDto'
import { normalizeEmail, normalizePhone, tombstoneIdentity } from '../lib/identityResolution'
import { syncPrimaryIdentifiers, tombstoneIdentifiers } from '../lib/contactIdentifiers'
import { ImportJobService } from './ImportJobService'
import { ACTIVE_SALE_WHERE } from '../lib/salePredicates'
import { syncContactTags } from '../lib/contactTags'
import { currentLeadCard, LOGGABLE_ACTIVITY_TYPES } from '../lib/leadCard'
import { markOpenLeadActivityFromInteraction } from '../lib/leadActivity'
import { channelForInteractionType, findOrCreateProvider } from '../lib/channelProviders'
import { toInteractionDTO } from '../lib/interactionDto'
import type { Channel } from '@prisma/client'
import { CalendarService } from './CalendarService'

const importJobs = new ImportJobService()
const calendarService = new CalendarService()

export class ContactService {
  async list(
    businessId: string,
    opts: {
      cursor?: string
      limit?: number
      q?: string
      tagIds?: string[]
      tagMode?: 'AND' | 'OR'
      source?: string
      lifecycleStatus?: string
    },
  ) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)

    const AND: any[] = []
    if (opts.q) AND.push({ OR: [{ name: { contains: opts.q } }, { email: { contains: opts.q } }] })
    if (opts.tagIds && opts.tagIds.length > 0) {
      // Default AND ("has all selected tags") — the more useful default for segmentation, per
      // explicit product decision; an "Any" toggle (tagMode: 'OR') is available, not hidden.
      if (opts.tagMode === 'OR') {
        AND.push({ tagAssignments: { some: { tagId: { in: opts.tagIds } } } })
      } else {
        AND.push(...opts.tagIds.map((tagId) => ({ tagAssignments: { some: { tagId } } })))
      }
    }
    if (opts.source) AND.push({ source: opts.source })
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

    const ids = items.map((item) => item.id)
    const [recordRows, revenueRows] = await Promise.all([
      db.externalContactRecord.findMany({
        where: { contactId: { in: ids } },
        select: {
          id: true,
          contactId: true,
          provider: true,
          externalId: true,
          matchStatus: true,
          syncedAt: true,
        },
      }),
      db.sale.groupBy({
        by: ['contactId'],
        where: { contactId: { in: ids }, businessId, ...ACTIVE_SALE_WHERE },
        _sum: { amount: true },
      }),
    ])
    const recordsByContact = new Map<string, typeof recordRows>()
    for (const row of recordRows) {
      // contactId is nullable on the model (an unmatched ExternalContactRecord has none — see
      // ContactMatchService), but the `contactId: { in: ids }` filter above guarantees every row
      // here has one; this narrows the type rather than asserting past a real possibility.
      if (!row.contactId) continue
      const bucket = recordsByContact.get(row.contactId) ?? []
      bucket.push(row)
      recordsByContact.set(row.contactId, bucket)
    }
    const revenueByContact = new Map(
      revenueRows
        .filter((row) => row.contactId)
        .map((row) => [row.contactId as string, Number(row._sum.amount ?? 0)]),
    )

    // lifecycleStatus is derived, so filtering by it happens after the page is fetched —
    // acceptable at MVP scale; a status-heavy filter would need it pushed into the query.
    // records/revenue batched here, not per-row (N+1) — same discipline as LandingPage.
    // submissionCount's list-page fix (CLAUDE.md). Previously only get() returned these (via
    // withGraph), so the collection row's synced-source badge and revenue trailing value were
    // silently always empty/zero — found while wiring the Contacts collection/entity parity pass.
    let mapped = items.map((item) => ({
      ...toContactDTO(item),
      records: (recordsByContact.get(item.id) ?? []).map((row) => ({
        id: row.id,
        provider: row.provider,
        externalId: row.externalId,
        matchStatus: row.matchStatus,
        syncedAt: row.syncedAt?.toISOString() ?? null,
      })),
      revenue: revenueByContact.get(item.id) ?? 0,
    }))
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
          avatarAssetId: data.avatarAssetId,
          emailEligible: data.emailEligible ?? true,
          smsEligible: data.smsEligible ?? true,
        },
      })
      await syncPrimaryIdentifiers(tx, created, data.source ?? 'LOOPIE')
      if (data.tags !== undefined) await syncContactTags(tx, businessId, created.id, data.tags)
      await tx.lead.create({
        data: {
          businessId,
          contactId: created.id,
          sourceType: 'MANUAL',
          stage: 'NEW',
          openSlot: 'OPEN',
        },
      })
      return tx.contact.findFirstOrThrow({ where: { id: created.id }, include: LIFECYCLE_INCLUDE })
    })
    return toContactDTO(contact)
  }

  async importMany(businessId: string, contacts: Record<string, unknown>[]) {
    return importJobs.importContacts(businessId, contacts)
  }

  async get(businessId: string, contactId: string) {
    const contact = await db.contact.findFirst({
      where: { id: contactId, businessId, deletedAt: null },
      include: LIFECYCLE_INCLUDE,
    })
    if (!contact) throw { statusCode: 404, message: 'Contact not found' }
    const [identifiers, records, revenueAgg, currentLead] = await Promise.all([
      db.contactIdentifier.findMany({ where: { contactId } }),
      db.externalContactRecord.findMany({ where: { contactId }, orderBy: { syncedAt: 'desc' } }),
      db.sale.aggregate({
        where: { contactId, businessId, ...ACTIVE_SALE_WHERE },
        _sum: { amount: true },
      }),
      currentLeadCard(businessId, contactId),
    ])
    const profiles: Record<string, Record<string, string>> = {}
    for (const row of records) {
      const profile = profileFromRaw(row.raw)
      if (profile) profiles[row.id] = profile
    }
    return withGraph(contact, {
      identifiers,
      records,
      revenue: Number(revenueAgg._sum.amount ?? 0),
      profiles,
      currentLead,
    })
  }

  // Manually logging real-world effort (a call, a meeting, a webinar/event, a follow-up, or a
  // plain note) — the one write path that puts a row into Interaction without going through a
  // system-of-record code path (MessageService.send, form submission, sale creation, ...).
  async logActivity(
    businessId: string,
    contactId: string,
    data: {
      type: string
      channel?: Channel
      providerId?: string
      providerName?: string
      note?: string
      occurredAt?: string
    },
  ) {
    await this.get(businessId, contactId) // 404 + tenant guard
    if (!(LOGGABLE_ACTIVITY_TYPES as readonly string[]).includes(data.type)) {
      throw { statusCode: 400, message: `Cannot manually log activity type "${data.type}"` }
    }
    // Auto-derived when the caller doesn't specify one — matches the same InteractionType ->
    // Channel mapping used for the backfill and for system-generated interactions.
    const channel = data.channel ?? channelForInteractionType(data.type as any)

    let providerId = data.providerId
    if (!providerId && data.providerName && channel) {
      const provider = await findOrCreateProvider(db, businessId, channel, data.providerName)
      providerId = provider.id
    } else if (providerId) {
      const owned = await db.channelProvider.findFirst({ where: { id: providerId, businessId } })
      if (!owned) throw { statusCode: 404, message: 'Provider not found' }
    }

    const interaction = await db.interaction.create({
      data: {
        businessId,
        contactId,
        type: data.type as (typeof LOGGABLE_ACTIVITY_TYPES)[number],
        channel: channel ?? undefined,
        providerId,
        metadata: data.note ? { note: data.note } : undefined,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      },
      include: { provider: true },
    })
    await markOpenLeadActivityFromInteraction(businessId, contactId, data.type)
    // "When the corresponding CRM interaction is logged, Calendar should be capable of
    // considering that work complete" — the loop the product spec calls out. Best-effort, see
    // CalendarService.completeCrmWorkOnActivity's own comment.
    await calendarService.completeCrmWorkOnActivity(businessId, contactId)
    return toInteractionDTO(interaction)
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
        ...(data.avatarAssetId !== undefined ? { avatarAssetId: data.avatarAssetId } : {}),
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
    await db.$transaction(async (tx) => {
      await syncPrimaryIdentifiers(tx, contact, 'LOOPIE')
      if (data.tags !== undefined) await syncContactTags(tx, businessId, contactId, data.tags)
    })
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
      include: { provider: true },
    })

    const hasMore = interactions.length > limit
    const items = hasMore ? interactions.slice(0, limit) : interactions
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.occurredAt.toISOString(), id: last.id })
        : null

    return {
      data: items.map(toInteractionDTO),
      meta: { hasMore, nextCursor },
    }
  }
}
