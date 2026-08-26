// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listLandingPageTemplates', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/landing-page-templates' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /landing-page-templates', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/landing-page-templates',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listLandingPageTemplates', 200, res.json())
  })
})

describe('getLandingPageTemplate', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/landing-page-templates/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /landing-page-templates/{templateId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/landing-page-templates/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getLandingPageTemplate', 200, res.json())
  })
})

describe('listLandingPages', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/landing-pages' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /landing-pages', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listLandingPages', 200, res.json())
  })
})

describe('createLandingPage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/landing-pages' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /landing-pages', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createLandingPage', 201, res.json())
  })
})

describe('getLandingPage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/landing-pages/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /landing-pages/{landingPageId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getLandingPage', 200, res.json())
  })
})

describe('updateLandingPage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/landing-pages/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /landing-pages/{landingPageId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateLandingPage', 200, res.json())
  })
})

describe('deleteLandingPage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/landing-pages/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /landing-pages/{landingPageId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'DELETE',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('deleteLandingPage', 200, res.json())
  })
})

describe('publishLandingPage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/landing-pages/00000000-0000-0000-0000-000000000001/publish' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /landing-pages/{landingPageId}/publish', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001/publish',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('publishLandingPage', 201, res.json())
  })
})

describe('listLandingPageVersions', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/landing-pages/00000000-0000-0000-0000-000000000001/versions' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /landing-pages/{landingPageId}/versions', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001/versions',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listLandingPageVersions', 200, res.json())
  })
})

describe('exportLandingPage', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/landing-pages/00000000-0000-0000-0000-000000000001/export' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /landing-pages/{landingPageId}/export', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001/export',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('exportLandingPage', 200, res.json())
  })
})

describe('getLandingPagePerformance', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/landing-pages/00000000-0000-0000-0000-000000000001/performance' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /landing-pages/{landingPageId}/performance', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001/performance',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getLandingPagePerformance', 200, res.json())
  })
})

describe('recordLandingPageFormStart', () => {
  it('POST /landing-pages/{landingPageId}/form-start', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001/form-start',
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('recordLandingPageFormStart', 200, res.json())
  })
})

describe('submitLandingPageForm', () => {
  it('POST /landing-pages/{landingPageId}/submissions', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/landing-pages/00000000-0000-0000-0000-000000000001/submissions',
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('submitLandingPageForm', 201, res.json())
  })
})

describe('servePublishedLandingPage', () => {
  it('GET /p/{slug}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/p/00000000-0000-0000-0000-000000000001',
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('servePublishedLandingPage', 200, res.json())
  })
})
