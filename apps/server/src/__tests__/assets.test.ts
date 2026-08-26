// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listAssets', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /assets', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/assets',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAssets', 200, res.json())
  })
})

describe('createAsset', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/assets' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /assets', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/assets',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createAsset', 201, res.json())
  })
})

describe('getAsset', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /assets/{assetId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/assets/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getAsset', 200, res.json())
  })
})

describe('deleteAsset', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/assets/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /assets/{assetId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'DELETE',
      url: '/assets/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('deleteAsset', 200, res.json())
  })
})
