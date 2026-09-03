// Next Steps Assistant — verifies GET /assistant/next-step walks the locked V1 happy path
// (business info -> logo -> homepage -> publish) purely from live Business/LandingPage state,
// driving each transition through the same real operations the client would call. See CLAUDE.md
// "Next Steps Assistant" plan.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId } from './helpers'

const app = buildTestApp()

const HOMEPAGE_TEMPLATE_ID = 'system-template-corporate-professional'

async function getNextStep() {
  const res = await app.inject({
    method: 'GET',
    url: '/assistant/next-step',
    headers: asAuth(testUserId),
  })
  expect(res.statusCode).toBe(200)
  return res.json().data
}

describe('getNextStep', () => {
  it('walks the full business info -> logo -> homepage -> publish happy path', async () => {
    // Seeded business (see helpers/index.ts) only has name set — industry/location are missing.
    let step = await getNextStep()
    expect(step.actionId).toBe('business_info')
    expect(step.fields.map((f: any) => f.name).sort()).toEqual(['industry', 'location'])
    expect(step.progress).toEqual({ completed: 0, total: 4 })

    const infoRes = await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(testUserId),
      payload: { industry: 'Landscaping', location: 'Austin, TX' },
    })
    expect(infoRes.statusCode).toBe(200)

    step = await getNextStep()
    expect(step.actionId).toBe('business_logo')
    expect(step.progress).toEqual({ completed: 1, total: 4 })

    const logoRes = await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(testUserId),
      payload: { logoUrl: 'https://example.com/logo.png' },
    })
    expect(logoRes.statusCode).toBe(200)

    step = await getNextStep()
    expect(step.actionId).toBe('homepage_create')
    expect(step.progress).toEqual({ completed: 2, total: 4 })

    const createRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: HOMEPAGE_TEMPLATE_ID,
        name: 'Homepage',
        slug: `assistant-homepage-${Date.now()}`,
      },
    })
    expect(createRes.statusCode).toBe(201)
    const landingPageId = createRes.json().data.id

    step = await getNextStep()
    expect(step.actionId).toBe('homepage_publish')
    expect(step.landingPageId).toBe(landingPageId)
    expect(step.progress).toEqual({ completed: 3, total: 4 })

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${landingPageId}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)

    step = await getNextStep()
    expect(step.actionId).toBeNull()
    expect(step.progress).toEqual({ completed: 4, total: 4 })
  })
})
