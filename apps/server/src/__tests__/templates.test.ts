// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listTemplates', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/templates' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /templates', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/templates',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listTemplates', 200, res.json())
  })
})

describe('createTemplate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/templates' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /templates', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/templates',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createTemplate', 201, res.json())
  })
})

describe('getTemplate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/templates/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /templates/{templateId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/templates/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getTemplate', 200, res.json())
  })
})

describe('updateTemplate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/templates/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /templates/{templateId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/templates/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateTemplate', 200, res.json())
  })
})

describe('deleteTemplate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/templates/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /templates/{templateId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'DELETE',
      url: '/templates/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('deleteTemplate', 200, res.json())
  })
})
