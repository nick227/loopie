// LandingPage.submissionCount (2026-08-29) — added for the Inbox "Running" panel's Pages card
// (docs/strategy/03-product-principles.md), which needs the real completed-submission outcome,
// not formStartCount (which also counts abandoned attempts). Batched (list) vs single (get/update)
// counting paths both exercised here, not just one.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { db, issueSid } from '@project/db'

const app = buildTestApp()

async function createTemplate() {
  return db.landingPageTemplate.create({
    data: {
      name: 'Submission Count Template',
      isSystem: true,
      schema: {
        sections: [{ key: 'form', type: 'form-embed', order: 0, hideable: false, editable: [] }],
        themeTokens: [],
      },
    },
  })
}

describe('LandingPage.submissionCount', () => {
  it('counts real completed submissions, distinct from formStartCount, in list/get/update', async () => {
    const template = await createTemplate()

    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Submission Count Form',
        fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
      },
    })
    expect(formRes.statusCode).toBe(201)
    const formId = formRes.json().data.id

    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Submission Count Page',
        slug: `submission-count-${Date.now()}`,
        formId,
      },
    })
    expect(pageRes.statusCode).toBe(201)
    const page = pageRes.json().data
    expect(page.submissionCount).toBe(0)

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)

    // A form start (recordLandingPageFormStart) increments formStartCount but is NOT a submission.
    await app.inject({ method: 'POST', url: `/landing-pages/${page.id}/form-start` })
    await app.inject({ method: 'POST', url: `/landing-pages/${page.id}/form-start` })

    for (const email of ['a@example.com', 'b@example.com']) {
      const submitRes = await app.inject({
        method: 'POST',
        url: `/landing-pages/${page.id}/submissions`,
        payload: { sessionId: issueSid().token, data: { email } },
      })
      expect(submitRes.statusCode).toBe(201)
    }

    const getRes = await app.inject({
      method: 'GET',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
    })
    expect(getRes.json().data.submissionCount).toBe(2)
    expect(getRes.json().data.formStartCount).toBe(2)

    const listRes = await app.inject({
      method: 'GET',
      url: '/landing-pages',
      headers: asAuth(testUserId),
    })
    const listed = listRes.json().data.find((p: { id: string }) => p.id === page.id)
    expect(listed.submissionCount).toBe(2)

    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'Renamed Page' },
    })
    expect(updateRes.json().data.submissionCount).toBe(2)
  })
})
