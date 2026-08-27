import { describe, it, expect } from 'vitest'
import {
  SYSTEM_LEAD_GEN_TEMPLATE_ID,
  SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
  parseYoutubeId,
  issueSid,
} from '@project/db'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { renderLandingPageHtml } from '../lib/renderLandingPage'

const app = buildTestApp()

async function registerBusiness() {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      email: `editor-${Date.now()}@example.com`,
      password: 'password12',
      businessName: 'Editor Co',
    },
  })
  expect(res.statusCode).toBe(201)
  return { userId: res.json().data.id as string }
}

describe('page editor', () => {
  it('registers a Home page with mock hero copy and a name+email form', async () => {
    const { userId } = await registerBusiness()
    const list = await app.inject({
      method: 'GET',
      url: '/landing-pages',
      headers: asAuth(userId),
    })
    const page = list.json().data[0]
    expect(page.templateId).toBe(SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID)

    const hosted = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(hosted.statusCode).toBe(200)
    expect(hosted.body).toContain('Editor Co is booking this week')
    expect(hosted.body).toContain('images.unsplash.com')
    expect(hosted.body).toContain('name="name"')
    expect(hosted.body).toContain('type="email"')
    expect(hosted.body).not.toContain('/embed/')
  })

  it('publishes form field edits onto the hosted page', async () => {
    const { userId } = await registerBusiness()
    const list = await app.inject({
      method: 'GET',
      url: '/landing-pages',
      headers: asAuth(userId),
    })
    const page = list.json().data[0]
    const patched = await app.inject({
      method: 'PATCH',
      url: `/forms/${page.formId}`,
      headers: asAuth(userId),
      payload: {
        fields: [
          { label: 'Name', fieldKey: 'name', type: 'TEXT', required: true, order: 0 },
          { label: 'Work email', fieldKey: 'email', type: 'EMAIL', required: true, order: 1 },
          { label: 'Phone', fieldKey: 'phone', type: 'PHONE', required: true, order: 2 },
        ],
      },
    })
    expect(patched.statusCode).toBe(200)

    const before = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(before.body).not.toContain('Work email')
    expect(before.body).not.toContain('name="phone"')

    const published = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(userId),
    })
    expect(published.statusCode).toBe(201)

    const after = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(after.body).toContain('Work email')
    expect(after.body).toContain('name="phone"')

    const submit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        data: { name: 'Ada', email: 'ada@example.com' },
      },
    })
    expect(submit.statusCode).toBe(400)
  })

  it('switches template without rewriting content keys', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: SYSTEM_LEAD_GEN_TEMPLATE_ID,
        name: 'Switch Page',
        slug: `switch-${Date.now()}`,
      },
    })
    expect(created.statusCode).toBe(201)
    const page = created.json().data
    expect(page.content.sections.features).toBeTruthy()
    expect(page.content.sections.image.imageUrl).toContain('images.unsplash.com')
    expect(page.formId).toBeTruthy()

    const switched = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { templateId: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID },
    })
    expect(switched.statusCode).toBe(200)
    expect(switched.json().data.templateId).toBe(SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID)
    expect(switched.json().data.content.sections.features).toBeTruthy()

    const exported = await app.inject({
      method: 'GET',
      url: `/landing-pages/${page.id}/export`,
      headers: asAuth(testUserId),
    })
    expect(exported.statusCode).toBe(200)
    expect(exported.json().data.html).not.toContain('lp-features')
    expect(exported.json().data.html).toContain('lp-hero')
  })

  it('rejects a non-YouTube URL and does not render garbage as an iframe', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID,
        name: 'Tube Page',
        slug: `tube-${Date.now()}`,
      },
    })
    expect(created.statusCode).toBe(201)
    const page = created.json().data

    const bad = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: {
        content: {
          sections: {
            ...page.content.sections,
            youtube: { hidden: false, youtubeUrl: 'https://example.com/watch?v=nope' },
          },
        },
      },
    })
    expect(bad.statusCode).toBe(400)

    const good = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: {
        content: {
          sections: {
            ...page.content.sections,
            youtube: { hidden: false, youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          },
        },
      },
    })
    expect(good.statusCode).toBe(200)
    expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')

    const html = renderLandingPageHtml({
      pageName: 'x',
      templateSchema: {
        sections: [{ key: 'youtube', type: 'media-youtube', order: 0 }],
      },
      content: { sections: { youtube: { youtubeUrl: 'not-a-url' } } },
      theme: null,
      form: null,
      submitActionUrl: 'https://example.com',
    })
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('youtube')
  })
})
