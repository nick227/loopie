import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'

const app = buildTestApp()

describe('portable LOOPIE runtime', () => {
  it('mints a first-touch session and does not overwrite later click ids', async () => {
    const first = await app.inject({
      method: 'GET',
      url: `/t/session?businessId=${testBusinessId}&gclid=G1&utm_source=google`,
    })
    expect(first.statusCode).toBe(200)
    const token = first.json().data.token
    expect(first.json().data.platformClickIds.gclid).toBe('G1')

    const second = await app.inject({
      method: 'GET',
      url: `/t/session?businessId=${testBusinessId}&sid=${encodeURIComponent(token)}&gclid=G2&fbclid=F1`,
    })
    expect(second.statusCode).toBe(200)
    expect(second.json().data.token.split('.')[0]).toBe(token.split('.')[0])
    expect(second.json().data.platformClickIds.gclid).toBe('G1')
    expect(second.json().data.platformClickIds.fbclid).toBeUndefined()
  })

  it('catalog lists HubSpot Shopify Square Salesforce Pipedrive capabilities', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/integrations/catalog',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const providers = res.json().data.map((r: { provider: string }) => r.provider)
    expect(providers).toEqual(['HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'SQUARE', 'PIPEDRIVE'])
    const shopify = res.json().data.find((r: { provider: string }) => r.provider === 'SHOPIFY')
    expect(shopify.capabilities.orders).toBe(true)
    expect(shopify.capabilities.deals).toBe(false)
  })
})
