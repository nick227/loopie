// Filled-in integration test (not a generated stub) for landing-page capture immutability:
// PublishedPageVersion.formSnapshot must freeze a Form's fields at publish time, so editing the
// live Form afterward cannot change what an already-published page renders or validates
// submissions against.
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db, issueSid } from '@project/db'

const app = buildTestApp()

async function createTemplate() {
  return db.landingPageTemplate.create({
    data: {
      name: 'Immutability Template',
      isSystem: true,
      schema: {
        sections: [{ key: 'form', type: 'form-embed', order: 0, hideable: false, editable: [] }],
        themeTokens: [],
      },
    },
  })
}

describe('landing-page capture immutability', () => {
  it('freezes the form fields at publish time and keeps validating/rendering against them after the live Form changes', async () => {
    const template = await createTemplate()

    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Original Form',
        fields: [
          { label: 'Name', fieldKey: 'name', type: 'TEXT', required: true, order: 0 },
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 1 },
        ],
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
        name: 'Immutable Page',
        slug: `immutable-page-${Date.now()}`,
        formId,
      },
    })
    expect(pageRes.statusCode).toBe(201)
    const page = pageRes.json().data

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)
    const version = publishRes.json().data
    expect(version.formSnapshot.fields.map((f: any) => f.fieldKey).sort()).toEqual([
      'email',
      'name',
    ])

    // Now mutate the live Form after publishing: drop the "name" requirement, add a brand-new
    // required "phone" field, and swap "email" out of the field list entirely.
    const editRes = await app.inject({
      method: 'PATCH',
      url: `/forms/${formId}`,
      headers: asAuth(testUserId),
      payload: {
        fields: [
          { label: 'Name', fieldKey: 'name', type: 'TEXT', required: false, order: 0 },
          { label: 'Phone', fieldKey: 'phone', type: 'PHONE', required: true, order: 1 },
        ],
      },
    })
    expect(editRes.statusCode).toBe(200)

    // The hosted page still renders the ORIGINAL fields, not the edited live Form.
    const serveRes = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(serveRes.statusCode).toBe(200)
    expect(serveRes.body).toContain('name="email"')
    expect(serveRes.body).not.toContain('name="phone"')

    // Submitting with the ORIGINAL required fields (name + email), omitting the live Form's new
    // "phone" field entirely, still succeeds — the new requirement was never frozen in.
    const goodSubmit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { name: 'Jane Doe', email: 'jane@example.com' },
      },
    })
    expect(goodSubmit.statusCode).toBe(201)
    expect(goodSubmit.json().data.contactId).toBeTruthy()

    const contact = await db.contact.findUniqueOrThrow({
      where: { id: goodSubmit.json().data.contactId },
    })
    expect(contact.email).toBe('jane@example.com')

    // Submitting WITHOUT "email" is still rejected — it was required in the frozen snapshot,
    // even though the live Form's "name" field is no longer required.
    const badSubmit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { name: 'No Email Guy' },
      },
    })
    expect(badSubmit.statusCode).toBe(400)
    expect(badSubmit.json().error).toContain('email')

    // Republishing, on the other hand, freezes a fresh snapshot reflecting the edited Form.
    const republishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(republishRes.statusCode).toBe(201)
    const republished = republishRes.json().data
    expect(republished.formSnapshot.fields.map((f: any) => f.fieldKey).sort()).toEqual([
      'name',
      'phone',
    ])

    const serveAfterRepublish = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(serveAfterRepublish.body).toContain('name="phone"')
    expect(serveAfterRepublish.body).not.toContain('name="email"')
  })

  it('a published version created before formSnapshot existed falls back to a live form lookup', async () => {
    const template = await createTemplate()
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Legacy Form',
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
        name: 'Legacy Page',
        slug: `legacy-page-${Date.now()}`,
        formId,
      },
    })
    const page = pageRes.json().data

    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })

    // Simulate a pre-migration row: null out the snapshot directly, as if this version had been
    // published before PublishedPageVersion.formSnapshot existed.
    const current = await db.landingPage.findUniqueOrThrow({ where: { id: page.id } })
    await db.$executeRawUnsafe(
      `UPDATE PublishedPageVersion SET formSnapshot = NULL WHERE id = ?`,
      current.publishedVersionId,
    )

    // The hosted GET /p/{slug} render must fall back to a live form lookup the same way submit
    // does — a null formSnapshot must not mean "render with no form at all".
    const serveRes = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(serveRes.statusCode).toBe(200)
    expect(serveRes.body).toContain('name="email"')

    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        data: { email: 'legacy@example.com' },
      },
    })
    expect(submitRes.statusCode).toBe(201)
  })
})
