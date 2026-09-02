// Regression coverage for River feed v2 (GET /river/feed, canonical RiverFeedItem shape,
// sponsored insertion, anti-repeat, polling) — see the dated plan this pass implemented. Real
// assertions, hand-written, against loopie_test.
import { describe, expect, it } from 'vitest'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function registerBusiness(email: string, businessName: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'password12', businessName },
  })
  expect(res.statusCode).toBe(201)
  const cookieHeader = String(res.headers['set-cookie'] ?? '')
  const token = cookieHeader.match(/token=([^;]+)/)?.[1]
  return {
    businessId: res.json().data.businessId as string,
    userId: res.json().data.id as string,
    cookie: `token=${token}`,
  }
}

async function createTextPost(userId: string, body: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/river/posts',
    headers: asAuth(userId),
    payload: { type: 'TEXT', body },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data.id as string
}

async function createPublishedAdPost(userId: string, businessId: string, body: string) {
  const asset = await db.asset.create({
    data: { businessId, type: 'IMAGE', name: 'Creative', url: '/media/feed-v2-test.png' },
  })
  const adRes = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(userId),
    payload: { name: 'Feed v2 test ad', assetIds: [asset.id] },
  })
  const advertisementId = adRes.json().data.id as string
  await app.inject({
    method: 'POST',
    url: `/advertisements/${advertisementId}/publish`,
    headers: asAuth(userId),
    payload: { clickBehavior: 'URL', destinationUrl: 'https://example.com/feed-v2-offer' },
  })
  const postRes = await app.inject({
    method: 'POST',
    url: '/river/posts',
    headers: asAuth(userId),
    payload: { type: 'AD', body, advertisementId },
  })
  expect(postRes.statusCode).toBe(201)
  return postRes.json().data.id as string
}

