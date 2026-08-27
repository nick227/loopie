import { db } from '@project/db'
import { resolveContact } from '../lib/identityResolution'
import { integrationScope } from '../lib/crm/catalog'
import { getLiveConnector } from '../lib/crm/registry'
import { ExternalEventService } from './ExternalEventService'
import { readCreds } from './CrmOAuthService'
import type { Integration } from '@prisma/client'

const events = new ExternalEventService()
const MAX_PAGES = 8

type CursorState = { contacts?: string | null; orders?: string | null }

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
    const live = getLiveConnector(integration.provider)
    const creds = readCreds(integration.credentialsEnc)
    if (!creds?.accessToken)
      throw { statusCode: 409, message: 'Connect this account with OAuth first' }

    const job = await db.importJob.create({ data: { businessId, status: 'RUNNING' } })
    const cursor = parseCursor(integration.syncCursor)
    const shop = creds.shop ?? integration.externalAccountId ?? undefined

    // Explicit state handling for the whole pull/process loop — duplicate delivery and mid-sync
    // failures (a transient DB error, a malformed connector row, a race in ExternalEventService)
    // are normal, expected occurrences for a sync system, not edge cases. A failure here must
    // never leave the job silently stuck looking "in progress" forever, and a retry after a real
    // failure must resume near where this run actually stopped rather than restarting from page
    // 0 — see pullContacts/pullOrders below, which persist the cursor after every page instead
    // of only once at the very end of a fully successful run.
    try {
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

      await db.importJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', ...createdLinked },
      })
      await db.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          syncCursor: JSON.stringify(cursor),
          status: 'CONNECTED',
        },
      })
      return { ...createdLinked, orders, lastSyncAt: new Date().toISOString() }
    } catch (err) {
      await db.importJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: errorMessage(err) },
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
    let created = 0
    let linked = 0
    let ambiguous = 0
    let skipped = 0
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await live.listContacts(token, cursor.contacts ?? null, { shop })
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
              raw: row.raw,
            },
          ),
        )
        if (result.status === 'ambiguous') ambiguous++
        else if (result.created) created++
        else linked++
      }
      cursor.contacts = batch.cursor
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
    let count = 0
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await live.listOrders(token, cursor.orders ?? null, { shop })
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
          payload: row.raw,
        })
        count++
      }
      cursor.orders = batch.cursor
      await db.integration.update({
        where: { id: integration.id },
        data: { syncCursor: JSON.stringify(cursor) },
      })
      if (!batch.cursor) break
    }
    return count
  }
}
