import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db, hashSessionToken, issueSid } from '@project/db'

const app = buildTestApp()

describe('public capture and auth', () => {
  it('rejects a missing or unsigned session on form submit', async () => {
    const template = await db.landingPageTemplate.create({
      data: { name: 'Sid Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
    })
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Sid form',
        fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true }],
      },
    })
    expect(formRes.statusCode).toBe(201)
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Sid Page',
        slug: `sid-${Date.now()}`,
        formId: formRes.json().data.id,
      },
    })
    const page = pageRes.json().data
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })

    const missing = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { data: { email: 'a@example.com' } },
    })
    expect(missing.statusCode).toBe(400)

    const unsigned = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: 'not-a-signed-sid', data: { email: 'a@example.com' } },
    })
    expect(unsigned.statusCode).toBe(400)
  })

  it('reuses the FormSubmission for the same signed session', async () => {
    const template = await db.landingPageTemplate.create({
      data: { name: 'Idem Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
    })
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Idem form',
        fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true }],
      },
    })
    expect(formRes.statusCode).toBe(201)
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Idem Page',
        slug: `idem-${Date.now()}`,
        formId: formRes.json().data.id,
      },
    })
    const page = pageRes.json().data
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })

    const sessionId = issueSid().token
    const first = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId, data: { email: 'idem@example.com' } },
    })
    const second = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId, data: { email: 'other@example.com' } },
    })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
    expect(second.json().data.submissionId).toBe(first.json().data.submissionId)

    const rows = await db.formSubmission.findMany({ where: { landingPageId: page.id } })
    expect(rows).toHaveLength(1)
  })

  it('does not collect on a soft-deleted form', async () => {
    const template = await db.landingPageTemplate.create({
      data: { name: 'Gone Form Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
    })
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Soon gone',
        fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true }],
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
        name: 'Live page dead form',
        slug: `dead-form-${Date.now()}`,
        formId,
      },
    })
    const page = pageRes.json().data
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    await app.inject({
      method: 'DELETE',
      url: `/forms/${formId}`,
      headers: asAuth(testUserId),
    })

    const served = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(served.statusCode).toBe(200)
    expect(String(served.body)).not.toContain('lp-form-el')

    const submit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: issueSid().token, data: { email: 'late@example.com' } },
    })
    expect(submit.statusCode).toBe(409)
  })

  it('does not record a click whose landing page is unpublished', async () => {
    const template = await db.landingPageTemplate.create({
      data: { name: 'Draft dest', isSystem: true, schema: { sections: [], themeTokens: [] } },
    })
    const page = await db.landingPage.create({
      data: {
        businessId: testBusinessId,
        templateId: template.id,
        name: 'Draft dest page',
        slug: `draft-dest-${Date.now()}`,
        content: { sections: {} },
        status: 'DRAFT',
      },
    })
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Draft dest creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Draft dest campaign',
        budget: 10,
        startDate: new Date(),
        destinationUrl: 'https://example.com',
        platforms: ['META'],
      },
    })
    const deployment = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creative.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })

    const click = await app.inject({ method: 'GET', url: `/r/${deployment.id}` })
    expect(click.statusCode).toBe(404)
    const updated = await db.deployment.findUniqueOrThrow({ where: { id: deployment.id } })
    expect(updated.clicks).toBe(0)
  })

  it('hashes session tokens and stores a normalized email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'Hash.Me@Example.com',
        password: 'password12',
        businessName: 'Hash Co',
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.email).toBe('hash.me@example.com')

    const cookie = String(res.headers['set-cookie'] ?? '')
    const raw = cookie.match(/token=([^;]+)/)?.[1]
    expect(raw).toBeTruthy()

    const stored = await db.session.findFirst({ where: { user: { email: 'hash.me@example.com' } } })
    expect(stored).toBeTruthy()
    expect(stored!.token).toBe(hashSessionToken(raw!))
    expect(stored!.token).not.toBe(raw)
  })
})
