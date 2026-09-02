// Regression coverage for "Business profiles: redesign + fold into the app shell" — the JSON
// content-negotiation added to GET /b/{slug} and POST .../pin|unpin, the one gap that pass's
// research found (unlike River, the profile page had no JSON API at all before this). Real
// assertions, hand-written, against loopie_test.
import { describe, expect, it } from 'vitest'
import { buildTestApp, asAuth } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

// resolveOptionalViewer (the GET /b/{slug} JSON path's viewer recognition) is cookie-only, no
// Authorization-header fallback — see lib/riverViewer.ts's own comment — so the Bearer test
// shortcut (asAuth) doesn't exercise it; a real cookie from a real /auth/register call is the one
// way to, same as riverInteraction.test.ts's own registerBusiness helper.
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

describe('Business profile JSON content negotiation', () => {
  it('GET /b/{slug} returns HTML by default and JSON only with Accept: application/json', async () => {
    const owner = await registerBusiness('bizjson-negotiate@river.local', 'Negotiate Co')
    const slug = await getSlug(owner.businessId)

    const htmlRes = await app.inject({ method: 'GET', url: `/b/${slug}` })
    expect(htmlRes.statusCode).toBe(200)
    expect(htmlRes.headers['content-type']).toContain('text/html')

    const jsonRes = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { accept: 'application/json' },
    })
    expect(jsonRes.statusCode).toBe(200)
    const body = jsonRes.json().data
    expect(body.business.name).toBe('Negotiate Co')
    expect(body.business.slug).toBe(slug)
    expect(body.followerCount).toBe(0)
    expect(body.viewerIsFollowing).toBeNull()
    expect(body.isOwnProfile).toBe(false)
    expect(body.featured).toBeNull()
  })

  it('viewerIsFollowing is null for anonymous, false for the owner, and reflects a real follow for another viewer', async () => {
    const owner = await registerBusiness('bizjson-owner@river.local', 'Owner Co')
    const viewer = await registerBusiness('bizjson-viewer@river.local', 'Viewer Co')
    const slug = await getSlug(owner.businessId)

    const ownerRes = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { cookie: owner.cookie, accept: 'application/json' },
    })
    expect(ownerRes.json().data.isOwnProfile).toBe(true)
    expect(ownerRes.json().data.viewerIsFollowing).toBe(false)

    const beforeFollow = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { cookie: viewer.cookie, accept: 'application/json' },
    })
    expect(beforeFollow.json().data.isOwnProfile).toBe(false)
    expect(beforeFollow.json().data.viewerIsFollowing).toBe(false)

    await app.inject({
      method: 'POST',
      url: `/river/businesses/${owner.businessId}/follow`,
      headers: asAuth(viewer.userId),
    })

    const afterFollow = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { cookie: viewer.cookie, accept: 'application/json' },
    })
    expect(afterFollow.json().data.viewerIsFollowing).toBe(true)
    expect(afterFollow.json().data.followerCount).toBe(1)
  })

  it('pin/unpin are content-negotiated the same way as reactToRiverPost, and featured reflects the pin on the JSON profile', async () => {
    const owner = await registerBusiness('bizjson-pin@river.local', 'Pin Co')
    const slug = await getSlug(owner.businessId)
    const postId = await createTextPost(owner.userId, 'Pin me to the profile.')

    const pinForm = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/pin`,
      headers: asAuth(owner.userId),
    })
    expect(pinForm.statusCode).toBe(302)

    const unpin = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/unpin`,
      headers: asAuth(owner.userId),
    })
    expect(unpin.statusCode).toBe(302)

    const pinJson = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/pin`,
      headers: { ...asAuth(owner.userId), accept: 'application/json' },
    })
    expect(pinJson.statusCode).toBe(200)
    expect(pinJson.json()).toEqual({ data: { riverPostId: postId, pinned: true } })

    const profileWithFeatured = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { accept: 'application/json' },
    })
    expect(profileWithFeatured.json().data.featured?.id).toBe(postId)
    expect(profileWithFeatured.json().data.featured?.body).toBe('Pin me to the profile.')

    const unpinJson = await app.inject({
      method: 'POST',
      url: `/river/posts/${postId}/unpin`,
      headers: { ...asAuth(owner.userId), accept: 'application/json' },
    })
    expect(unpinJson.statusCode).toBe(200)
    expect(unpinJson.json()).toEqual({ data: { riverPostId: postId, pinned: false } })

    const profileWithoutFeatured = await app.inject({
      method: 'GET',
      url: `/b/${slug}`,
      headers: { accept: 'application/json' },
    })
    expect(profileWithoutFeatured.json().data.featured).toBeNull()
  })

  it('404s for a nonexistent slug on both the HTML and JSON paths', async () => {
    const htmlRes = await app.inject({ method: 'GET', url: '/b/no-such-business-xyz' })
    expect(htmlRes.statusCode).toBe(404)

    const jsonRes = await app.inject({
      method: 'GET',
      url: '/b/no-such-business-xyz',
      headers: { accept: 'application/json' },
    })
    expect(jsonRes.statusCode).toBe(404)
  })
})
