// Regression coverage for slice 4 (public business profile redesign — hero, Follow CTA, pinned
// "Featured" post, embedded business-scoped feed) — see the dated plan this pass implemented.
// Real assertions, hand-written, against loopie_test.
import { describe, expect, it } from 'vitest'
import { buildTestApp, asAuth } from './helpers'
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
  const data = res.json().data
  return {
    businessId: data.businessId as string,
    userId: data.id as string,
    cookie: `token=${token}`,
  }
}

async function getSlug(businessId: string) {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })
  return business.slug as string
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

describe('Business profile v2 (slice 4)', () => {
  // The public HTML page (renderBusinessProfile) was later redesigned into a plain "business
  // front" — artwork, name, contact, practical details — with Follow/Featured dropped from the
  // server-rendered markup entirely (see renderBusinessProfile.ts's own comment and
  // BusinessProfilePage.test.tsx's "...without rendering River activity"). Follow state and the
  // featured post still exist and are exercised below via the DB/JSON API; this test now checks
  // that content-negotiated JSON (getBusinessProfileJson), not the HTML branch, for those fields.
  it('the JSON profile reports Follow state and a real follower count for a recognized non-owner', async () => {
    const owner = await registerBusiness('profilev2-owner@river.local', 'Profile V2 Owner')
    const other = await registerBusiness('profilev2-other@river.local', 'Profile V2 Other')
    const slug = await getSlug(owner.businessId)

    const asOther = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { cookie: other.cookie, accept: 'application/json' },
    })
    expect(asOther.statusCode).toBe(200)
    const before = asOther.json().data
    expect(before.isOwnProfile).toBe(false)
    expect(before.viewerIsFollowing).toBe(false)
    expect(before.followerCount).toBe(0)

    const follow = await app.inject({
      method: 'POST',
      url: `/river/businesses/${owner.businessId}/follow`,
      headers: asAuth(other.userId),
    })
    expect(follow.statusCode).toBe(302)

    const afterFollow = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { cookie: other.cookie, accept: 'application/json' },
    })
    const after = afterFollow.json().data
    expect(after.followerCount).toBe(1)
    expect(after.viewerIsFollowing).toBe(true)
  })

  it('pin replaces any previous pin, unpin clears it, and acting on another business post 404s', async () => {
    const owner = await registerBusiness('profilev2-pinowner@river.local', 'Profile V2 Pin Owner')
    const stranger = await registerBusiness('profilev2-stranger@river.local', 'Profile V2 Stranger')
    const postA = await createTextPost(owner.userId, 'First pin candidate')
    const postB = await createTextPost(owner.userId, 'Second pin candidate')
    const strangerPost = await createTextPost(stranger.userId, "Stranger's own post")

    const pinA = await app.inject({
      method: 'POST',
      url: `/river/posts/${postA}/pin`,
      headers: asAuth(owner.userId),
    })
    expect(pinA.statusCode).toBe(302)
    let business = await db.business.findUniqueOrThrow({ where: { id: owner.businessId } })
    expect(business.pinnedRiverPostId).toBe(postA)

    const pinB = await app.inject({
      method: 'POST',
      url: `/river/posts/${postB}/pin`,
      headers: asAuth(owner.userId),
    })
    expect(pinB.statusCode).toBe(302)
    business = await db.business.findUniqueOrThrow({ where: { id: owner.businessId } })
    expect(business.pinnedRiverPostId).toBe(postB)

    const unpin = await app.inject({
      method: 'POST',
      url: `/river/posts/${postB}/unpin`,
      headers: asAuth(owner.userId),
    })
    expect(unpin.statusCode).toBe(302)
    business = await db.business.findUniqueOrThrow({ where: { id: owner.businessId } })
    expect(business.pinnedRiverPostId).toBeNull()

    const pinStranger = await app.inject({
      method: 'POST',
      url: `/river/posts/${strangerPost}/pin`,
      headers: asAuth(owner.userId),
    })
    expect(pinStranger.statusCode).toBe(404)
  })

  it('the JSON profile reports the pinned post as featured, independent of the regular feed', async () => {
    const owner = await registerBusiness('profilev2-featured@river.local', 'Profile V2 Featured')
    const slug = await getSlug(owner.businessId)
    const pinnedId = await createTextPost(owner.userId, 'The featured post body')
    await createTextPost(owner.userId, 'A regular later post')

    await app.inject({
      method: 'POST',
      url: `/river/posts/${pinnedId}/pin`,
      headers: asAuth(owner.userId),
    })

    const res = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { accept: 'application/json' },
    })
    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(data.featured.id).toBe(pinnedId)
    expect(data.featured.body).toBe('The featured post body')

    const feed = await app.inject({
      method: 'GET',
      url: `/river/feed?business=${owner.businessId}&limit=20`,
    })
    const bodies = (feed.json().items as { body: string }[]).map((item) => item.body)
    expect(bodies).toContain('A regular later post')
  })

  it("GET /river/feed?business= returns only that business's posts with no SPONSORED items", async () => {
    const businessA = await registerBusiness(
      'profilev2-scoped-a@river.local',
      'Profile V2 Scoped A',
    )
    const businessB = await registerBusiness(
      'profilev2-scoped-b@river.local',
      'Profile V2 Scoped B',
    )
    for (let i = 0; i < 3; i++) await createTextPost(businessA.userId, `A post ${i}`)
    for (let i = 0; i < 3; i++) await createTextPost(businessB.userId, `B post ${i}`)

    const res = await app.inject({
      method: 'GET',
      url: `/river/feed?business=${businessA.businessId}&limit=20`,
    })
    expect(res.statusCode).toBe(200)
    const items = res.json().items as { type: string; business: { id: string } }[]
    expect(items.length).toBe(3)
    for (const item of items) {
      expect(item.business.id).toBe(businessA.businessId)
      expect(item.type).not.toBe('SPONSORED')
    }
  })

  // A real browser's plain <form method="post"> always sends this content-type (no <form
  // enctype> is ever set on the React/Follow/Pin buttons) — found live via a real-browser check
  // of this exact Unpin button: Fastify has no parser for it by default and 415s before the
  // request reaches routing, so every one of these buttons was silently broken for real clicks
  // despite passing every curl-based test in slices 2-4 (curl never sends this header unless
  // asked). Proves the fix (index.ts's new addContentTypeParser) actually works end to end.
  it('react/follow/pin all succeed with the real browser form content-type, not just a bare POST', async () => {
    const author = await registerBusiness('profilev2-formct-author@river.local', 'Form CT Author')
    const actor = await registerBusiness('profilev2-formct-actor@river.local', 'Form CT Actor')
    const postId = await createTextPost(author.userId, 'React to me with a real form content-type')

    const formHeaders = {
      ...asAuth(actor.userId),
      'content-type': 'application/x-www-form-urlencoded',
    }

    const react = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/react`,
      headers: formHeaders,
    })
    expect(react.statusCode).toBe(302)

    const follow = await app.inject({
      method: 'POST',
      url: `/river/businesses/${author.businessId}/follow`,
      headers: formHeaders,
    })
    expect(follow.statusCode).toBe(302)

    const pin = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/pin`,
      headers: { ...asAuth(author.userId), 'content-type': 'application/x-www-form-urlencoded' },
    })
    expect(pin.statusCode).toBe(302)
    expect(pin.headers.location).toContain(await getSlug(author.businessId))

    const reaction = await db.riverReaction.findFirst({
      where: { riverPostId: postId, actorBusinessId: actor.businessId },
    })
    expect(reaction).toBeTruthy()
    const business = await db.business.findUniqueOrThrow({ where: { id: author.businessId } })
    expect(business.pinnedRiverPostId).toBe(postId)
  })
})
