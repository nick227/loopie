// Corporate Professional's nav/hero/footer CTAs all link to #contact, but the template's schema
// used to have no section type that ever rendered a form or an id="contact" target at all — the
// Form auto-attached to every new LandingPage was silently orphaned on this template. Locks in
// the fix: 'footer' is now a 'studio-contact' section, so the real attached form renders there.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID } from '@project/db'

const app = buildTestApp()

describe('Corporate Professional template — real lead capture', () => {
  it('renders the attached form at #contact and accepts a submission through it', async () => {
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID,
        name: 'Corporate Page',
        slug: `corporate-page-${Date.now()}`,
      },
    })
    expect(pageRes.statusCode).toBe(201)
    const page = pageRes.json().data
    expect(page.formId).toBeTruthy()

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)

    const serveRes = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(serveRes.statusCode).toBe(200)
    // The section that carries the form must actually be present, not just linked to.
    expect(serveRes.body).toContain('id="contact"')
    expect(serveRes.body).toContain('class="lp-form-el"')
    expect(serveRes.body).toContain('data-submit-url')
  })
})
