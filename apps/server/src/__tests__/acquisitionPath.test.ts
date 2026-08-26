// Filled-in integration test (not a generated stub) for the acquisition chain added
// 2026-08-26: Campaign -> Creative -> Deployment -> LandingPage -> Form -> Submission ->
// Contact -> Lead. Exercises the real routes end-to-end rather than calling services directly,
// so it also proves the OpenAPI contract, handler wiring, and DB relations agree with each other.
//
// NOTE: like the rest of this project's test suite, this has not been run against a live
// database in this environment (no provisioned MySQL — see CLAUDE.md "Not Yet Verified: Live
// Database"). It typechecks clean and reads correct against the implementation; running it is
// the next verification step once DATABASE_URL points at a real database.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

describe('acquisition path: Campaign -> Creative -> Deployment -> LandingPage -> Form -> Submission -> Contact -> Lead', () => {
  it('a tracked click followed by a landing-page form submission creates an attributed Contact + Lead', async () => {
    const template = await db.landingPageTemplate.create({
      data: {
        name: 'Simple Lead Gen',
        isSystem: true,
        schema: {
          sections: [
            { key: 'hero', type: 'hero', order: 0, hideable: true, editable: ['headline'] },
            { key: 'form', type: 'form-embed', order: 1, hideable: false, editable: [] },
          ],
          themeTokens: ['primaryColor'],
        },
      },
    })

    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Test Creative' },
    })

    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Test Campaign',
        budget: 100,
        startDate: new Date(),
        destinationUrl: 'https://fallback.example.com',
        platforms: ['META'],
        creativeLinks: { create: [{ creativeId: creative.id }] },
      },
    })

    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Contact form',
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
      payload: { templateId: template.id, name: 'Test Page', slug: `test-page-${Date.now()}`, formId },
    })
    expect(pageRes.statusCode).toBe(201)
    const page = pageRes.json().data

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)

    const deployment = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creative.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })

    // Ad click -> tracked redirect -> the destination landing page, not the campaign fallback URL.
    const clickRes = await app.inject({ method: 'GET', url: `/r/${deployment.id}` })
    expect(clickRes.statusCode).toBe(302)
    expect(clickRes.headers.location).toContain(`/p/${page.slug}`)

    // The redirect must carry the session id forward as ?sid= — the hosted page's form JS reads
    // it from its own URL (see renderLandingPage.ts), it isn't looked up server-side. A live-DB
    // smoke test caught this missing before the fix (the redirect had no query string at all).
    const redirectLocation = new URL(clickRes.headers.location as string)
    const sidFromRedirect = redirectLocation.searchParams.get('sid')
    expect(sidFromRedirect).toBeTruthy()

    const event = await db.attributionEvent.findFirstOrThrow({ where: { deploymentId: deployment.id } })
    expect(event.sessionId).toBe(sidFromRedirect)

    // Same session, later: the visitor fills out the form on the hosted page, submitting the
    // sid exactly as a real browser would have read it off the redirected URL.
    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sidFromRedirect, data: { name: 'Jane Smith', email: 'jane@example.com' } },
    })
    expect(submitRes.statusCode).toBe(201)
    const result = submitRes.json().data
    expect(result.contactId).toBeTruthy()
    expect(result.leadId).toBeTruthy()

    const lead = await db.lead.findUniqueOrThrow({ where: { id: result.leadId } })
    expect(lead.sourceType).toBe('DEPLOYMENT')
    expect(lead.sourceDeploymentId).toBe(deployment.id)
    expect(lead.landingSessionId).toBe(event.sessionId)

    const contact = await db.contact.findUniqueOrThrow({ where: { id: result.contactId } })
    expect(contact.email).toBe('jane@example.com')
    expect(contact.businessId).toBe(testBusinessId)

    const updatedDeployment = await db.deployment.findUniqueOrThrow({ where: { id: deployment.id } })
    expect(updatedDeployment.clicks).toBe(1)
    expect(updatedDeployment.conversions).toBe(1)

    const submission = await db.formSubmission.findFirstOrThrow({ where: { landingPageId: page.id } })
    expect(submission.contactId).toBe(result.contactId)
    expect(submission.leadId).toBe(result.leadId)
    expect(submission.sourceDeploymentId).toBe(deployment.id)
  })

  it('submitting without a prior tracked click still creates a Contact + Lead, attributed MANUAL', async () => {
    const template = await db.landingPageTemplate.create({
      data: { name: 'Organic Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
    })
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: { name: 'Simple form', fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }] },
    })
    const formId = formRes.json().data.id

    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: { templateId: template.id, name: 'Organic Page', slug: `organic-page-${Date.now()}`, formId },
    })
    const page = pageRes.json().data

      await app.inject({
        method: 'POST',
        url: `/landing-pages/${page.id}/publish`,
        headers: asAuth(testUserId),
      })

      const submitRes = await app.inject({
        method: 'POST',
        url: `/landing-pages/${page.id}/submissions`,
        payload: { data: { email: 'organic@example.com' } },
      })
    expect(submitRes.statusCode).toBe(201)

    const lead = await db.lead.findUniqueOrThrow({ where: { id: submitRes.json().data.leadId } })
    expect(lead.sourceType).toBe('MANUAL')
    expect(lead.sourceDeploymentId).toBeNull()
  })
})
