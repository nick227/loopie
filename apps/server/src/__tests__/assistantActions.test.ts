// Pure resolver unit tests — no DB. The integration test (assistant.test.ts) exercises the
// Prisma orchestration and priority chain end to end; this covers each resolver's branches in
// isolation.
import { describe, it, expect } from 'vitest'
import {
  resolveBusinessProfileAction,
  resolvePageAction,
  resolveAdvertisingAction,
  resolveCalendarAction,
} from '../lib/assistantActions'

function business(overrides: Record<string, unknown> = {}) {
  return {
    industry: 'Landscaping',
    location: 'Austin, TX',
    phone: '555-0100',
    email: 'hi@example.com',
    description: 'We do landscaping.',
    logoUrl: 'https://example.com/logo.png',
    ...overrides,
  } as any
}

function page(overrides: Record<string, unknown> = {}) {
  return { id: 'page-1', name: 'Homepage', status: 'DRAFT', ...overrides } as any
}

describe('resolveBusinessProfileAction', () => {
  it('returns null when every core field and the logo are present', () => {
    expect(resolveBusinessProfileAction(business())).toBeNull()
  })

  for (const key of ['industry', 'location', 'phone', 'email', 'description']) {
    it(`flags business_info when ${key} is missing`, () => {
      const action = resolveBusinessProfileAction(business({ [key]: null }))
      expect(action).toMatchObject({ type: 'BUSINESS_PROFILE', actionId: 'business_info' })
      expect((action as any).fields.map((f: any) => f.name)).toContain(key)
    })
  }

  it('flags business_logo once every core field is present but logoUrl is not', () => {
    const action = resolveBusinessProfileAction(business({ logoUrl: null }))
    expect(action).toEqual({
      type: 'BUSINESS_PROFILE',
      actionId: 'business_logo',
      operationId: 'updateBusiness',
    })
  })
})

describe('resolvePageAction', () => {
  it('offers homepage_create when there is no homepage', () => {
    expect(resolvePageAction(null, null)).toEqual({
      type: 'PAGE',
      actionId: 'homepage_create',
      operationId: 'createLandingPage',
    })
  })

  it('offers homepage_publish when the homepage exists but is unpublished', () => {
    const homepage = page({ id: 'home-1', status: 'DRAFT' })
    expect(resolvePageAction(homepage, null)).toEqual({
      type: 'PAGE',
      actionId: 'homepage_publish',
      operationId: 'publishLandingPage',
      landingPageId: 'home-1',
    })
  })

  it('offers page_publish when the homepage is published and another draft exists', () => {
    const homepage = page({ id: 'home-1', status: 'PUBLISHED' })
    const other = page({ id: 'other-1', name: 'Lead capture', status: 'DRAFT' })
    expect(resolvePageAction(homepage, other)).toEqual({
      type: 'PAGE',
      actionId: 'page_publish',
      operationId: 'publishLandingPage',
      landingPageId: 'other-1',
      pageName: 'Lead capture',
    })
  })

  it('returns null when the homepage is published and no other draft exists', () => {
    const homepage = page({ id: 'home-1', status: 'PUBLISHED' })
    expect(resolvePageAction(homepage, null)).toBeNull()
  })
})

describe('resolveAdvertisingAction', () => {
  const draftCampaign = { id: 'camp-1' } as any
  const unpromotedPage = { id: 'home-1', name: 'Homepage', url: 'https://x.test/p/home' }

  it('prioritizes an incomplete draft campaign over an unpromoted page', () => {
    expect(resolveAdvertisingAction(draftCampaign, unpromotedPage)).toEqual({
      type: 'ADVERTISING',
      actionId: 'campaign_resume',
      operationId: null,
      campaignId: 'camp-1',
    })
  })

  it('offers campaign_create for an unpromoted published page when no draft campaign needs completion', () => {
    expect(resolveAdvertisingAction(null, unpromotedPage)).toEqual({
      type: 'ADVERTISING',
      actionId: 'campaign_create',
      operationId: 'createCampaign',
      landingPageId: 'home-1',
      pageName: 'Homepage',
      pageUrl: 'https://x.test/p/home',
    })
  })

  it('returns null when nothing needs attention', () => {
    expect(resolveAdvertisingAction(null, null)).toBeNull()
  })
})

describe('resolveCalendarAction', () => {
  it('always resolves to the calendar fallback', () => {
    expect(resolveCalendarAction()).toEqual({
      type: 'CALENDAR',
      actionId: 'calendar',
      operationId: null,
    })
  })
})
