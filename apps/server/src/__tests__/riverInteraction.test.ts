// Regression coverage for River slice 2 (feed usability + lightweight social interaction) — see
// the dated plan this pass implemented. Real assertions, hand-written, against loopie_test.
//
// Two auth paths are exercised deliberately: buildTestApp()'s securityHandlers.bearerAuth is a
// test-only shortcut (`Authorization: Bearer <userId>`, no cookie lookup at all — see
// helpers/index.ts) used for the four authenticated action endpoints below, same as every other
// suite in this repo. lib/riverViewer.ts#resolveOptionalViewer, by contrast, is called directly
// inside the public render handlers and does its own *real* cookie -> session -> user lookup,
// completely bypassing that test shortcut — so the viewer-recognition tests use a real cookie
// from a real /auth/register call, the one way to actually exercise that code path here.
import { describe, expect, it } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId } from './helpers'
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
  expect(token).toBeTruthy()
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

describe('River interaction (slice 2)', () => {
  it('react is idempotent, unreact removes it, unreact-when-never-reacted is a no-op', async () => {
    const author = await registerBusiness('author@river-int.local', 'Author Co')
    const reactor = await registerBusiness('reactor@river-int.local', 'Reactor Co')
    const postId = await createTextPost(author.userId, 'React to me.')

    const react1 = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/react`,
      headers: asAuth(reactor.userId),
    })
    expect(react1.statusCode).toBe(302)
    const react2 = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/react`,
      headers: asAuth(reactor.userId),
    })
    expect(react2.statusCode).toBe(302)

    const count1 = await db.riverReaction.count({ where: { riverPostId: postId } })
    expect(count1).toBe(1)

    const unreact = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/unreact`,
      headers: asAuth(reactor.userId),
    })
    expect(unreact.statusCode).toBe(302)
    const count2 = await db.riverReaction.count({ where: { riverPostId: postId } })
    expect(count2).toBe(0)

    // No-op when never reacted.
    const unreactAgain = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/unreact`,
      headers: asAuth(reactor.userId),
    })
    expect(unreactAgain.statusCode).toBe(302)
  })

  it('react/unreact/follow/unfollow are content-negotiated: Accept: application/json returns JSON, everything else still redirects (Move River into the main Loopie app shell slice)', async () => {
    const author = await registerBusiness('json-author@river-int.local', 'JSON Author Co')
    const actor = await registerBusiness('json-actor@river-int.local', 'JSON Actor Co')
    const postId = await createTextPost(author.userId, 'React to me in JSON.')

    const reactJson = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/react`,
      headers: { ...asAuth(actor.userId), accept: 'application/json' },
    })
    expect(reactJson.statusCode).toBe(200)
    expect(reactJson.json()).toEqual({
      data: { riverPostId: postId, reacted: true, reactionCount: 1 },
    })

    // The plain HTML form's request (no Accept: application/json) still gets the redirect,
    // unchanged, even on a post that's already reacted-to (idempotent either way).
    const reactForm = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/react`,
      headers: asAuth(actor.userId),
    })
    expect(reactForm.statusCode).toBe(302)

    const unreactJson = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/unreact`,
      headers: { ...asAuth(actor.userId), accept: 'application/json' },
    })
    expect(unreactJson.statusCode).toBe(200)
    expect(unreactJson.json()).toEqual({
      data: { riverPostId: postId, reacted: false, reactionCount: 0 },
    })

    const followJson = await app.inject({
      method: 'POST',
      url: `/river/businesses/${author.businessId}/follow`,
      headers: { ...asAuth(actor.userId), accept: 'application/json' },
    })
    expect(followJson.statusCode).toBe(200)
    expect(followJson.json()).toEqual({ data: { businessId: author.businessId, following: true } })

    const unfollowJson = await app.inject({
      method: 'POST',
      url: `/river/businesses/${author.businessId}/unfollow`,
      headers: { ...asAuth(actor.userId), accept: 'application/json' },
    })
    expect(unfollowJson.statusCode).toBe(200)
    expect(unfollowJson.json()).toEqual({
      data: { businessId: author.businessId, following: false },
    })
  })

  it('reacting requires authentication', async () => {
    const author = await registerBusiness('author2@river-int.local', 'Author Two Co')
    const postId = await createTextPost(author.userId, 'Anonymous cannot react.')

    const res = await app.inject({ method: 'POST', url: `/river/posts/${postId}/react` })
    expect(res.statusCode).toBe(401)
  })

  it('follow/unfollow works and a business cannot follow itself', async () => {
    const followed = await registerBusiness('followed@river-int.local', 'Followed Co')
    const follower = await registerBusiness('follower@river-int.local', 'Follower Co')

    const follow = await app.inject({
      method: 'POST',
      url: `/river/businesses/${followed.businessId}/follow`,
      headers: asAuth(follower.userId),
    })
    expect(follow.statusCode).toBe(302)

    const row = await db.riverFollow.findUnique({
      where: {
        followerBusinessId_followedBusinessId: {
          followerBusinessId: follower.businessId,
          followedBusinessId: followed.businessId,
        },
      },
    })
    expect(row).toBeTruthy()

    const unfollow = await app.inject({
      method: 'POST',
      url: `/river/businesses/${followed.businessId}/unfollow`,
      headers: asAuth(follower.userId),
    })
    expect(unfollow.statusCode).toBe(302)
    const rowAfter = await db.riverFollow.findUnique({
      where: {
        followerBusinessId_followedBusinessId: {
          followerBusinessId: follower.businessId,
          followedBusinessId: followed.businessId,
        },
      },
    })
    expect(rowAfter).toBeNull()

    const selfFollow = await app.inject({
      method: 'POST',
      url: `/river/businesses/${followed.businessId}/follow`,
      headers: asAuth(followed.userId),
    })
    expect(selfFollow.statusCode).toBe(400)
  })

  it('the following feed filter shows only followed businesses and 400s for an anonymous request', async () => {
    const followed = await registerBusiness('followed2@river-int.local', 'Followed Two Co')
    const notFollowed = await registerBusiness('notfollowed@river-int.local', 'Not Followed Co')
    const viewer = await registerBusiness('viewer@river-int.local', 'Viewer Co')

    await createTextPost(followed.userId, 'From a followed business.')
    await createTextPost(notFollowed.userId, 'From an unfollowed business.')

    await app.inject({
      method: 'POST',
      url: `/river/businesses/${followed.businessId}/follow`,
      headers: asAuth(viewer.userId),
    })

    const feedRes = await app.inject({
      method: 'GET',
      url: '/river?following=1',
      headers: { cookie: viewer.cookie },
    })
    expect(feedRes.statusCode).toBe(200)
    expect(feedRes.body).toContain('From a followed business.')
    expect(feedRes.body).not.toContain('From an unfollowed business.')

    const anonRes = await app.inject({ method: 'GET', url: '/river?following=1' })
    expect(anonRes.statusCode).toBe(400)
  })

  it('a recognized viewer sees live React/Follow forms; an anonymous request sees only the count', async () => {
    const author = await registerBusiness('author3@river-int.local', 'Author Three Co')
    const viewer = await registerBusiness('viewer2@river-int.local', 'Viewer Two Co')
    const postId = await createTextPost(author.userId, 'Viewer-aware rendering.')

    const recognized = await app.inject({
      method: 'GET',
      url: `/river/posts/${postId}`,
      headers: { cookie: viewer.cookie },
    })
    expect(recognized.statusCode).toBe(200)
    expect(recognized.body).toContain(`/river/posts/${postId}/react`)
    expect(recognized.body).toContain(`/river/businesses/${author.businessId}/follow`)

    const anonymous = await app.inject({ method: 'GET', url: `/river/posts/${postId}` })
    expect(anonymous.statusCode).toBe(200)
    expect(anonymous.body).toContain('0 reactions')
    expect(anonymous.body).not.toContain('/react')
    expect(anonymous.body).not.toContain('/follow')
  })

  it("doesn't show a Follow control on the viewer's own post", async () => {
    const author = await registerBusiness('author4@river-int.local', 'Author Four Co')
    const postId = await createTextPost(author.userId, 'My own post.')

    const res = await app.inject({
      method: 'GET',
      url: `/river/posts/${postId}`,
      headers: { cookie: author.cookie },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain(`/river/posts/${postId}/react`)
    expect(res.body).not.toContain('/follow')
  })

  it('regression: slice-1 create/list/delete flow via the Bearer test harness still works', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/river/posts',
      headers: asAuth(testUserId),
      payload: { type: 'TEXT', body: 'Still works.' },
    })
    expect(createRes.statusCode).toBe(201)
    const riverPostId = createRes.json().data.id as string

    const listRes = await app.inject({
      method: 'GET',
      url: '/river/posts',
      headers: asAuth(testUserId),
    })
    expect(listRes.statusCode).toBe(200)
    expect(listRes.json().data.some((p: { id: string }) => p.id === riverPostId)).toBe(true)

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/river/posts/${riverPostId}`,
      headers: asAuth(testOtherUserId),
    })
    expect(deleteRes.statusCode).toBe(404)
  })
})
