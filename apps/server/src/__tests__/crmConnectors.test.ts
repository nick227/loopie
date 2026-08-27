import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { issueOAuthState } from '../lib/platforms/oauthState'
import { mayFillScalar, provenanceFor } from '../lib/crm/fieldAuthority'

const app = buildTestApp()

const HS_ENV = {
  HUBSPOT_CLIENT_ID: 'hs-id',
  HUBSPOT_CLIENT_SECRET: 'hs-secret',
  HUBSPOT_REDIRECT_URI: 'http://localhost:3001/integrations/HUBSPOT/oauth/callback',
  SHOPIFY_CLIENT_ID: 'sh-id',
  SHOPIFY_CLIENT_SECRET: 'sh-secret',
  SHOPIFY_REDIRECT_URI: 'http://localhost:3001/integrations/SHOPIFY/oauth/callback',
  SESSION_SECRET: 'test-session-secret-at-least-32-chars',
  PUBLIC_APP_URL: 'http://localhost:5173',
}

function json(data: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => data }
}

function enableCrm() {
  for (const [key, value] of Object.entries(HS_ENV)) vi.stubEnv(key, value)
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('CRM field authority', () => {
  it('display values stay LOOPIE-authored when filled', () => {
    const contact = { name: 'Sarah', email: 's@x.com', phone: '1', company: 'Co' }
    expect(mayFillScalar('email', contact)).toBe(false)
    const rows = provenanceFor({ ...contact, source: 'landing-page' }, [
      { kind: 'EMAIL', normalizedValue: 's@x.com', source: 'LOOPIE', isPrimary: true },
    ])
    expect(rows.find((r) => r.field === 'email')?.source).toBe('LOOPIE')
  })
})

describe('HubSpot and Shopify connectors', () => {
  it('HubSpot OAuth callback stores a sealed token and sync pulls contacts then a won deal', async () => {
    enableCrm()
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/oauth/v1/token')) {
        return json({ access_token: 'HS_TOKEN', refresh_token: 'HS_REFRESH', expires_in: 3600 })
      }
      if (url.includes('/oauth/v1/access-tokens/')) return json({ hub_id: 99 })
      if (url.includes('/crm/v3/objects/contacts')) {
        return json({
          results: [
            {
              id: 'hs_1',
              properties: {
                email: 'hs.sync@example.com',
                firstname: 'Ada',
                lastname: 'Lovelace',
                phone: '555-0199',
              },
            },
          ],
        })
      }
      if (url.includes('/crm/v3/objects/deals')) {
        return json({
          results: [
            {
              id: 'deal_1',
              properties: {
                dealname: 'Website',
                amount: '80',
                hs_is_closed_won: 'true',
                closedate: '2026-01-15T00:00:00.000Z',
              },
              associations: { contacts: { results: [{ id: 'hs_1' }] } },
            },
          ],
        })
      }
      return json({ error: url }, 500)
    })

    const start = await app.inject({
      method: 'GET',
      url: '/integrations/HUBSPOT/oauth/start',
      headers: asAuth(testUserId),
    })
    expect(start.statusCode).toBe(200)
    expect(start.json().data.url).toContain('app.hubspot.com/oauth/authorize')

    const state = issueOAuthState({
      businessId: testBusinessId,
      platform: 'crm:HUBSPOT',
      returnPath: `/integrations?iid=${(await db.integration.findFirstOrThrow({ where: { businessId: testBusinessId, provider: 'HUBSPOT' } })).id}`,
    })
    const callback = await app.inject({
      method: 'GET',
      url: `/integrations/HUBSPOT/oauth/callback?code=abc&state=${encodeURIComponent(state)}`,
    })
    expect(callback.statusCode).toBe(302)

    const integration = await db.integration.findFirstOrThrow({
      where: { businessId: testBusinessId, provider: 'HUBSPOT' },
    })
    expect(integration.status).toBe('CONNECTED')
    expect(integration.credentialsEnc).toBeTruthy()

    const synced = await app.inject({
      method: 'POST',
      url: `/integrations/${integration.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(synced.statusCode).toBe(200)
    expect(synced.json().data.created).toBe(1)
    expect(synced.json().data.orders).toBe(1)

    const contact = await db.contact.findFirstOrThrow({
      where: { businessId: testBusinessId, email: 'hs.sync@example.com' },
    })
    const sale = await db.sale.findFirstOrThrow({ where: { contactId: contact.id } })
    expect(Number(sale.amount)).toBe(80)

    const detail = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    expect(detail.json().data.revenue).toBe(80)
    expect(detail.json().data.provenance.some((p: { field: string }) => p.field === 'email')).toBe(
      true,
    )
  })

  it('Shopify OAuth requires a shop and sync materializes an order as a Sale', async () => {
    enableCrm()
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/admin/oauth/access_token')) return json({ access_token: 'SH_TOKEN' })
      if (url.includes('/customers.json')) {
        return json({
          customers: [
            { id: 11, first_name: 'Pat', last_name: 'Buyer', email: 'pat.shop@example.com' },
          ],
        })
      }
      if (url.includes('/orders.json')) {
        return json({
          orders: [
            {
              id: 77,
              name: '#1001',
              total_price: '42.50',
              created_at: '2026-02-01T00:00:00Z',
              customer: {
                id: 11,
                email: 'pat.shop@example.com',
                first_name: 'Pat',
                last_name: 'Buyer',
              },
            },
          ],
        })
      }
      return json({ error: url }, 500)
    })

    const missing = await app.inject({
      method: 'GET',
      url: '/integrations/SHOPIFY/oauth/start',
      headers: asAuth(testUserId),
    })
    expect(missing.statusCode).toBe(400)

    const start = await app.inject({
      method: 'GET',
      url: '/integrations/SHOPIFY/oauth/start?shop=acme',
      headers: asAuth(testUserId),
    })
    expect(start.statusCode).toBe(200)
    expect(start.json().data.url).toContain('acme.myshopify.com')

    const row = await db.integration.findFirstOrThrow({
      where: { businessId: testBusinessId, provider: 'SHOPIFY' },
    })
    const state = issueOAuthState({
      businessId: testBusinessId,
      platform: 'crm:SHOPIFY',
      returnPath: `/integrations?iid=${row.id}`,
    })
    const callback = await app.inject({
      method: 'GET',
      url: `/integrations/SHOPIFY/oauth/callback?code=xyz&state=${encodeURIComponent(state)}`,
    })
    expect(callback.statusCode).toBe(302)

    const synced = await app.inject({
      method: 'POST',
      url: `/integrations/${row.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(synced.statusCode).toBe(200)
    expect(synced.json().data.created).toBe(1)
    expect(synced.json().data.orders).toBe(1)
    const sale = await db.sale.findFirstOrThrow({
      where: { businessId: testBusinessId, idempotencyKey: 'SHOPIFY:order:77' },
    })
    expect(Number(sale.amount)).toBe(42.5)
  })

  it('graph audiences match recent buyers and ad leads with no purchase', async () => {
    const buyer = await db.contact.create({
      data: {
        businessId: testBusinessId,
        name: 'Buyer',
        email: 'aud.buy@example.com',
        emailEligible: true,
      },
    })
    await db.sale.create({
      data: {
        businessId: testBusinessId,
        contactId: buyer.id,
        amount: 10,
        date: new Date(),
        sourceType: 'MANUAL',
        idempotencyKey: 'aud-sale-1',
      },
    })
    const lead = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Lead', email: 'aud.lead@example.com' },
    })
    await db.lead.create({
      data: { businessId: testBusinessId, contactId: lead.id, sourceType: 'AD_RUN' },
    })

    const recent = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Recent customers', type: 'PREDEFINED' },
    })
    const never = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Ad leads that never bought', type: 'PREDEFINED' },
    })
    const shopify = await db.audience.create({
      data: {
        businessId: testBusinessId,
        name: 'Shopify customers',
        type: 'SAVED_FILTER',
        filter: { provider: 'SHOPIFY' },
      },
    })
    await db.externalContactRecord.create({
      data: {
        businessId: testBusinessId,
        contactId: buyer.id,
        provider: 'SHOPIFY',
        externalId: '11',
        scopeKey: 'shop-aud',
        matchStatus: 'LINKED',
      },
    })

    const recentList = await app.inject({
      method: 'GET',
      url: `/audiences/${recent.id}/contacts`,
      headers: asAuth(testUserId),
    })
    expect(recentList.json().data.some((c: { id: string }) => c.id === buyer.id)).toBe(true)

    const neverList = await app.inject({
      method: 'GET',
      url: `/audiences/${never.id}/contacts`,
      headers: asAuth(testUserId),
    })
    expect(neverList.json().data.some((c: { id: string }) => c.id === lead.id)).toBe(true)
    expect(neverList.json().data.some((c: { id: string }) => c.id === buyer.id)).toBe(false)

    const shopifyList = await app.inject({
      method: 'GET',
      url: `/audiences/${shopify.id}/contacts`,
      headers: asAuth(testUserId),
    })
    expect(shopifyList.json().data.some((c: { id: string }) => c.id === buyer.id)).toBe(true)
  })
})
