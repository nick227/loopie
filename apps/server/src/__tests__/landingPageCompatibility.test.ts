// Pages Phase 3 (2026-09-10) — GET /landing-pages/{id}/compatibility, the real endpoint behind
// the in-editor Layout switcher and Page Type conversion. See
// docs/strategy/pages-page-types-and-style-axes-roadmap.md §6 Phase 3.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherBusinessId } from './helpers'
import { db } from '@project/db'
import { ensureSystemTemplates } from '../lib/ensureSystemTemplates'

const app = buildTestApp()

async function createPage(templateId: string, content: Record<string, unknown> = {}) {
  const res = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId,
      name: 'Compat Page',
      slug: `compat-page-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  })
  expect(res.statusCode).toBe(201)
  const page = res.json().data
  if (Object.keys(content).length > 0) {
    await db.landingPage.update({ where: { id: page.id }, data: { content: content as any } })
  }
  return page
}

describe('GET /landing-pages/{id}/compatibility', () => {
  it('reports the page as compatible with its own current Layout and every Page Type entry present', async () => {
    const page = await createPage('system-template-lead-gen')
    const res = await app.inject({
      method: 'GET',
      url: `/landing-pages/${page.id}/compatibility`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(data.currentLayoutId).toBe('system-template-lead-gen')
    expect(data.currentPageType).toBe('LANDING')
    const self = data.layouts.find((l: any) => l.layoutId === 'system-template-lead-gen')
    expect(self.compatible).toBe(true)
    expect(self.blockers).toEqual([])
    expect(data.pageTypes).toHaveLength(8) // HOME, LANDING, STUDIO, PORTFOLIO, EMAIL_CAPTURE, STORE, EVENT, GENERAL
    const landing = data.pageTypes.find((t: any) => t.pageType === 'LANDING')
    expect(landing.compatible).toBe(true)
    expect(landing.supportedLayoutIds).toContain('system-template-lead-gen')
  })

  it('never leaks another business’s page, and 404s cleanly', async () => {
    // Direct DB create, not through the API — setup.ts's global afterEach wipes
    // landingPageTemplate between every test, so the system templates must be reseeded first.
    await ensureSystemTemplates(db)
    const otherPage = await db.landingPage.create({
      data: {
        businessId: testOtherBusinessId,
        templateId: 'system-template-lead-gen',
        name: 'Other biz page',
        slug: `other-biz-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        content: {},
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/landing-pages/${otherPage.id}/compatibility`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(404)
  })

  it('active vs. dormant end-to-end: a real active-content blocker shows up through the HTTP endpoint', async () => {
    // gallery IS active on studio (a real, supported section there) — switching to Portfolio
    // (which has none) is a genuine loss: a real blocker, matching the exact pattern found in the
    // live 431-page matrix (5 real Studio pages with active gallery content blocked on Portfolio).
    const page = await createPage('system-template-studio', {
      gallery: { items: [{ url: 'https://example.com/a.jpg' }] },
    })
    const res = await app.inject({
      method: 'GET',
      url: `/landing-pages/${page.id}/compatibility`,
      headers: asAuth(testUserId),
    })
    const data = res.json().data
    const portfolio = data.layouts.find((l: any) => l.layoutId === 'system-template-portfolio')
    expect(portfolio.compatible).toBe(false)
    expect(portfolio.blockers).toEqual([expect.objectContaining({ kind: 'slot', key: 'gallery' })])
  })

  it('active vs. dormant end-to-end: dormant content is a warning, never a blocker, through the HTTP endpoint', async () => {
    // media is dormant on studio (no Layout except lead-gen has ever supported it) — the real,
    // dominant pattern found in the live matrix. Switching to another Layout that also lacks it
    // (corporate-professional) must stay compatible: nothing visible today is lost.
    const page = await createPage('system-template-studio', {
      media: { kind: 'image', url: 'https://example.com/leftover.jpg' },
    })
    const res = await app.inject({
      method: 'GET',
      url: `/landing-pages/${page.id}/compatibility`,
      headers: asAuth(testUserId),
    })
    const data = res.json().data
    const home = data.layouts.find(
      (l: any) => l.layoutId === 'system-template-corporate-professional',
    )
    expect(home.compatible).toBe(true)
    expect(home.warnings).toEqual([expect.objectContaining({ kind: 'slot', key: 'media' })])
  })
})
