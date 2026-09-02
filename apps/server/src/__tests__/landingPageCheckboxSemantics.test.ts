// A required CHECKBOX field must behave like a real boolean, not FormData's browser-default
// "on"/absent convention (which the rendered submit script no longer relies on — see
// renderFormHtml's explicit input.checked read). An explicit `false` must be treated as "not
// checked" for required-field purposes, and stored as a real boolean either way.
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { db, issueSid } from '@project/db'

const app = buildTestApp()

async function createTemplate() {
  return db.landingPageTemplate.create({
    data: {
      name: 'Checkbox Semantics Template',
      isSystem: true,
      schema: {
        sections: [{ key: 'form', type: 'form-embed', order: 0, hideable: false, editable: [] }],
        themeTokens: [],
      },
    },
  })
}

describe('landing page submission — checkbox semantics', () => {
  it('rejects an explicit false for a required checkbox and stores true as a boolean', async () => {
    const template = await createTemplate()
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Consent Form',
        fields: [
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 },
          { label: 'I agree', fieldKey: 'agree', type: 'CHECKBOX', required: true, order: 1 },
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
        name: 'Checkbox Page',
        slug: `checkbox-page-${Date.now()}`,
        formId,
      },
    })
    const page = pageRes.json().data
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })

    const rejected = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'unchecked@example.com', agree: false },
      },
    })
    expect(rejected.statusCode).toBe(400)
    expect(rejected.json().error).toContain('agree')

    const accepted = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'checked@example.com', agree: true },
      },
    })
    expect(accepted.statusCode).toBe(201)
    const submission = await db.formSubmission.findUniqueOrThrow({
      where: { id: accepted.json().data.submissionId },
    })
    expect((submission.data as Record<string, unknown>).agree).toBe(true)
  })

  it('stores an unchecked optional checkbox as boolean false rather than stripping it', async () => {
    const template = await createTemplate()
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Optional Consent Form',
        fields: [
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 },
          {
            label: 'Send me updates',
            fieldKey: 'updates',
            type: 'CHECKBOX',
            required: false,
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
        name: 'Optional Checkbox Page',
        slug: `optional-checkbox-page-${Date.now()}`,
        formId,
      },
    })
    const page = pageRes.json().data
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })

    const res = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'optional@example.com', updates: false },
      },
    })
    expect(res.statusCode).toBe(201)
    const submission = await db.formSubmission.findUniqueOrThrow({
      where: { id: res.json().data.submissionId },
    })
    expect((submission.data as Record<string, unknown>).updates).toBe(false)
  })
})