describe('River feed v2', () => {
  it('returns the canonical shape with viewer fields for a recognized viewer, omitted for anonymous', async () => {
    const author = await registerBusiness('feedv2-author@river.local', 'Feed V2 Author')
    const viewer = await registerBusiness('feedv2-viewer@river.local', 'Feed V2 Viewer')
    const postId = await createTextPost(author.userId, 'Canonical shape check.')

    const recognized = await app.inject({
      method: 'GET',
      url: '/river/feed',
      headers: { cookie: viewer.cookie },
    })
    expect(recognized.statusCode).toBe(200)
    const recognizedItem = recognized.json().items.find((i: { id: string }) => i.id === postId)
    expect(recognizedItem).toMatchObject({
      id: postId,
      type: 'TEXT',
      body: 'Canonical shape check.',
      business: { id: author.businessId, name: 'Feed V2 Author' },
      metrics: { reactions: 0 },
      viewer: { reacted: false, following: false },
    })
    expect(typeof recognizedItem.publishedAt).toBe('string')

    const anon = await app.inject({ method: 'GET', url: '/river/feed' })
    expect(anon.statusCode).toBe(200)
    const anonItem = anon.json().items.find((i: { id: string }) => i.id === postId)
    expect(anonItem.viewer).toBeUndefined()
  })

  it('pages through with the cursor with no gaps or duplicates', async () => {
    const business = await registerBusiness('feedv2-pager@river.local', 'Feed V2 Pager')
    const ids: string[] = []
    for (let i = 0; i < 12; i++) {
      ids.push(await createTextPost(business.userId, `Pager post ${i}`))
    }

    const seen = new Set<string>()
    let cursor: string | null = null
    let guard = 0
    do {
      const res: any = await app.inject({
        method: 'GET',
        url: `/river/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=5` : '?limit=5'}`,
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      for (const item of body.items) {
        expect(seen.has(item.id)).toBe(false)
        seen.add(item.id)
      }
      cursor = body.nextCursor
      guard++
    } while (cursor && guard < 20)

    for (const id of ids) expect(seen.has(id)).toBe(true)
  })

  it('breaks up a 4-in-a-row same-business streak without disturbing the pagination boundary', async () => {
    const businessA = await registerBusiness('feedv2-streak-a@river.local', 'Streak Business A')
    const businessB = await registerBusiness('feedv2-streak-b@river.local', 'Streak Business B')
    const businessC = await registerBusiness('feedv2-streak-c@river.local', 'Streak Business C')

    // Oldest to newest: A1, B1, A2, A3, A4, A5, C1 — chronological-DESC gives C1, A5, A4, A3, A2,
    // B1, A1: a naive fetch has 4 A's in a row (A5,A4,A3,A2) before B1 breaks it.
    const a1 = await createTextPost(businessA.userId, 'A1')
    await createTextPost(businessB.userId, 'B1')
    await createTextPost(businessA.userId, 'A2')
    await createTextPost(businessA.userId, 'A3')
    await createTextPost(businessA.userId, 'A4')
    await createTextPost(businessA.userId, 'A5')
    await createTextPost(businessC.userId, 'C1')

    const res = await app.inject({ method: 'GET', url: '/river/feed?limit=20' })
    expect(res.statusCode).toBe(200)
    const items = res.json().items as { id: string; body: string; business: { id: string } }[]

    let streak = 1
    for (let i = 1; i < items.length; i++) {
      streak = items[i]!.business.id === items[i - 1]!.business.id ? streak + 1 : 1
      expect(streak).toBeLessThan(4)
    }

    // Cursor-safety: the oldest post (A1) is still last — reordering never touched the boundary.
    expect(items[items.length - 1]!.id).toBe(a1)
  })

  it('injects deterministic SPONSORED items from the AD-type pool without changing the underlying RiverPost.type', async () => {
    const business = await registerBusiness('feedv2-sponsor@river.local', 'Feed V2 Sponsor')
    // The AD post is created first (oldest) so it falls outside the organic page below (limit=8
    // < 10 TEXT posts created after it) — it must NOT already be organically present for the
    // sponsored pool to have a candidate (the pool excludes whatever's already on the page, to
    // avoid showing the same post twice in one response).
    const adPostId = await createPublishedAdPost(
      business.userId,
      business.businessId,
      'Sponsored candidate',
    )
    for (let i = 0; i < 10; i++) {
      await createTextPost(business.userId, `Organic filler ${i}`)
    }

    const res = await app.inject({ method: 'GET', url: '/river/feed?limit=8' })
    expect(res.statusCode).toBe(200)
    const items = res.json().items as { id: string; type: string }[]
    const sponsored = items.filter((item) => item.type === 'SPONSORED')
    expect(sponsored.length).toBeGreaterThan(0)
    expect(sponsored.some((item) => item.id === adPostId)).toBe(true)

    const stored = await db.riverPost.findUniqueOrThrow({ where: { id: adPostId } })
    expect(stored.type).toBe('AD')
  })

  it('renders the CTA from the pinned advertisement version', async () => {
    const business = await registerBusiness('feedv2-cta@river.local', 'Feed V2 CTA')
    const asset = await db.asset.create({
      data: {
        businessId: business.businessId,
        type: 'IMAGE',
        name: 'CTA creative',
        url: '/media/cta.png',
      },
    })
    const adRes = await app.inject({
      method: 'POST',
      url: '/advertisements',
      headers: asAuth(business.userId),
      payload: {
        name: 'Shop ad',
        ctaLabel: 'Shop now',
        destinationUrl: 'https://example.com/shop',
        assetIds: [asset.id],
      },
    })
    const advertisementId = adRes.json().data.id as string
    await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisementId}/publish`,
      headers: asAuth(business.userId),
      payload: {},
    })
    const postRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(business.userId),
      payload: { type: 'AD', advertisementId },
    })

    const feedRes = await app.inject({ method: 'GET', url: '/river/feed?limit=100' })
    const item = feedRes
      .json()
      .items.find((candidate: { id: string }) => candidate.id === postRes.json().data.id)
    expect(item.cta).toEqual({ label: 'Shop now', url: expect.stringContaining('/click') })
  })

  it('after= polling mode returns only newer items and an empty batch once caught up', async () => {
    const business = await registerBusiness('feedv2-poll@river.local', 'Feed V2 Poll')
    const before = new Date(Date.now() - 60_000).toISOString()
    const postId = await createTextPost(business.userId, 'Polled post')

    const since = await app.inject({
      method: 'GET',
      url: `/river/feed?after=${encodeURIComponent(before)}`,
    })
    expect(since.statusCode).toBe(200)
    const sinceBody = since.json()
    expect(sinceBody.nextCursor).toBeNull()
    expect(sinceBody.items.some((i: { id: string }) => i.id === postId)).toBe(true)

    const post = await db.riverPost.findUniqueOrThrow({ where: { id: postId } })
    const caughtUp = await app.inject({
      method: 'GET',
      url: `/river/feed?after=${encodeURIComponent(post.createdAt.toISOString())}`,
    })
    expect(caughtUp.statusCode).toBe(200)
    expect(caughtUp.json().items).toHaveLength(0)
  })

  it('regression: GET /river (HTML) still renders real cards after the RiverFeedService refactor', async () => {
    await createTextPost(testUserId, 'HTML regression check')
    const res = await app.inject({ method: 'GET', url: '/river' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('HTML regression check')
  })
})
