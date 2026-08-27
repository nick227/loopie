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

export class CrmSyncService {
  async run(businessId: string, integrationId: string) {
    const integration = await db.integration.findFirst({ where: { id: integrationId, businessId } })
    if (!integration) throw { statusCode: 404, message: 'Integration not found' }
    if (integration.status === 'PAUSED') throw { statusCode: 409, message: 'Integration is paused' }
    const live = getLiveConnector(integration.provider)
    const creds = readCreds(integration.credentialsEnc)
    if (!creds?.accessToken)
      throw { statusCode: 409, message: 'Connect this account with OAuth first' }

    const job = await db.importJob.create({ data: { businessId, status: 'PENDING' } })
    const cursor = parseCursor(integration.syncCursor)
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
          contact: row.contact,
          payload: row.raw,
        })
        count++
      }
      cursor.orders = batch.cursor
      if (!batch.cursor) break
    }
    return count
  }
}
