// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listContacts', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/contacts' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /contacts', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/contacts',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listContacts', 200, res.json())
  })
})

describe('createContact', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/contacts' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /contacts', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/contacts',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createContact', 201, res.json())
  })
})

describe('importContacts', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/contacts/import' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /contacts/import', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/contacts/import',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('importContacts', 200, res.json())
  })
})

describe('getContact', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/contacts/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /contacts/{contactId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/contacts/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getContact', 200, res.json())
  })
})

describe('updateContact', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/contacts/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /contacts/{contactId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/contacts/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateContact', 200, res.json())
  })
})

describe('deleteContact', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/contacts/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /contacts/{contactId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'DELETE',
      url: '/contacts/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('deleteContact', 200, res.json())
  })
})

describe('listContactInteractions', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/contacts/00000000-0000-0000-0000-000000000001/interactions' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /contacts/{contactId}/interactions', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/contacts/00000000-0000-0000-0000-000000000001/interactions',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listContactInteractions', 200, res.json())
  })
})
