// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listMessages', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/messages' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /messages', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/messages',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listMessages', 200, res.json())
  })
})

describe('createMessage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/messages' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /messages', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createMessage', 201, res.json())
  })
})

describe('getMessage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/messages/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /messages/{messageId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/messages/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getMessage', 200, res.json())
  })
})

describe('updateMessage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/messages/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /messages/{messageId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/messages/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateMessage', 200, res.json())
  })
})

describe('deleteMessage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/messages/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /messages/{messageId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'DELETE',
      url: '/messages/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('deleteMessage', 200, res.json())
  })
})

describe('sendMessage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/messages/00000000-0000-0000-0000-000000000001/send' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /messages/{messageId}/send', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/messages/00000000-0000-0000-0000-000000000001/send',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('sendMessage', 200, res.json())
  })
})

describe('testSendMessage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/messages/00000000-0000-0000-0000-000000000001/test-send' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /messages/{messageId}/test-send', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/messages/00000000-0000-0000-0000-000000000001/test-send',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('testSendMessage', 200, res.json())
  })
})

describe('getMessagePerformance', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/messages/00000000-0000-0000-0000-000000000001/performance' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /messages/{messageId}/performance', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/messages/00000000-0000-0000-0000-000000000001/performance',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getMessagePerformance', 200, res.json())
  })
})
