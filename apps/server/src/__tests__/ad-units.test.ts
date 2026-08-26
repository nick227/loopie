// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listAdUnits', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/ad-units' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /ad-units', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/ad-units',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAdUnits', 200, res.json())
  })
})

describe('createAdUnit', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/ad-units' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /ad-units', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/ad-units',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createAdUnit', 201, res.json())
  })
})

describe('getAdUnit', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/ad-units/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /ad-units/{adUnitId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/ad-units/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getAdUnit', 200, res.json())
  })
})

describe('updateAdUnit', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/ad-units/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /ad-units/{adUnitId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/ad-units/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateAdUnit', 200, res.json())
  })
})
