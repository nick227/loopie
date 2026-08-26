// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listAudiences', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/audiences' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /audiences', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/audiences',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAudiences', 200, res.json())
  })
})

describe('createAudience', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/audiences' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /audiences', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/audiences',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createAudience', 201, res.json())
  })
})

describe('getAudience', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/audiences/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /audiences/{audienceId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/audiences/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getAudience', 200, res.json())
  })
})

describe('updateAudience', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/audiences/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /audiences/{audienceId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/audiences/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateAudience', 200, res.json())
  })
})

describe('deleteAudience', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/audiences/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /audiences/{audienceId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'DELETE',
      url: '/audiences/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('deleteAudience', 200, res.json())
  })
})

describe('listAudienceContacts', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/audiences/00000000-0000-0000-0000-000000000001/contacts' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /audiences/{audienceId}/contacts', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/audiences/00000000-0000-0000-0000-000000000001/contacts',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAudienceContacts', 200, res.json())
  })
})
