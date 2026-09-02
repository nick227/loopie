// Regression coverage for slice 5 (profile full-page redesign, expanded About/contact fields,
// image gallery, shared public chrome across River + profiles) — see the dated plan this pass
// implemented. Real assertions, hand-written, against loopie_test.
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
  const data = res.json().data
  return { businessId: data.businessId as string, userId: data.id as string }
}

async function getSlug(businessId: string) {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })
  return business.slug as string
}

describe('Business profile v3 (slice 5)', () => {
  it('PATCH /business persists and returns the new About/contact/gallery fields', async () => {
    const owner = await registerBusiness('profilev3-fields@river.local', 'Profile V3 Fields')
    const res = await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(owner.userId),
      payload: {
        description: 'We build things.',
        phone: '(512) 555-0100',
        email: 'hello@example.com',
        hours: 'Mon-Fri 9am-5pm',
        galleryImageUrls: ['/media/one.png', '/media/two.png'],
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({
      description: 'We build things.',
      phone: '(512) 555-0100',
      email: 'hello@example.com',
      hours: 'Mon-Fri 9am-5pm',
      galleryImageUrls: ['/media/one.png', '/media/two.png'],
    })

    const stored = await db.business.findUniqueOrThrow({ where: { id: owner.businessId } })
    expect(stored.description).toBe('We build things.')
    expect(stored.galleryImageUrls).toEqual(['/media/one.png', '/media/two.png'])
  })

  it('the About section shows only fields that are actually set — no fabricated placeholders', async () => {
    const withFields = await registerBusiness('profilev3-about-full@river.local', 'About Full Co')
    await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(withFields.userId),
      payload: { description: 'A real description.', phone: '555-1212', hours: 'Always open' },
    })
    const slugFull = await getSlug(withFields.businessId)
    const resFull = await app.inject({ method: 'GET', url: `/b/${slugFull}` })
    expect(resFull.statusCode).toBe(200)
    expect(resFull.body).toContain('A real description.')
    expect(resFull.body).toContain('555-1212')
    expect(resFull.body).toContain('Always open')

    const bare = await registerBusiness('profilev3-about-bare@river.local', 'About Bare Co')
    const slugBare = await getSlug(bare.businessId)
    const resBare = await app.inject({ method: 'GET', url: `/b/${slugBare}` })
    expect(resBare.statusCode).toBe(200)
    expect(resBare.body).not.toContain('class="section-title">About<')
    expect(resBare.body).not.toContain('class="sidebar-title"')
  })

  it('the gallery renders images in order when set, and the section is absent when empty', async () => {
    const withGallery = await registerBusiness(
      'profilev3-gallery-yes@river.local',
      'Gallery Yes Co',
    )
    await app.inject({
      method: 'PATCH',
      url: '/business',
      headers: asAuth(withGallery.userId),
      payload: { galleryImageUrls: ['/media/first.png', '/media/second.png'] },
    })
    const slugYes = await getSlug(withGallery.businessId)
    const resYes = await app.inject({ method: 'GET', url: `/b/${slugYes}` })
    expect(resYes.statusCode).toBe(200)
    expect(resYes.body).toContain('class="gallery-grid"')
    expect(resYes.body.indexOf('first.png')).toBeLessThan(resYes.body.indexOf('second.png'))

    const withoutGallery = await registerBusiness(
      'profilev3-gallery-no@river.local',
      'Gallery No Co',
    )
    const slugNo = await getSlug(withoutGallery.businessId)
    const resNo = await app.inject({ method: 'GET', url: `/b/${slugNo}` })
    expect(resNo.statusCode).toBe(200)
    expect(resNo.body).not.toContain('class="gallery-grid"')
  })

  it('GET /river and GET /b/{slug} share the same public header markup', async () => {
    const owner = await registerBusiness('profilev3-chrome@river.local', 'Chrome Co')
    const slug = await getSlug(owner.businessId)

    const riverRes = await app.inject({ method: 'GET', url: '/river' })
    const profileRes = await app.inject({ method: 'GET', url: `/b/${slug}` })
    expect(riverRes.statusCode).toBe(200)
    expect(profileRes.statusCode).toBe(200)

    expect(riverRes.body).toContain('class="public-header"')
    expect(profileRes.body).toContain('class="public-header"')
    expect(riverRes.body).toContain('class="wordmark"')
    expect(profileRes.body).toContain('class="wordmark"')
  })
})
