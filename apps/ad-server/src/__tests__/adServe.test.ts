// Filled-in test for the first-party serving path this service owns: AdUnit click ->
// AttributionEvent (adUnitId set, platform LOOPIE) -> redirect resolution. Not run against a
// live database in this environment — see CLAUDE.md "Not Yet Verified: Live Database". Self
// -contained (creates and tears down its own rows) since this small service has no shared test
// -helpers module the way apps/server does.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db, verifySid } from '@project/db'
import { AdServeService } from '../services/AdServeService'

const service = new AdServeService()

let businessId: string
let campaignId: string
let creativeId: string
let landingPageId: string
let templateId: string

beforeAll(async () => {
  const business = await db.business.create({ data: { name: 'Ad Server Test Co.' } })
  businessId = business.id

  const creative = await db.creative.create({ data: { businessId, name: 'Banner Creative' } })
  creativeId = creative.id

  const campaign = await db.campaign.create({
    data: {
      businessId,
      name: 'First-Party Campaign',
      budget: 50,
      startDate: new Date(),
      destinationUrl: 'https://fallback.example.com',
      platforms: ['LOOPIE'],
      creativeLinks: { create: [{ creativeId }] },
    },
  })
  campaignId = campaign.id

  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Ad Server Test Template',
      isSystem: true,
      schema: { sections: [], themeTokens: [] },
    },
  })
  templateId = template.id

  const landingPage = await db.landingPage.create({
    data: {
      businessId,
      templateId,
      name: 'Ad Unit Destination',
      slug: `ad-unit-dest-${Date.now()}`,
      content: { sections: {} },
      status: 'PUBLISHED',
    },
  })
  landingPageId = landingPage.id
})

afterAll(async () => {
  await db.attributionEvent.deleteMany({ where: { campaignId } })
  await db.adUnit.deleteMany({ where: { campaignId } })
  await db.landingPage.deleteMany({ where: { businessId } })
  await db.landingPageTemplate.deleteMany({ where: { id: templateId } })
  await db.campaignCreative.deleteMany({ where: { campaignId } })
  await db.campaign.deleteMany({ where: { id: campaignId } })
  await db.creativeAsset.deleteMany({ where: { creative: { businessId } } })
  await db.asset.deleteMany({ where: { businessId } })
  await db.creative.deleteMany({ where: { businessId } })
  await db.business.deleteMany({ where: { id: businessId } })
})

describe('AdServeService', () => {
  it('records an impression as a counter increment, not a per-row event', async () => {
    const adUnit = await db.adUnit.create({
      data: { businessId, campaignId, creativeId, format: 'DISPLAY_BANNER', status: 'ACTIVE' },
    })

    await service.recordImpression(adUnit.id)

    const updated = await db.adUnit.findUniqueOrThrow({ where: { id: adUnit.id } })
    expect(updated.impressions).toBe(1)
    expect(updated.lastServedAt).not.toBeNull()
  })

  it('a click redirects to the destination landing page and writes an AttributionEvent with platform LOOPIE', async () => {
    const adUnit = await db.adUnit.create({
      data: {
        businessId,
        campaignId,
        creativeId,
        format: 'NATIVE',
        status: 'ACTIVE',
        destinationLandingPageId: landingPageId,
      },
    })

    const { redirectUrl, sessionId } = await service.recordClick(adUnit.id)

    expect(redirectUrl).toContain('/p/')
    expect(sessionId).toBeTruthy()

    const event = await db.attributionEvent.findFirstOrThrow({ where: { adUnitId: adUnit.id } })
    expect(event.platform).toBe('LOOPIE')
    expect(event.campaignId).toBe(campaignId)
    expect(event.creativeId).toBe(creativeId)
    expect(event.landingPageId).toBe(landingPageId)
    expect(verifySid(sessionId)?.sessionId).toBe(event.sessionId)

    const updated = await db.adUnit.findUniqueOrThrow({ where: { id: adUnit.id } })
    expect(updated.clicks).toBe(1)
  })

  it('a click with no destination landing page falls back to destinationUrl, then the campaign destinationUrl', async () => {
    const adUnit = await db.adUnit.create({
      data: { businessId, campaignId, creativeId, format: 'EMBED', status: 'ACTIVE' },
    })

    const { redirectUrl, sessionId } = await service.recordClick(adUnit.id)
    // The redirect carries ?sid= forward (see AdServeService.withSid) so a real visitor's
    // landing-page view/submission can link back to this click — found via live-DB testing.
    expect(redirectUrl.startsWith('https://fallback.example.com')).toBe(true)
    expect(redirectUrl).toContain('sid=')
    expect(verifySid(sessionId)).toBeTruthy()
  })

  it('does not serve a paused ad unit', async () => {
    const adUnit = await db.adUnit.create({
      data: { businessId, campaignId, creativeId, format: 'DISPLAY_BANNER', status: 'PAUSED' },
    })

    await expect(service.getServePayload(adUnit.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(service.recordImpression(adUnit.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(service.recordClick(adUnit.id)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('does not record a click whose landing page is unpublished', async () => {
    const draftPage = await db.landingPage.create({
      data: {
        businessId,
        templateId,
        name: 'Unpublished dest',
        slug: `ad-draft-dest-${Date.now()}`,
        content: { sections: {} },
        status: 'DRAFT',
      },
    })
    const adUnit = await db.adUnit.create({
      data: {
        businessId,
        campaignId,
        creativeId,
        format: 'NATIVE',
        status: 'ACTIVE',
        destinationLandingPageId: draftPage.id,
      },
    })

    await expect(service.recordClick(adUnit.id)).rejects.toMatchObject({ statusCode: 404 })
    const updated = await db.adUnit.findUniqueOrThrow({ where: { id: adUnit.id } })
    expect(updated.clicks).toBe(0)
  })

  it('escapes creative text in embed HTML', async () => {
    const asset = await db.asset.create({
      data: {
        businessId,
        type: 'TEXT',
        name: 'Headline',
        textContent: '<script>alert(1)</script>',
      },
    })
    const poisoned = await db.creative.create({
      data: {
        businessId,
        name: '"><img src=x onerror=alert(1)>',
        assets: { create: [{ assetId: asset.id }] },
      },
    })
    const adUnit = await db.adUnit.create({
      data: {
        businessId,
        campaignId,
        creativeId: poisoned.id,
        format: 'EMBED',
        status: 'ACTIVE',
      },
    })

    const html = await service.renderEmbed(adUnit.id)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('onerror=alert(1)')
  })

  it('returns uploaded creative assets as absolute origin URLs', async () => {
    const asset = await db.asset.create({
      data: {
        businessId,
        type: 'IMAGE',
        name: 'Banner',
        url: '/uploads/11111111-1111-1111-1111-111111111111.png',
      },
    })
    const creative = await db.creative.create({
      data: {
        businessId,
        name: 'Uploaded banner',
        assets: { create: [{ assetId: asset.id }] },
      },
    })
    const adUnit = await db.adUnit.create({
      data: {
        businessId,
        campaignId,
        creativeId: creative.id,
        format: 'EMBED',
        status: 'ACTIVE',
      },
    })

    const absolute = 'http://localhost:3001/uploads/11111111-1111-1111-1111-111111111111.png'
    const payload = await service.getServePayload(adUnit.id)
    expect(payload.creative?.assets[0]?.url).toBe(absolute)

    const html = await service.renderEmbed(adUnit.id)
    expect(html).toContain(absolute)
    expect(html).not.toContain('src="/uploads/')
  })
})
