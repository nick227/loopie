import { describe, it, expect } from 'vitest'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { saveMediaFile } from '../lib/mediaStorage'

const app = buildTestApp()

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function createImageAsset(name: string) {
  const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
  return db.asset.create({
    data: {
      businessId: testBusinessId,
      type: 'IMAGE',
      name,
      url: saved.url,
      mimeType: 'image/png',
    },
  })
}

async function createPage(slug: string) {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Ad Designer Test Template',
      isSystem: true,
      schema: {
        sections: [{ key: 'hero', type: 'hero', order: 0, hideable: false, editable: [] }],
        themeTokens: [],
      },
    },
  })
  const res = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: { templateId: template.id, name: 'Ad Designer Test Page', slug },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data
}

describe('Ad Designer (2026-09-03)', () => {
  it('applies format defaults on create and lets update override just one field', async () => {
    const asset = await createImageAsset('Poster asset')
    const create = await app.inject({
      method: 'POST',
      url: '/advertisements',
      headers: asAuth(testUserId),
      payload: { name: 'Fall Sale', format: 'POSTER', headline: 'Fall Sale', assetIds: [asset.id] },
    })
    expect(create.statusCode).toBe(201)
    const ad = create.json().data
    expect(ad.textPlacement).toBe('BOTTOM_LEFT')
    expect(ad.fontScale).toBe('OVERSIZED')
    expect(ad.overlay).toBe('DARK_GRADIENT')
    expect(ad.ctaPlacement).toBe('BENEATH_COPY')

    // Override only overlay — every other design field must stay exactly as it was, not reset to
    // some other default (see AdvertisementService.update's "never a sparse partial" comment).
    const update = await app.inject({
      method: 'PATCH',
      url: `/advertisements/${ad.id}`,
      headers: asAuth(testUserId),
      payload: { overlay: 'NONE' },
    })
    expect(update.statusCode).toBe(200)
    const updated = update.json().data
    expect(updated.overlay).toBe('NONE')
    expect(updated.textPlacement).toBe('BOTTOM_LEFT')
    expect(updated.fontScale).toBe('OVERSIZED')
    expect(updated.ctaPlacement).toBe('BENEATH_COPY')
  })

  it("resolves a LANDING_PAGE destination to the page's live hosted URL at publish time, not a copy", async () => {
    const asset = await createImageAsset('Destination asset')
    const page = await createPage(`ad-designer-dest-${Date.now()}`)

    const create = await app.inject({
      method: 'POST',
      url: '/advertisements',
      headers: asAuth(testUserId),
      payload: {
        name: 'Promote page',
        format: 'FEED_POST',
        assetIds: [asset.id],
        destinationType: 'LANDING_PAGE',
        destinationLandingPageId: page.id,
      },
    })
    expect(create.statusCode).toBe(201)
    const ad = create.json().data
    expect(ad.destinationType).toBe('LANDING_PAGE')
    expect(ad.destinationLandingPageId).toBe(page.id)

    const publish = await app.inject({
      method: 'POST',
      url: `/advertisements/${ad.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publish.statusCode).toBe(200)

    const version = await db.publishedAdvertisementVersion.findFirst({
      where: { advertisementId: ad.id },
      orderBy: { version: 'desc' },
    })
    expect(version?.destinationUrl).toBe(page.hostedUrl)
    expect(version?.format).toBe('FEED_POST')
    const snapshot = version?.creativeSnapshot as {
      headline?: string | null
      overlay?: string | null
    }
    expect(snapshot.overlay).toBe('DARK_GRADIENT') // FEED_POST's own default

    // Republishing after the page's slug changes picks up the new URL live — never a stale copy.
    await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { slug: `${page.slug}-renamed` },
    })
    const republish = await app.inject({
      method: 'POST',
      url: `/advertisements/${ad.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(republish.statusCode).toBe(200)
    const version2 = await db.publishedAdvertisementVersion.findFirst({
      where: { advertisementId: ad.id },
      orderBy: { version: 'desc' },
    })
    expect(version2?.destinationUrl).toContain(`${page.slug}-renamed`)
  })

  it('places a saved creative into a Page ad slot by reference, and renders it on the hosted page', async () => {
    const asset = await createImageAsset('Slot asset')
    const ad = (
      await app.inject({
        method: 'POST',
        url: '/advertisements',
        headers: asAuth(testUserId),
        payload: {
          name: 'Slotted poster',
          format: 'POSTER',
          headline: 'Big Sale',
          ctaLabel: 'Shop now',
          assetIds: [asset.id],
          destinationType: 'EXTERNAL_URL',
          destinationUrl: 'https://example.com/shop',
        },
      })
    ).json().data
    await app.inject({
      method: 'POST',
      url: `/advertisements/${ad.id}/publish`,
      headers: asAuth(testUserId),
    })

    const page = await createPage(`ad-designer-slot-${Date.now()}`)
    const assign = await app.inject({
      method: 'PUT',
      url: `/landing-pages/${page.id}/ad-slots`,
      headers: asAuth(testUserId),
      payload: {
        slots: [{ placement: 'AFTER_HERO', context: 'PROMOTIONAL', advertisementIds: [ad.id] }],
      },
    })
    expect(assign.statusCode).toBe(200)
    expect(assign.json().data.slots[0].context).toBe('PROMOTIONAL')
    expect(assign.json().data.slots[0].assignments[0].advertisementId).toBe(ad.id)

    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })

    const hosted = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(hosted.statusCode).toBe(200)
    // The page embeds the direct internal ad-server route (not the third-party publicId path) —
    // see lib/adSlots.ts's embedUrlForAdvertisement.
    expect(hosted.body).toContain(`/ads/${ad.id}/embed`)
    expect(hosted.body).toContain('lp-ad--promotional')
    expect(hosted.body).toContain('lp-ad--format-poster')
  })

  it('rejects an advertisement from another business as a page destination', async () => {
    const other = await db.business.create({ data: { name: 'Other Ad Designer Co' } })
    const foreignAd = await db.advertisement.create({
      data: { businessId: other.id, name: 'Foreign' },
    })
    const page = await createPage(`ad-designer-foreign-${Date.now()}`)

    const res = await app.inject({
      method: 'PUT',
      url: `/landing-pages/${page.id}/ad-slots`,
      headers: asAuth(testUserId),
      payload: { slots: [{ placement: 'AFTER_HERO', advertisementIds: [foreignAd.id] }] },
    })
    expect(res.statusCode).toBe(404)
  })
})
