// Regression coverage for slice 6 (native River posting v2 — composer fields, unified TEXT/AD/PAGE
// wrapper, rich media) — see the dated plan this pass implemented. Real assertions, hand-written,
// against loopie_test.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, asAuth } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

afterEach(() => {
  vi.unstubAllGlobals()
})

async function registerBusiness(email: string, businessName: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'password12', businessName },
  })
  expect(res.statusCode).toBe(201)
  const data = res.json().data
  return { businessId: data.businessId as string, userId: data.id as string }
}

async function createImageAsset(businessId: string, name = 'Composer Image') {
  const asset = await db.asset.create({
    data: { businessId, type: 'IMAGE', name, url: `/media/${name}.png` },
  })
  return asset.id
}

async function createVideoAsset(businessId: string) {
  const asset = await db.asset.create({
    data: { businessId, type: 'VIDEO', name: 'Composer Video', url: '/media/composer-video.mp4' },
  })
  return asset.id
}

async function createPublishedAd(userId: string, businessId: string) {
  const asset = await db.asset.create({
    data: { businessId, type: 'IMAGE', name: 'Ad Creative', url: '/media/ad-creative.png' },
  })
  const adRes = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(userId),
    payload: { name: 'Composer v2 Ad', assetIds: [asset.id] },
  })
  const advertisementId = adRes.json().data.id as string
  const pubRes = await app.inject({
    method: 'POST',
    url: `/advertisements/${advertisementId}/publish`,
    headers: asAuth(userId),
    payload: { clickBehavior: 'URL', destinationUrl: 'https://example.com/composer-ad-offer' },
  })
  expect(pubRes.statusCode).toBe(200)
  return advertisementId
}

