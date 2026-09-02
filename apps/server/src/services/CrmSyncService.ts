import { db } from '@project/db'
import { resolveContact } from '../lib/identityResolution'
import { integrationScope } from '../lib/crm/catalog'
import { getLiveConnector } from '../lib/crm/registry'
import { ExternalEventService } from './ExternalEventService'
import { readCreds } from './CrmOAuthService'
import type { Integration } from '@prisma/client'

const events = new ExternalEventService()
const MAX_PAGES = 8

type CursorState = {
  contacts?: string | null
  orders?: string | null
  contactsDone?: boolean
  ordersDone?: boolean
}

function parseCursor(raw: string | null): CursorState {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as CursorState
  } catch {
    return { contacts: raw }
  }
}

function errorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err)
  return raw.slice(0, 2000)
}

export class CrmSyncService {
  async run(businessId: string, integrationId: string) {
    const integration = await db.integration.findFirst({ where: { id: integrationId, businessId } })
    if (!integration) throw { statusCode: 404, message: 'Integration not found' }
    if (integration.status === 'PAUSED') throw { statusCode: 409, message: 'Integration is paused' }
    await db.integration.update({
      where: { id: integration.id },
      data: { lastSyncAttemptAt: new Date(), lastSyncError: null },
    })
    const job = await db.importJob.create({
      data: { businessId, integrationId: integration.id, status: 'RUNNING' },
    })
    const contactsBefore = await db.contact.count({ where: { businessId, deletedAt: null } })
    const cursor = parseCursor(integration.syncCursor)

    // Explicit state handling for the whole pull/process loop — duplicate delivery and mid-sync
    // failures (a transient DB error, a malformed connector row, a race in ExternalEventService)
    // are normal, expected occurrences for a sync system, not edge cases. A failure here must
    // never leave the job silently stuck looking "in progress" forever, and a retry after a real
    // failure must resume near where this run actually stopped rather than restarting from page
    // 0 — see pullContacts/pullOrders below, which persist the cursor after every page instead
    // of only once at the very end of a fully successful run.
    try {
      const live = getLiveConnector(integration.provider)
      const creds = readCreds(integration.credentialsEnc)
      if (!creds?.accessToken)
        throw { statusCode: 409, message: 'This integration is missing its credentials' }
      const shop = creds.shop ?? integration.externalAccountId ?? undefined
      const createdLinked = await this.pullContacts(
        integration,
        live,
        creds.accessToken,
        cursor,
        shop,
        job.id,
      )
      const orders = live.listOrders
        ? await this.pullOrders(integration, live, creds.accessToken, cursor, shop)
        : 0
      if (!live.listOrders) cursor.ordersDone = true
      // Order payloads can create contacts too (notably WooCommerce guest checkout identities),
      // so the connector-page counters alone under-report what the import actually created.
      const contactsAfter = await db.contact.count({ where: { businessId, deletedAt: null } })
      const result = {
        ...createdLinked,
        created: Math.max(0, contactsAfter - contactsBefore),
      }

      const hasMore = !cursor.contactsDone || !cursor.ordersDone
      const successfulAt = new Date()
      await db.importJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', ...result },
      })
      const persistedCursor: CursorState = hasMore
        ? cursor
        : { contacts: null, orders: cursor.orders, contactsDone: false, ordersDone: false }
      await db.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: successfulAt,
          lastSyncError: null,
          syncHasMore: hasMore,
          syncCursor: JSON.stringify(persistedCursor),
          status: 'CONNECTED',
        },
      })
      return { ...result, orders, hasMore, lastSyncAt: successfulAt.toISOString() }
    } catch (err) {
      const message = errorMessage(err)
      await db.importJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: message },
      })
      await db.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncError: message,
          syncHasMore: true,
          syncCursor: JSON.stringify(cursor),
        },
      })
      throw err
    }
  }

  private async pullContacts(
    integration: Integration,
    live: ReturnType<typeof getLiveConnector>,
    token: string,
    cursor: CursorState,
    shop: string | undefined,
    importJobId: string,
  ) {
    if (cursor.contactsDone) return { created: 0, linked: 0, ambiguous: 0, skipped: 0 }
    let created = 0
    let linked = 0
    let ambiguous = 0
    let skipped = 0
    for (let page = 0; page < MAX_PAGES; page++) {
      const creds = readCreds(integration.credentialsEnc)
      const batch = await live.listContacts(token, cursor.contacts ?? null, {
        shop,
        secret: creds?.consumerSecret,
      })
      for (const row of batch.contacts) {
        if (!row.email && !row.phone && !row.externalId) {
          skipped++
          continue
        }
        const result = await db.$transaction((tx) =>
          resolveContact(
            tx,
            integration.businessId,
            {
              name: row.name,
              email: row.email,
              phone: row.phone,
              company: row.company,
              source: integration.provider,
            },
            {
              provider: integration.provider,
              externalId: row.externalId,
              scopeKey: integrationScope(integration.id),
              integrationId: integration.id,
              importJobId,
              externalUpdatedAt: row.externalUpdatedAt,
              sourceSnapshot: {
                name: row.name,
                email: row.email,
                phone: row.phone,
                company: row.company,
              },
              raw: row.raw,
            },
          ),
        )
        if (result.status === 'ambiguous') ambiguous++
        else if (result.created) created++
        else linked++
      }
      cursor.contacts = batch.cursor ?? batch.checkpoint ?? null
      cursor.contactsDone = !batch.cursor
      // Persist after every fully-processed page, not just once at the end of a fully successful
      // run — if a later page (or pullOrders afterward) throws, this page's progress must not be
      // discarded and re-processed from scratch on the next retry.
      await db.integration.update({
        where: { id: integration.id },
        data: { syncCursor: JSON.stringify(cursor) },
      })
      if (!batch.cursor) break
    }
    return { created, linked, ambiguous, skipped }
  }

  private async pullOrders(
    integration: Integration,
    live: ReturnType<typeof getLiveConnector>,
    token: string,
    cursor: CursorState,
    shop: string | undefined,
  ) {
    if (!live.listOrders) return 0
    if (cursor.ordersDone) return 0
    let count = 0
    for (let page = 0; page < MAX_PAGES; page++) {
      const creds = readCreds(integration.credentialsEnc)
      const batch = await live.listOrders(token, cursor.orders ?? null, {
        shop,
        secret: creds?.consumerSecret,
      })
      for (const row of batch.orders) {
        await events.ingest(integration.businessId, {
          integrationId: integration.id,
          type: integration.provider === 'HUBSPOT' ? 'DEAL_WON' : 'ORDER_CREATED',
          externalEventId: row.externalEventId,
          occurredAt: row.occurredAt,
          amount: row.amount,
          productOrService: row.productOrService,
          // Connector rows use `string | null` for a missing email/phone (raw CRM JSON commonly
          // sends an explicit null rather than omitting the key); ExternalEventService's input
          // type only accepts `string | undefined`. Both are already treated identically
          // downstream (normalizeEmail/normalizePhone treat null and undefined the same, and the
          // `contactPayload.email || contactPayload.phone || ...` gate is falsy for either) — this
          // is a type-level coercion only, not a behavior change.
          contact: {
            ...row.contact,
            email: row.contact.email ?? undefined,
            phone: row.contact.phone ?? undefined,
          },
          // The customers endpoint was reconciled immediately before orders. Registered-order
          // billing can be an old checkout snapshot, so it may identify the contact but must not
          // roll current customer fields backward. Guest orders have no customer record and stay
          // event-managed.
          updateContactFromEvent: !(
            integration.provider === 'WOOCOMMERCE' &&
            row.contact.externalId?.startsWith('customer:')
          ),
          payload: row.raw,
        })
        count++
      }
      cursor.orders = batch.cursor ?? batch.checkpoint ?? cursor.orders ?? null
      cursor.ordersDone = !batch.cursor
      await db.integration.update({
        where: { id: integration.id },
        data: { syncCursor: JSON.stringify(cursor) },
      })
      if (!batch.cursor) break
    }
    return count
  }
}
