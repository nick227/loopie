import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId, testOtherBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function createPage() {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Slot Template',
      isSystem: true,
      schema: {
        sections: [
          { key: 'hero', type: 'hero', order: 0, hideable: false, editable: ['headline'] },
          { key: 'form', type: 'form-embed', order: 1, hideable: false, editable: [] },
        ],
        themeTokens: [],
      },
    },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: 'Slot form',
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'Slot Page',
      slug: `slot-page-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      formId: formRes.json().data.id,
    },
  })
  expect(pageRes.statusCode).toBe(201)
  return pageRes.json().data
}

// Ad slots assign AdRuns (Media/Advertisement/AdRun migration), not AdUnits — see
// lib/adSlots.ts's AdSlotInput/AdSlotDTO shapes. Created directly via Prisma, same style the
// old AdUnit-based helper used, rather than through the declarative create-and-provision API
// (which requires a connected platform + media) since these tests only need a real AdRun row to
// assign to a slot.
async function createAdRun(businessId: string, name: string) {
  const advertisement = await db.advertisement.create({ data: { businessId, name } })
  return db.adRun.create({
    data: {
      advertisementId: advertisement.id,
      platform: 'LOOPIE',
      status: 'ACTIVE',
      idempotencyKey: `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  })
}

describe('page ad slots', () => {
  it('registers a published Home page with two empty spaces that do not render ads', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `pages-${Date.now()}@example.com`,
        password: 'password12',
        businessName: 'Pages Co',
      },
    })
    expect(res.statusCode).toBe(201)
    const userId = res.json().data.id

    const list = await app.inject({
      method: 'GET',
      url: '/landing-pages',
      headers: asAuth(userId),
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().data).toHaveLength(1)
    const page = list.json().data[0]
    expect(page.name).toBe('Home')
    expect(page.status).toBe('PUBLISHED')
    expect(page.adSlotCount).toBe(2)
    expect(
      page.slots.every((slot: { assignments: unknown[] }) => slot.assignments.length === 0),
    ).toBe(true)

    const hosted = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(hosted.statusCode).toBe(200)
    expect(hosted.body).toContain('Clear work. Reliable results.')
    expect(hosted.body).toContain('name="name"')
    expect(hosted.body).toContain('type="email"')
    expect(hosted.body).not.toContain('/embed/')
    expect(hosted.body).not.toContain('class="lp-section lp-ad"')
  })

  it('does not serve assigned ads until publish, then freezes two ads onto the hosted page', async () => {
    const page = await createPage()
    const runA = await createAdRun(testBusinessId, 'Ad A')
    const runB = await createAdRun(testBusinessId, 'Ad B')

    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })

    const assigned = await app.inject({
      method: 'PUT',
      url: `/landing-pages/${page.id}/ad-slots`,
      headers: asAuth(testUserId),
      payload: {
        slots: [
          { placement: 'AFTER_HERO', adRunIds: [runA.id] },
          { placement: 'BEFORE_FORM', adRunIds: [runB.id] },
        ],
      },
    })
    expect(assigned.statusCode).toBe(200)
    expect(assigned.json().data.adSlotCount).toBe(2)

    const before = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(before.statusCode).toBe(200)
    expect(before.body).not.toContain(`/embed/${runA.id}`)
    expect(before.body).not.toContain(`/embed/${runB.id}`)

    const published = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(published.statusCode).toBe(201)

    const after = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(after.statusCode).toBe(200)
    expect(after.body).toContain(`/embed/${runA.id}`)
    expect(after.body).toContain(`/embed/${runB.id}`)
  })

  it('rejects an ad run from another business', async () => {
    const page = await createPage()
    const foreign = await createAdRun(testOtherBusinessId, 'Foreign Ad')

    const res = await app.inject({
      method: 'PUT',
      url: `/landing-pages/${page.id}/ad-slots`,
      headers: asAuth(testUserId),
      payload: { slots: [{ placement: 'AFTER_HERO', adRunIds: [foreign.id] }] },
    })
    expect(res.statusCode).toBe(404)

    const current = await app.inject({
      method: 'GET',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
    })
    expect(
      current
        .json()
        .data.slots.every((slot: { assignments: { adRunId: string }[] }) =>
          slot.assignments.every((a) => a.adRunId !== foreign.id),
        ),
    ).toBe(true)
  })
})
