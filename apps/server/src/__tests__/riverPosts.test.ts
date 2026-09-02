// Regression coverage for River slice 1 (native posting, public feed, baseline engagement) —
// see the River proposal pack in apps/web/public/river-b2b-social-proposal and the dated plan
// this pass implemented. Real assertions, hand-written, against loopie_test.
import { describe, expect, it } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId, testOtherUserId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function createPublishedAdvertisement(
  userId: string,
  destinationUrl = 'https://example.com/offer',
) {
  const asset = await db.asset.create({
    data: {
      businessId: testBusinessId,
      type: 'IMAGE',
      name: 'Creative',
      url: '/media/river-test.png',
      mimeType: 'image/png',
    },
  })
  const adRes = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(userId),
    payload: { name: 'River Test Ad', assetIds: [asset.id] },
  })
  expect(adRes.statusCode).toBe(201)
  const advertisementId = adRes.json().data.id as string

  const pubRes = await app.inject({
    method: 'POST',
    url: `/advertisements/${advertisementId}/publish`,
    headers: asAuth(userId),
    payload: { clickBehavior: 'URL', destinationUrl },
  })
  expect(pubRes.statusCode).toBe(200)
  return { advertisementId, publishedVersionId: pubRes.json().data.id as string }
}

describe('River posts', () => {
  it('creates a TEXT post and an AD post, pinning the current published version', async () => {
    const { advertisementId, publishedVersionId } = await createPublishedAdvertisement(testUserId)

    const textRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'TEXT', body: 'Just shipped something new.' },
    })
    expect(textRes.statusCode).toBe(201)
    expect(textRes.json().data.advertisementId).toBeNull()

    const adRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'AD', body: 'Check out our latest offer.', advertisementId },
    })
    expect(adRes.statusCode).toBe(201)
    expect(adRes.json().data.publishedAdvertisementVersionId).toBe(publishedVersionId)
  })

  it('never follows a later republish of the same advertisement', async () => {
    const { advertisementId, publishedVersionId: v1 } =
      await createPublishedAdvertisement(testUserId)

    const postRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'AD', body: 'Original post.', advertisementId },
    })
    const riverPostId = postRes.json().data.id as string
    expect(postRes.json().data.publishedAdvertisementVersionId).toBe(v1)

    // Republish the same advertisement — a new PublishedAdvertisementVersion now exists.
    const pub2 = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisementId}/publish`,
      headers: asAuth(testUserId),
      payload: { clickBehavior: 'URL', destinationUrl: 'https://example.com/v2' },
    })
    expect(pub2.statusCode).toBe(200)
    expect(pub2.json().data.id).not.toBe(v1)

    const stored = await db.riverPost.findUniqueOrThrow({ where: { id: riverPostId } })
    expect(stored.publishedAdvertisementVersionId).toBe(v1)
  })

  it('rejects an AD post for an advertisement that has never been published', async () => {
    const asset = await db.asset.create({
      data: { businessId: testBusinessId, type: 'IMAGE', name: 'Draft', url: '/media/draft.png' },
    })
    const adRes = await app.inject({
      method: 'POST',
      url: '/advertisements',
      headers: asAuth(testUserId),
      payload: { name: 'Unpublished Ad', assetIds: [asset.id] },
    })
    const advertisementId = adRes.json().data.id as string

    const postRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'AD', body: 'Should fail.', advertisementId },
    })
    expect(postRes.statusCode).toBe(400)
  })

  it('serves a public feed reverse-chronological across businesses, excluding soft-deleted posts', async () => {
    await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'TEXT', body: 'From business A.' },
    })
    await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testOtherUserId),
      payload: { type: 'TEXT', body: 'From business B.' },
    })
    const postC = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'TEXT', body: 'Will be deleted.' },
    })
    const deletedId = postC.json().data.id as string
    await app.inject({
      method: 'DELETE',
      url: `/river/posts/${deletedId}`,
      headers: asAuth(testUserId),
    })

    const feedRes = await app.inject({ method: 'GET', url: '/river' })
    expect(feedRes.statusCode).toBe(200)
    const html = feedRes.body
    expect(html).toContain('From business A.')
    expect(html).toContain('From business B.')
    expect(html).not.toContain('Will be deleted.')
    // Reverse-chronological: B (created after A) appears before A in the rendered HTML.
    expect(html.indexOf('From business B.')).toBeLessThan(html.indexOf('From business A.'))
  })

  it('records exactly one IMPRESSION per permalink view', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'TEXT', body: 'Permalink test.' },
    })
    const riverPostId = createRes.json().data.id as string

    const viewRes = await app.inject({ method: 'GET', url: `/river/posts/${riverPostId}` })
    expect(viewRes.statusCode).toBe(200)
    expect(viewRes.body).toContain('Permalink test.')

    const events = await db.riverEngagementEvent.findMany({ where: { riverPostId } })
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('IMPRESSION')
  })

  it('records a CLICK and redirects to the ad destination', async () => {
    const { advertisementId } = await createPublishedAdvertisement(
      testUserId,
      'https://example.com/click-target',
    )
    const postRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'AD', body: 'Clickable.', advertisementId },
    })
    const riverPostId = postRes.json().data.id as string

    const clickRes = await app.inject({ method: 'GET', url: `/river/posts/${riverPostId}/click` })
    expect(clickRes.statusCode).toBe(302)
    expect(clickRes.headers.location).toBe('https://example.com/click-target')

    const events = await db.riverEngagementEvent.findMany({
      where: { riverPostId, type: 'CLICK' },
    })
    expect(events).toHaveLength(1)
  })

  it('records a PROFILE_VISIT and redirects to the public business profile', async () => {
    await db.business.update({
      where: { id: testBusinessId },
      data: { slug: 'river-test-business' },
    })
    const postRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'TEXT', body: 'Visit my profile.' },
    })
    const riverPostId = postRes.json().data.id as string

    const visitRes = await app.inject({
      method: 'GET',
      url: `/river/posts/${riverPostId}/visit-profile`,
    })
    expect(visitRes.statusCode).toBe(302)
    expect(visitRes.headers.location).toContain('/b/river-test-business')

    const events = await db.riverEngagementEvent.findMany({
      where: { riverPostId, type: 'PROFILE_VISIT' },
    })
    expect(events).toHaveLength(1)
  })

  it('enforces tenant isolation on delete', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'TEXT', body: 'Owned by business A.' },
    })
    const riverPostId = postRes.json().data.id as string

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/river/posts/${riverPostId}`,
      headers: asAuth(testOtherUserId),
    })
    expect(deleteRes.statusCode).toBe(404)

    const stored = await db.riverPost.findUniqueOrThrow({ where: { id: riverPostId } })
    expect(stored.deletedAt).toBeNull()
  })
})