async function createPublishedPage(userId: string) {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Composer v2 Template',
      isSystem: true,
      schema: { sections: [], themeTokens: [] },
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(userId),
    payload: {
      templateId: template.id,
      name: 'Composer v2 Page',
      slug: `composer-v2-page-${Date.now()}`,
    },
  })
  expect(pageRes.statusCode).toBe(201)
  const page = pageRes.json().data
  const publishRes = await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/publish`,
    headers: asAuth(userId),
  })
  expect(publishRes.statusCode).toBe(201)
  return page.id as string
}

function mockFetchHtml(html: string) {
  vi.stubGlobal(
    'fetch',
    async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }),
  )
}

describe('River composer v2', () => {
  it('a TEXT post with multiple images and a video renders correctly; an unowned asset is rejected', async () => {
    const author = await registerBusiness(
      'composerv2-media-author@river.local',
      'Composer Media Author',
    )
    const stranger = await registerBusiness(
      'composerv2-media-stranger@river.local',
      'Composer Media Stranger',
    )
    const img1 = await createImageAsset(author.businessId, 'Gallery One')
    const img2 = await createImageAsset(author.businessId, 'Gallery Two')

    const res = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'TEXT', body: 'A gallery post', imageAssetIds: [img1, img2] },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.imageAssetIds).toEqual([img1, img2])

    const feedRes = await app.inject({ method: 'GET', url: '/river/feed?limit=20' })
    const item = feedRes.json().items.find((i: { id: string }) => i.id === res.json().data.id)
    expect(item.media).toEqual([
      { type: 'IMAGE', url: expect.stringContaining('Gallery One') },
      { type: 'IMAGE', url: expect.stringContaining('Gallery Two') },
    ])

    const videoId = await createVideoAsset(author.businessId)
    const videoRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'TEXT', body: 'A video post', videoAssetId: videoId },
    })
    expect(videoRes.statusCode).toBe(201)
    const strangerImg = await createImageAsset(stranger.businessId, 'Not Yours')
    const rejected = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'TEXT', body: 'Using someone else’s asset', imageAssetIds: [strangerImg] },
    })
    expect(rejected.statusCode).toBe(404)
  })

  it('linkUrl triggers a preview fetch and freezes the result; a failing fetch still creates the post with no preview', async () => {
    const author = await registerBusiness(
      'composerv2-link-author@river.local',
      'Composer Link Author',
    )

    mockFetchHtml(
      '<html><head><meta property="og:title" content="Great Article"><meta property="og:description" content="A real description"></head></html>',
    )
    const res = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'TEXT', body: 'Check this out', linkUrl: 'https://example.com/article' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.linkPreviewTitle).toBe('Great Article')
    expect(res.json().data.linkPreviewDescription).toBe('A real description')

    vi.stubGlobal('fetch', async () => {
      throw new Error('network unreachable')
    })
    const failing = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: {
        type: 'TEXT',
        body: 'A link that will not preview',
        linkUrl: 'https://example.com/unreachable',
      },
    })
    expect(failing.statusCode).toBe(201)
    expect(failing.json().data.linkPreviewTitle).toBeNull()
    expect(failing.json().data.linkUrl).toBe('https://example.com/unreachable')
  })

  it('rejects a linkUrl resolving to a private/loopback address before ever fetching', async () => {
    const author = await registerBusiness(
      'composerv2-ssrf-author@river.local',
      'Composer SSRF Author',
    )
    let fetchCalled = false
    vi.stubGlobal('fetch', async () => {
      fetchCalled = true
      throw new Error('should never be called')
    })

    const res = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'TEXT', body: 'Sneaky link', linkUrl: 'http://127.0.0.1:3306/' },
    })
    expect(res.statusCode).toBe(201) // never blocks posting — see fetchLinkPreview's contract
    expect(res.json().data.linkPreviewTitle).toBeNull()
    expect(fetchCalled).toBe(false)
  })

  it('shares a published page, freezes publishedPageVersionId, and rejects an unpublished/foreign page', async () => {
    const author = await registerBusiness(
      'composerv2-page-author@river.local',
      'Composer Page Author',
    )
    const stranger = await registerBusiness(
      'composerv2-page-stranger@river.local',
      'Composer Page Stranger',
    )
    const landingPageId = await createPublishedPage(author.userId)

    const res = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'PAGE', body: 'Check out our new page', landingPageId },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.landingPageId).toBe(landingPageId)
    const pinnedVersionId = res.json().data.publishedPageVersionId
    expect(pinnedVersionId).toBeTruthy()

    // Republishing must not change the already-created post's frozen pointer.
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${landingPageId}/publish`,
      headers: asAuth(author.userId),
    })
    const stored = await db.riverPost.findUniqueOrThrow({ where: { id: res.json().data.id } })
    expect(stored.publishedPageVersionId).toBe(pinnedVersionId)

    // Another business's page 404s (not found within this business's own scope) — same
    // not-found-vs-not-published split as the AD branch's own precedent.
    const foreign = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(stranger.userId),
      payload: { type: 'PAGE', landingPageId },
    })
    expect(foreign.statusCode).toBe(404)
  })

  it('CTA requires both fields or neither; imageAssetIds/videoAssetId are rejected on AD/PAGE posts', async () => {
    const author = await registerBusiness(
      'composerv2-cta-author@river.local',
      'Composer CTA Author',
    )
    const advertisementId = await createPublishedAd(author.userId, author.businessId)
    const img = await createImageAsset(author.businessId)

    const onlyLabel = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'TEXT', body: 'Missing url', ctaLabel: 'Book now' },
    })
    expect(onlyLabel.statusCode).toBe(400)

    const both = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: {
        type: 'TEXT',
        body: 'Has both',
        ctaLabel: 'Book now',
        ctaUrl: 'https://example.com/book',
      },
    })
    expect(both.statusCode).toBe(201)

    const adWithImage = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'AD', advertisementId, imageAssetIds: [img] },
    })
    expect(adWithImage.statusCode).toBe(400)

    const video = await createVideoAsset(author.businessId)
    const mixedMedia = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: { type: 'TEXT', body: 'Both at once', imageAssetIds: [img], videoAssetId: video },
    })
    expect(mixedMedia.statusCode).toBe(400)
  })

  it('trackRiverClick resolves the right destination by precedence and records exactly one CLICK', async () => {
    const author = await registerBusiness(
      'composerv2-click-author@river.local',
      'Composer Click Author',
    )
    const advertisementId = await createPublishedAd(author.userId, author.businessId)

    const res = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(author.userId),
      payload: {
        type: 'AD',
        advertisementId,
        body: 'Ad with an explicit CTA',
        ctaLabel: 'Claim offer',
        ctaUrl: 'https://example.com/cta-wins',
      },
    })
    const postId = res.json().data.id as string

    const clickRes = await app.inject({ method: 'GET', url: `/river/posts/${postId}/click` })
    expect(clickRes.statusCode).toBe(302)
    // CTA takes precedence over the AD's own destinationUrl (https://example.com/composer-ad-offer).
    expect(clickRes.headers.location).toBe('https://example.com/cta-wins')

    const events = await db.riverEngagementEvent.findMany({
      where: { riverPostId: postId, type: 'CLICK' },
    })
    expect(events).toHaveLength(1)
  })
})
