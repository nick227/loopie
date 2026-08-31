// Business identity/profile (2026-08-29) — see docs/strategy/03-product-principles.md's
// First-Login Experience step 0 and Singleton/Collection/Entity grammar (Business Profile is the
// one Singleton). GET/PATCH /business, tenant isolation, and the identityCompletedAt stamp.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('business profile', () => {
  it('returns the seeded business with no identity fields set yet', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/business',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(data.name).toBe('Alice Co.')
    expect(data.location).toBeNull()
    expect(data.socialProfiles).toEqual([])
    expect(data.identityCompletedAt).toBeNull()
  })

  it('saves identity fields and stamps identityCompletedAt on first save only', async () => {
    const first = await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(testUserId),
      payload: {
        location: 'Austin, TX',
        industry: 'Plumbing',
        targetAudience: 'Homeowners in Austin',
        socialProfiles: [{ platform: 'Instagram', url: 'https://instagram.com/aliceco' }],
        logoUrl: '/assets/logo.png',
      },
    })
    expect(first.statusCode).toBe(200)
    const firstData = first.json().data
    expect(firstData.location).toBe('Austin, TX')
    expect(firstData.socialProfiles).toEqual([
      { platform: 'Instagram', url: 'https://instagram.com/aliceco' },
    ])
    expect(firstData.identityCompletedAt).not.toBeNull()

    const second = await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(testUserId),
      payload: { industry: 'Home Services' },
    })
    expect(second.statusCode).toBe(200)
    const secondData = second.json().data
    expect(secondData.industry).toBe('Home Services')
    // Location survives an update that didn't mention it — PATCH semantics, not full replace.
    expect(secondData.location).toBe('Austin, TX')
    // The stamp is one-way: a later edit doesn't move it.
    expect(secondData.identityCompletedAt).toBe(firstData.identityCompletedAt)
  })

  it("scopes by the caller's own business, never another tenant's", async () => {
    await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(testUserId),
      payload: { industry: 'Plumbing' },
    })

    const otherRes = await app.inject({
      method: 'GET',
      url: '/business',
      headers: asAuth(testOtherUserId),
    })
    expect(otherRes.json().data.industry).toBeNull()
  })

  it('reflects on GET /auth/me via businessIdentityCompletedAt', async () => {
    const before = await app.inject({ method: 'GET', url: '/auth/me', headers: asAuth(testUserId) })
    expect(before.json().data.businessIdentityCompletedAt).toBeNull()

    await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(testUserId),
      payload: { industry: 'Plumbing' },
    })

    const after = await app.inject({ method: 'GET', url: '/auth/me', headers: asAuth(testUserId) })
    expect(after.json().data.businessIdentityCompletedAt).not.toBeNull()
  })
})
