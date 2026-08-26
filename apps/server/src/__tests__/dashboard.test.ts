// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('getHomeSummary', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/home' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /home', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/home',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getHomeSummary', 200, res.json())
  })
})

describe('getResultsSummary', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/results' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /results', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/results',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getResultsSummary', 200, res.json())
  })
})
