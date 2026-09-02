// A HIDDEN form field has no human to fill it in — FormField.defaultValue is its only value
// source (see formSnapshot.ts). Publishing a page whose form has a required HIDDEN field with no
// default value would freeze a form nobody could ever successfully submit, so
// LandingPageService.publish() rejects it up front instead of letting it surface later as
// unexplained "Missing required field" rejections on every real submission attempt.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function createTemplate() {
  return db.landingPageTemplate.create({
    data: {
      name: 'Hidden Field Guard Template',
      isSystem: true,
      schema: {
        sections: [{ key: 'form', type: 'form-embed', order: 0, hideable: false, editable: [] }],
        themeTokens: [],
      },
    },
  })
}

describe('publish — required hidden field guard', () => {
  it('rejects publishing when a required HIDDEN field has no default value', async () => {
    const template = await createTemplate()
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Impossible Form',
        fields: [
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 },
          {
            label: 'Campaign Tag',
            fieldKey: 'campaign_tag',
            type: 'HIDDEN',
            required: true,
            order: 1,
          },
        ],
      },
    })
    const formId = formRes.json().data.id
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Impossible Page',
        slug: `impossible-page-${Date.now()}`,
        formId,
      },
    })
    const page = pageRes.json().data

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(400)
    expect(publishRes.json().error).toContain('Campaign Tag')

    // Nothing was published — the page must still have no publishedVersionId.
    const stillDraft = await db.landingPage.findUniqueOrThrow({ where: { id: page.id } })
    expect(stillDraft.publishedVersionId).toBeNull()
  })

  it('allows publishing once a default value is set, and renders it into the hidden input', async () => {
    const template = await createTemplate()
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Fixed Form',
        fields: [
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 },
          {
            label: 'Campaign Tag',
            fieldKey: 'campaign_tag',
            type: 'HIDDEN',
            required: true,
            order: 1,
            defaultValue: 'spring-promo',
          },
        ],
      },
    })
    const formId = formRes.json().data.id
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Fixed Page',
        slug: `fixed-page-${Date.now()}`,
        formId,
      },
    })
    const page = pageRes.json().data

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)

    const serveRes = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(serveRes.body).toContain(
      '<input type="hidden" name="campaign_tag" value="spring-promo" />',
    )
  })
})
