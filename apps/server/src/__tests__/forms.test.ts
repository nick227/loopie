// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listForms', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/forms' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /forms', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/forms',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listForms', 200, res.json())
  })
})

describe('createForm', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/forms' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /forms', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createForm', 201, res.json())
  })
})

describe('getForm', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/forms/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /forms/{formId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/forms/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getForm', 200, res.json())
  })
})

describe('updateForm', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/forms/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /forms/{formId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/forms/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateForm', 200, res.json())
  })
})

describe('deleteForm', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/forms/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /forms/{formId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'DELETE',
      url: '/forms/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('deleteForm', 200, res.json())
  })
})
