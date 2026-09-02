import { db } from '@project/db'
import { getLiveConnector } from '../lib/crm/registry'
import { integrationScope } from '../lib/crm/catalog'
import { matchIdentity } from '../lib/identityMatch'
import { normalizeEmail, normalizePhone } from '../lib/identityResolution'
import { readCreds } from './CrmOAuthService'

const MAX_PREVIEW_PAGES = 8

type Candidate = {
  externalId?: string
  email?: string | null
  phone?: string | null
}

export class CrmPreviewService {
  async run(businessId: string, integrationId: string) {
    const integration = await db.integration.findFirst({ where: { id: integrationId, businessId } })
    if (!integration) throw { statusCode: 404, message: 'Integration not found' }
    const live = getLiveConnector(integration.provider)
    const creds = readCreds(integration.credentialsEnc)
    if (!creds?.accessToken) throw { statusCode: 409, message: 'Connect this account first' }
    const opts = {
      shop: creds.shop ?? integration.externalAccountId ?? undefined,
      secret: creds.consumerSecret,
    }

    const candidates: Candidate[] = []
    let contactCursor: string | null = null
    let orderCursor: string | null = null
    let orders = 0
    let revenue = 0
    let truncated = false

    for (let page = 0; page < MAX_PREVIEW_PAGES; page++) {
      const batch = await live.listContacts(creds.accessToken, contactCursor, opts)
      candidates.push(...batch.contacts)
      contactCursor = batch.cursor
      if (!contactCursor) break
      if (page === MAX_PREVIEW_PAGES - 1) truncated = true
    }

    if (live.listOrders) {
      for (let page = 0; page < MAX_PREVIEW_PAGES; page++) {
        const batch = await live.listOrders(creds.accessToken, orderCursor, opts)
        orders += batch.orders.length
        revenue += batch.orders.reduce((sum, order) => sum + order.amount, 0)
        candidates.push(...batch.orders.map((order) => order.contact))
        orderCursor = batch.cursor
        if (!orderCursor) break
        if (page === MAX_PREVIEW_PAGES - 1) truncated = true
      }
    }

    let newContacts = 0
    let matchedContacts = 0
    let duplicates = 0
    const seen = new Set<string>()
    const scopeKey = integrationScope(integration.id)

    for (const candidate of candidates) {
      const email = normalizeEmail(candidate.email)
      const phone = normalizePhone(candidate.phone)
      const key = email
        ? `email:${email}`
        : phone
          ? `phone:${phone}`
          : `external:${candidate.externalId}`
      if (seen.has(key)) {
        duplicates++
        continue
      }
      seen.add(key)
      const match = await matchIdentity(db, businessId, {
        email,
        phone,
        externalId: candidate.externalId,
        scopeKey,
      })
      if (match.status === 'none') newContacts++
      else matchedContacts++
    }

    return {
      newContacts,
      matchedContacts,
      duplicates,
      orders,
      revenue: Math.round(revenue * 100) / 100,
      truncated,
    }
  }
}
