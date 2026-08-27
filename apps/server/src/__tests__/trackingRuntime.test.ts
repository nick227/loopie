import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId, testOtherBusinessId } from './helpers'

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

  it("never returns another business's session state for a replayed sid (public tracking state is tenant-bound)", async () => {
    const minted = await app.inject({
      method: 'GET',
      url: `/t/session?businessId=${testBusinessId}&gclid=SECRET-A&utm_source=google&utm_campaign=business-a-only`,
    })
    expect(minted.statusCode).toBe(200)
    const sidFromA = minted.json().data.token
    expect(minted.json().data.platformClickIds.gclid).toBe('SECRET-A')

    // Replaying Business A's sid against Business B must never surface Business A's click ids/
    // UTMs — it must look like a brand-new, empty session, never an error that leaks by way of
    // a stack trace or a partial match either.
    const replayed = await app.inject({
      method: 'GET',
      url: `/t/session?businessId=${testOtherBusinessId}&sid=${encodeURIComponent(sidFromA)}`,
    })
    expect(replayed.statusCode).toBe(200)
    const replayedData = replayed.json().data
    expect(replayedData.platformClickIds.gclid).toBeUndefined()
    expect(replayedData.utms.campaign).toBeUndefined()
    expect(replayedData.sessionId).not.toBe(sidFromA.split('.')[0])

    // The replayed sid must not be usable to reach Business A's session via the /t/event path
    // either — an explicit rejection, not a silent no-op that could be mistaken for success.
    const eventReplay = await app.inject({
      method: 'POST',
      url: '/t/events',
      payload: { businessId: testOtherBusinessId, sessionId: sidFromA, type: 'PAGE_VIEW' },
    })
    expect(eventReplay.statusCode).toBe(400)

    // Business A's own session, read back with its own sid, is untouched by the replay attempt.
    const stillA = await app.inject({
      method: 'GET',
      url: `/t/session?businessId=${testBusinessId}&sid=${encodeURIComponent(sidFromA)}`,
    })
    expect(stillA.json().data.platformClickIds.gclid).toBe('SECRET-A')
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
