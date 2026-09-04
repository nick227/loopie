// Next Steps Assistant — verifies GET /assistant/next-action walks the full cross-product
// priority chain (Business -> Pages -> Advertising -> Calendar fallback) purely from live state,
// driving each transition through the same real operations the client would call. See CLAUDE.md
// "Next Steps Assistant" and the "Assistant as cross-product operator" plan.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

const HOMEPAGE_TEMPLATE_ID = 'system-template-corporate-professional'

async function getNextAction() {
  const res = await app.inject({
    method: 'GET',
    url: '/assistant/next-action',
    headers: asAuth(testUserId),
  })
  expect(res.statusCode).toBe(200)
  return res.json().data
}

describe('getNextAction', () => {
  it('walks Business -> Pages -> Advertising -> Calendar in priority order', async () => {
    // --- BUSINESS_PROFILE ---
    // Seeded business (see helpers/index.ts) only has name set — every core field is missing.
    let action = await getNextAction()
    expect(action.type).toBe('BUSINESS_PROFILE')
    expect(action.actionId).toBe('business_info')
    expect(action.fields.map((f: any) => f.name).sort()).toEqual([
      'description',
      'email',
      'industry',
      'location',
      'phone',
    ])

    await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(testUserId),
      payload: {
        industry: 'Landscaping',
        location: 'Austin, TX',
        phone: '555-0100',
        email: 'hi@example.com',
        description: 'We do landscaping.',
      },
    })

    action = await getNextAction()
    expect(action).toMatchObject({ type: 'BUSINESS_PROFILE', actionId: 'business_logo' })

    await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(testUserId),
      payload: { logoUrl: 'https://example.com/logo.png' },
    })

    // --- PAGE: homepage ---
    action = await getNextAction()
    expect(action).toMatchObject({ type: 'PAGE', actionId: 'homepage_create' })

    const homepageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: HOMEPAGE_TEMPLATE_ID,
        name: 'Homepage',
        slug: `assistant-homepage-${Date.now()}`,
      },
    })
    expect(homepageRes.statusCode).toBe(201)
    const homepageId = homepageRes.json().data.id

    action = await getNextAction()
    expect(action).toMatchObject({
      type: 'PAGE',
      actionId: 'homepage_publish',
      landingPageId: homepageId,
    })
    expect(action.homepageUrl).toBeNull()

    await app.inject({
      method: 'POST',
      url: `/landing-pages/${homepageId}/publish`,
      headers: asAuth(testUserId),
    })

    // Homepage published, no other draft page yet, no campaign yet -> falls through PAGE
    // straight into ADVERTISING, promoting the homepage itself.
    action = await getNextAction()
    expect(action).toMatchObject({
      type: 'ADVERTISING',
      actionId: 'campaign_create',
      landingPageId: homepageId,
      pageName: 'Homepage',
    })
    expect(action.pageUrl).toContain('/p/')
    expect(action.homepageUrl).toContain('/p/')

    // --- PAGE still outranks ADVERTISING: create a second draft page before creating a
    // campaign, and confirm the resolver goes back to PAGE, not ADVERTISING. ---
    const otherPageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: 'system-template-lead-gen',
        name: 'Lead capture',
        slug: `assistant-other-page-${Date.now()}`,
      },
    })
    expect(otherPageRes.statusCode).toBe(201)
    const otherPageId = otherPageRes.json().data.id

    action = await getNextAction()
    expect(action).toMatchObject({
      type: 'PAGE',
      actionId: 'page_publish',
      landingPageId: otherPageId,
      pageName: 'Lead capture',
    })

    await app.inject({
      method: 'POST',
      url: `/landing-pages/${otherPageId}/publish`,
      headers: asAuth(testUserId),
    })

    // Both pages published now, neither promoted yet -> ADVERTISING picks the most recently
    // published one (the "other" page) — resolver order isn't homepage-first, it's
    // most-recently-published-first, same convention used elsewhere in this resolver.
    action = await getNextAction()
    expect(action).toMatchObject({
      type: 'ADVERTISING',
      actionId: 'campaign_create',
      landingPageId: otherPageId,
    })

    // --- ADVERTISING: create the promotion campaign with no creatives ---
    const campaignRes = await app.inject({
      method: 'POST',
      url: '/campaigns',
      headers: asAuth(testUserId),
      payload: { name: 'Promote Lead capture', destinationUrl: action.pageUrl },
    })
    expect(campaignRes.statusCode).toBe(201)
    const campaignId = campaignRes.json().data.id

    action = await getNextAction()
    expect(action).toEqual({
      type: 'ADVERTISING',
      actionId: 'campaign_resume',
      operationId: null,
      fields: null,
      landingPageId: null,
      pageName: null,
      pageUrl: null,
      campaignId,
      cycleId: null,
      step: null,
      knownFacts: null,
      plan: null,
      growSummary: null,
      signalSummary: null,
      homepageUrl: expect.stringContaining('/p/'),
    })

    // --- Attach a creative -> that campaign no longer "needs completion" -> the homepage is
    // still an unpromoted published page, so ADVERTISING surfaces it next. ---
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Lead capture ad' },
    })
    await db.campaignCreative.create({ data: { campaignId, creativeId: creative.id } })

    action = await getNextAction()
    expect(action).toMatchObject({
      type: 'ADVERTISING',
      actionId: 'campaign_create',
      landingPageId: homepageId,
    })

    // Promote the homepage too, with a creative attached from the start this time.
    const homepageCampaignRes = await app.inject({
      method: 'POST',
      url: '/campaigns',
      headers: asAuth(testUserId),
      payload: { name: 'Promote Homepage', destinationUrl: action.pageUrl },
    })
    expect(homepageCampaignRes.statusCode).toBe(201)
    const homepageCampaignId = homepageCampaignRes.json().data.id
    const homepageCreative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Homepage ad' },
    })
    await db.campaignCreative.create({
      data: { campaignId: homepageCampaignId, creativeId: homepageCreative.id },
    })

    // Both pages promoted, both campaigns complete -> the Business/Page/Advertising chain has
    // nothing left, so the Assistant now offers to start a goal cycle (the "Assistant becomes the
    // consultant" pass, 2026-09-04) instead of falling straight to CALENDAR — no active cycle
    // exists yet for this business, so it's the very first Learn question (venture family).
    action = await getNextAction()
    expect(action).toEqual({
      type: 'GOAL_CYCLE',
      actionId: 'learn_step',
      operationId: null,
      fields: null,
      landingPageId: null,
      pageName: null,
      pageUrl: null,
      campaignId: null,
      cycleId: null,
      step: {
        key: 'venture_family',
        heading: 'Tell Loopie about your business.',
        choices: expect.any(Array),
        writesKnowledge: 'ventureFamily',
      },
      knownFacts: [],
      plan: null,
      growSummary: null,
      signalSummary: null,
      homepageUrl: expect.stringContaining('/p/'),
    })
    expect(action.step.choices.length).toBeGreaterThan(0)
    expect(action.step.choices.length).toBeLessThanOrEqual(7)
  })
})
