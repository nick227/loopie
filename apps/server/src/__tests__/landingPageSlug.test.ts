// Filled-in integration test (not a generated stub) for landing-page slug behavior: the slug
// auto-follows the title on every draft save until it's explicitly edited or the page is first
// published — whichever comes first — so an already-shared, published URL never silently moves
// out from under a later title edit. See CLAUDE.md's landing-page deployment note.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function createTemplate() {
  return db.landingPageTemplate.create({
    data: {
      name: 'Slug Test Template',
      isSystem: true,
      schema: { sections: [], themeTokens: [] },
    },
  })
}

async function createPage(templateId: string, overrides: Partial<Record<string, unknown>> = {}) {
  const res = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId,
      name: 'Untitled page',
      slug: `new-page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ...overrides,
    },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data
}

describe('landing-page slug behavior', () => {
  it('auto-derives the slug from the title on draft saves until published', async () => {
    const template = await createTemplate()
    const page = await createPage(template.id)

    const renamed = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'Spring Detailing Promo' },
    })
    expect(renamed.statusCode).toBe(200)
    expect(renamed.json().data.slug).toBe('spring-detailing-promo')

    // A further title edit, still pre-publish, keeps following.
    const renamedAgain = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'Summer Detailing Promo' },
    })
    expect(renamedAgain.statusCode).toBe(200)
    expect(renamedAgain.json().data.slug).toBe('summer-detailing-promo')
  })

  it("avoids colliding with another page's slug by appending a numeric suffix", async () => {
    const template = await createTemplate()
    await createPage(template.id, { name: 'Grand Opening', slug: 'grand-opening' })
    const page = await createPage(template.id)

    const renamed = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'Grand Opening' },
    })
    expect(renamed.statusCode).toBe(200)
    expect(renamed.json().data.slug).toBe('grand-opening-2')
  })

  it('locks the slug once explicitly edited — a later title edit no longer moves it', async () => {
    const template = await createTemplate()
    const page = await createPage(template.id)

    const manualEdit = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { slug: 'my-custom-url' },
    })
    expect(manualEdit.statusCode).toBe(200)
    expect(manualEdit.json().data.slug).toBe('my-custom-url')

    const laterRename = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'A Totally Different Title' },
    })
    expect(laterRename.statusCode).toBe(200)
    expect(laterRename.json().data.slug).toBe('my-custom-url')
  })

  it('locks the slug on first publish — a later title edit no longer moves the live URL', async () => {
    const template = await createTemplate()
    const page = await createPage(template.id, { name: 'Launch Week' })

    const renamedBeforePublish = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'Launch Week Sale' },
    })
    expect(renamedBeforePublish.json().data.slug).toBe('launch-week-sale')

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)

    const renamedAfterPublish = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'Launch Week Blowout' },
    })
    expect(renamedAfterPublish.statusCode).toBe(200)
    expect(renamedAfterPublish.json().data.slug).toBe('launch-week-sale')
  })
})
