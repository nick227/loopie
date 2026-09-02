// Covers the republish-mid-session race: a visitor's browser has an already-rendered hosted page
// open (built from PublishedPageVersion v1's frozen formSnapshot) when the business republishes
// to v2 with a different form. The visitor's in-flight submission carries the publishedVersionId
// its own page was actually rendered from (see renderFormHtml), so it must keep validating
// against v1 even though v2 is now the page's current live version — closing the gap where
// LandingPageSubmissionService.submit() used to always re-fetch "whatever's live now".
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { db, issueSid } from '@project/db'

const app = buildTestApp()

async function createTemplate() {
  return db.landingPageTemplate.create({
    data: {
      name: 'Version Pin Template',
      isSystem: true,
      schema: {
        sections: [{ key: 'form', type: 'form-embed', order: 0, hideable: false, editable: [] }],
        themeTokens: [],
      },
    },
  })
}

describe('landing page submission — published version pinning', () => {
  it('validates a pinned submission against the version it was rendered from, not the current live one', async () => {
    const template = await createTemplate()

    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'V1 Form',
        fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
      },
    })
    const formId = formRes.json().data.id

    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Version Pin Page',
        slug: `version-pin-page-${Date.now()}`,
        formId,
      },
    })
    const page = pageRes.json().data

    const publishV1 = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    const v1 = publishV1.json().data
    expect(v1.formSnapshot.fields.map((f: any) => f.fieldKey)).toEqual(['email'])

    // Business now swaps the required field entirely (email -> phone) and republishes to v2,
    // simulating an edit that happens while a visitor still has v1's HTML open in their browser.
    await app.inject({
      method: 'PATCH',
      url: `/forms/${formId}`,
      headers: asAuth(testUserId),
      payload: {
        fields: [{ label: 'Phone', fieldKey: 'phone', type: 'PHONE', required: true, order: 0 }],
      },
    })
    const publishV2 = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    const v2 = publishV2.json().data
    expect(v2.formSnapshot.fields.map((f: any) => f.fieldKey)).toEqual(['phone'])
    expect(v2.id).not.toBe(v1.id)

    // A submission pinned to v1 (what the visitor's stale page actually rendered) with v1's
    // "email" field succeeds, even though v2 (the current live version) no longer has that field
    // and would instead demand "phone".
    const pinnedSubmit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        publishedVersionId: v1.id,
        data: { email: 'stale-page-visitor@example.com' },
      },
    })
    expect(pinnedSubmit.statusCode).toBe(201)
    const contact = await db.contact.findUniqueOrThrow({
      where: { id: pinnedSubmit.json().data.contactId },
    })
    expect(contact.email).toBe('stale-page-visitor@example.com')
    expect(pinnedSubmit.json().data.submissionId).toBeTruthy()
    const submission = await db.formSubmission.findUniqueOrThrow({
      where: { id: pinnedSubmit.json().data.submissionId },
    })
    expect(submission.publishedPageVersionId).toBe(v1.id)

    // A submission with no pin at all (legacy caller, or exported/downloaded HTML) still falls
    // back to today's current live version (v2), unaffected by pinning.
    const unpinnedSubmit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { phone: '555-0100' },
      },
    })
    expect(unpinnedSubmit.statusCode).toBe(201)
    const unpinnedSubmission = await db.formSubmission.findUniqueOrThrow({
      where: { id: unpinnedSubmit.json().data.submissionId },
    })
    expect(unpinnedSubmission.publishedPageVersionId).toBe(v2.id)

    // A publishedVersionId that doesn't belong to this landing page (or doesn't exist at all) is
    // rejected rather than silently falling back to whatever's live.
    const bogusSubmit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        publishedVersionId: randomUUID(),
        data: { email: 'nope@example.com' },
      },
    })
    expect(bogusSubmit.statusCode).toBe(404)
  })

  it('embeds the rendered publishedVersionId into the hosted page HTML', async () => {
    const template = await createTemplate()
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Embedded Pin Form',
        fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
      },
    })
    const formId = formRes.json().data.id
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Embedded Pin Page',
        slug: `embedded-pin-page-${Date.now()}`,
        formId,
      },
    })
    const page = pageRes.json().data
    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    const version = publishRes.json().data

    const serveRes = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(serveRes.statusCode).toBe(200)
    expect(serveRes.body).toContain(`publishedVersionId: ${JSON.stringify(version.id)}`)
  })
})
