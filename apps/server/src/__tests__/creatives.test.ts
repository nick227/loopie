// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listCreatives', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/creatives' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /creatives', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/creatives',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listCreatives', 200, res.json())
  })
})

describe('createCreative', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/creatives' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /creatives', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/creatives',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createCreative', 201, res.json())
  })
})

describe('getCreative', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/creatives/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /creatives/{creativeId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/creatives/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getCreative', 200, res.json())
  })
})

describe('updateCreative', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/creatives/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /creatives/{creativeId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/creatives/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateCreative', 200, res.json())
  })
})

describe('deleteCreative', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/creatives/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /creatives/{creativeId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'DELETE',
      url: '/creatives/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('deleteCreative', 200, res.json())
  })
})
