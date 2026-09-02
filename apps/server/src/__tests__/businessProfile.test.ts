// Filled-in integration test (not a generated stub) for the public business profile slice:
// every business gets a globally-unique Business.slug at registration, and GET /b/{slug} renders
// its identity fields as a public, unauthenticated HTML page.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

describe('public business profile', () => {
  it('assigns a unique slug at registration, derived from the business name', async () => {
    const marker = `profiletest-${Date.now()}@example.com`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: marker, password: 'password123', businessName: 'Profile Test Co' },
    })
    expect(res.statusCode).toBe(201)
    const businessId = res.json().data.businessId

    const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })
    expect(business.slug).toBe('profile-test-co')
  })

  it('appends a numeric suffix when the slugified name collides with an existing business', async () => {
    await db.business.update({ where: { id: testBusinessId }, data: { slug: 'collide-co' } })

    const marker = `collidetest-${Date.now()}@example.com`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: marker, password: 'password123', businessName: 'Collide Co' },
    })
    expect(res.statusCode).toBe(201)
    const businessId = res.json().data.businessId

    const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })
    expect(business.slug).toBe('collide-co-2')
  })

  it('GET /business exposes slug and publicProfileUrl', async () => {
    await db.business.update({ where: { id: testBusinessId }, data: { slug: 'alice-co' } })

    const res = await app.inject({
      method: 'GET',
      url: '/business',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.slug).toBe('alice-co')
    expect(res.json().data.publicProfileUrl).toContain('/b/alice-co')
  })

  it('serves the public profile page with identity fields, no auth required', async () => {
    await db.business.update({
      where: { id: testBusinessId },
      data: {
        slug: 'riverside-detail-co',
        name: 'Riverside Detail Co',
        location: 'Riverside, CA',
        industry: 'Auto Detailing',
        targetAudience: 'Car owners who want a professional detail',
        socialProfiles: [{ platform: 'Instagram', url: 'https://instagram.com/riversidedetail' }],
      },
    })

    const res = await app.inject({ method: 'GET', url: '/b/riverside-detail-co' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('Riverside Detail Co')
    expect(res.body).toContain('Riverside, CA')
    expect(res.body).toContain('Auto Detailing')
    expect(res.body).toContain('Car owners who want a professional detail')
    expect(res.body).toContain('https://instagram.com/riversidedetail')
  })

  it('escapes identity fields so a malicious name cannot inject markup', async () => {
    await db.business.update({
      where: { id: testBusinessId },
      data: { slug: 'xss-co', name: '<script>alert(1)</script>' },
    })

    const res = await app.inject({ method: 'GET', url: '/b/xss-co' })
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('<script>alert(1)</script>')
    expect(res.body).toContain('&lt;script&gt;')
  })

  it('404s for an unknown slug', async () => {
    const res = await app.inject({ method: 'GET', url: '/b/no-such-business' })
    expect(res.statusCode).toBe(404)
  })
})
