// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listAutomations', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/automations' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /automations', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/automations',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAutomations', 200, res.json())
  })
})

describe('createAutomation', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/automations' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /automations', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/automations',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createAutomation', 201, res.json())
  })
})

describe('getAutomation', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/automations/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /automations/{automationId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/automations/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getAutomation', 200, res.json())
  })
})

describe('updateAutomation', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/automations/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /automations/{automationId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/automations/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateAutomation', 200, res.json())
  })
})

describe('pauseAutomation', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/automations/00000000-0000-0000-0000-000000000001/pause' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /automations/{automationId}/pause', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/automations/00000000-0000-0000-0000-000000000001/pause',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('pauseAutomation', 200, res.json())
  })
})

describe('resumeAutomation', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/automations/00000000-0000-0000-0000-000000000001/resume' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /automations/{automationId}/resume', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/automations/00000000-0000-0000-0000-000000000001/resume',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('resumeAutomation', 200, res.json())
  })
})

describe('listAutomationLogs', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/automations/00000000-0000-0000-0000-000000000001/logs' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /automations/{automationId}/logs', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/automations/00000000-0000-0000-0000-000000000001/logs',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listAutomationLogs', 200, res.json())
  })
})
