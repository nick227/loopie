// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listAffiliates', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/affiliates' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /affiliates', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/affiliates',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAffiliates', 200, res.json())
  })
})

describe('createAffiliate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/affiliates' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /affiliates', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/affiliates',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createAffiliate', 201, res.json())
  })
})

describe('getAffiliate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/affiliates/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /affiliates/{affiliateId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/affiliates/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getAffiliate', 200, res.json())
  })
})

describe('updateAffiliate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/affiliates/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /affiliates/{affiliateId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/affiliates/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateAffiliate', 200, res.json())
  })
})

describe('pauseAffiliate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/affiliates/00000000-0000-0000-0000-000000000001/pause' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /affiliates/{affiliateId}/pause', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/affiliates/00000000-0000-0000-0000-000000000001/pause',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('pauseAffiliate', 200, res.json())
  })
})

describe('resumeAffiliate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/affiliates/00000000-0000-0000-0000-000000000001/resume' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /affiliates/{affiliateId}/resume', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/affiliates/00000000-0000-0000-0000-000000000001/resume',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('resumeAffiliate', 200, res.json())
  })
})

describe('listAffiliateClasses', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/affiliate-classes' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /affiliate-classes', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/affiliate-classes',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAffiliateClasses', 200, res.json())
  })
})

describe('createAffiliateClass', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/affiliate-classes' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /affiliate-classes', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/affiliate-classes',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createAffiliateClass', 201, res.json())
  })
})

describe('getAffiliateClass', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/affiliate-classes/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /affiliate-classes/{classId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/affiliate-classes/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getAffiliateClass', 200, res.json())
  })
})

describe('updateAffiliateClass', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/affiliate-classes/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /affiliate-classes/{classId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/affiliate-classes/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateAffiliateClass', 200, res.json())
  })
})

describe('listAffiliateDeals', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/affiliate-deals' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /affiliate-deals', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/affiliate-deals',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAffiliateDeals', 200, res.json())
  })
})

describe('createAffiliateDeal', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/affiliate-deals' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /affiliate-deals', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/affiliate-deals',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createAffiliateDeal', 201, res.json())
  })
})

describe('getAffiliateDeal', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/affiliate-deals/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /affiliate-deals/{dealId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/affiliate-deals/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getAffiliateDeal', 200, res.json())
  })
})

describe('updateAffiliateDeal', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/affiliate-deals/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /affiliate-deals/{dealId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/affiliate-deals/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateAffiliateDeal', 200, res.json())
  })
})

describe('getMyAffiliate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/affiliates/me' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /affiliates/me', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/affiliates/me',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getMyAffiliate', 200, res.json())
  })
})

describe('getAffiliateEarnings', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/affiliates/00000000-0000-0000-0000-000000000001/earnings' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /affiliates/{affiliateId}/earnings', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/affiliates/00000000-0000-0000-0000-000000000001/earnings',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getAffiliateEarnings', 200, res.json())
  })
})

describe('createAffiliateConnectOnboarding', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/affiliates/00000000-0000-0000-0000-000000000001/connect/onboarding' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /affiliates/{affiliateId}/connect/onboarding', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/affiliates/00000000-0000-0000-0000-000000000001/connect/onboarding',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createAffiliateConnectOnboarding', 201, res.json())
  })
})

describe('syncAffiliateConnect', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/affiliates/00000000-0000-0000-0000-000000000001/connect/sync' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /affiliates/{affiliateId}/connect/sync', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/affiliates/00000000-0000-0000-0000-000000000001/connect/sync',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('syncAffiliateConnect', 200, res.json())
  })
})
