// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listSales', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/sales' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /sales', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/sales',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listSales', 200, res.json())
  })
})

describe('createSale', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/sales' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /sales', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createSale', 201, res.json())
  })
})

describe('getSale', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/sales/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /sales/{saleId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/sales/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getSale', 200, res.json())
  })
})

describe('reverseSale', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/sales/00000000-0000-0000-0000-000000000001/reverse' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /sales/{saleId}/reverse', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/sales/00000000-0000-0000-0000-000000000001/reverse',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('reverseSale', 200, res.json())
  })
})
