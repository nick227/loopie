/**
 * Canonical "real rendered artifact" coverage for landing-page publishing:
 *   publish page -> serve the actual generated HTML at /p/{slug} (no React involved) ->
 *   fill the real DOM form in a real browser -> submit through the real public endpoint ->
 *   confirm a FormSubmission/Contact/Lead actually got created.
 *
 * This exists because every prior test only exercised LandingPageSubmissionService.submit()
 * directly with a synthetic idempotencyKey, which is why a missing idempotencyKey in the
 * generated client script (packages/page-renderer/src/renderLandingPage.ts's renderFormHtml)
 * went undetected — every real hosted-page submission 400'd in production while every service-
 * level test kept passing. This spec drives the actual generated <form>/<script> the way a real
 * visitor's browser would, so it would have caught that gap, the checkbox "on"/boolean
 * serialization gap, and the Corporate Professional template never rendering its attached form.
 *
 * Seed credentials come from packages/db/prisma/seed.ts. Run seed before tests: pnpm db:seed
 */
import { test, expect, type Page } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

// Stable, public system template ids — see packages/db/src/leadGenTemplate.ts and
// packages/db/src/data/corporate-professional.ts.
const SYSTEM_LEAD_GEN_TEMPLATE_ID = 'system-template-lead-gen'
const SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID = 'system-template-corporate-professional'

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/calendar/)
}

test.describe('hosted landing page — real rendered artifact', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_EMAIL, DEMO_PASSWORD)
  })

  test('publish -> serve real HTML -> fill -> submit -> lead is created, checkbox included', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

    // A required CHECKBOX field — only a real browser submitting the real generated <script>
    // (not a direct service call with a hand-built payload) exercises whether the client
    // actually serializes it as a boolean the way the server now expects.
    const formRes = await page.request.post(`${apiOrigin}/forms`, {
      data: {
        name: `E2E Hosted Form ${Date.now()}`,
        fields: [
          { label: 'Name', fieldKey: 'name', type: 'TEXT', required: true, order: 0 },
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 1 },
          {
            label: 'I agree to be contacted',
            fieldKey: 'agree',
            type: 'CHECKBOX',
            required: true,
            order: 2,
          },
        ],
      },
    })
    expect(formRes.ok()).toBeTruthy()
    const formId = (await formRes.json()).data.id

    const pageRes = await page.request.post(`${apiOrigin}/landing-pages`, {
      data: {
        templateId: SYSTEM_LEAD_GEN_TEMPLATE_ID,
        name: `E2E Hosted Page ${Date.now()}`,
        slug: `e2e-hosted-page-${Date.now()}`,
        formId,
      },
    })
    expect(pageRes.ok()).toBeTruthy()
    const landingPage = (await pageRes.json()).data

    const publishRes = await page.request.post(
      `${apiOrigin}/landing-pages/${landingPage.id}/publish`,
    )
    expect(publishRes.ok()).toBeTruthy()

    // --- Navigate a real browser tab straight at the generated, hosted HTML — not the React app.
    const hostedPath = new URL(landingPage.hostedUrl, apiOrigin).pathname
    await page.goto(`${apiOrigin}${hostedPath}`)

    await page.locator('input[name="name"]').fill('Jane Visitor')
    const email = `jane-${Date.now()}@example.com`
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="agree"]').check()
    await page.locator('form.lp-form-el button[type="submit"]').click()

    // The client script swaps the <form> for the success message only on a real 201 response —
    // this alone proves the required idempotencyKey (and every other contract field) was
    // actually sent and accepted by the real endpoint, not just constructible in a test payload.
    await expect(page.locator('.lp-success')).toBeVisible({ timeout: 10000 })

    // Confirm the submission became a real Lead, via the same real, authenticated, public stats
    // endpoint the product's own Activity tab uses (there's no GET submissions-list endpoint —
    // see LandingPage.tsx's PageActivity component).
    await expect(async () => {
      const perfRes = await page.request.get(
        `${apiOrigin}/landing-pages/${landingPage.id}/performance`,
      )
      const perf = (await perfRes.json()).data
      expect(perf.submissions).toBe(1)
      expect(perf.leads).toBe(1)
    }).toPass({ timeout: 10000 })
  })

  test('Corporate Professional template actually renders and accepts its attached form', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

    // No formId — LandingPageService.create() auto-attaches a default "Contact" (name + email)
    // form to every new page, this template included.
    const pageRes = await page.request.post(`${apiOrigin}/landing-pages`, {
      data: {
        templateId: SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID,
        name: `E2E Corporate Page ${Date.now()}`,
        slug: `e2e-corporate-page-${Date.now()}`,
      },
    })
    expect(pageRes.ok()).toBeTruthy()
    const landingPage = (await pageRes.json()).data
    expect(landingPage.formId).toBeTruthy()

    const publishRes = await page.request.post(
      `${apiOrigin}/landing-pages/${landingPage.id}/publish`,
    )
    expect(publishRes.ok()).toBeTruthy()

    const hostedPath = new URL(landingPage.hostedUrl, apiOrigin).pathname
    await page.goto(`${apiOrigin}${hostedPath}`)

    // The attached form must actually be present and reachable at #contact — every nav/hero/
    // footer CTA on this template links there.
    await expect(page.locator('#contact form.lp-form-el')).toBeVisible()

    await page.locator('input[name="name"]').fill('Corporate Visitor')
    await page.locator('input[name="email"]').fill(`corporate-${Date.now()}@example.com`)
    await page.locator('#contact form.lp-form-el button[type="submit"]').click()

    await expect(page.locator('#contact .lp-success')).toBeVisible({ timeout: 10000 })

    await expect(async () => {
      const perfRes = await page.request.get(
        `${apiOrigin}/landing-pages/${landingPage.id}/performance`,
      )
      const perf = (await perfRes.json()).data
      expect(perf.submissions).toBe(1)
      expect(perf.leads).toBe(1)
    }).toPass({ timeout: 10000 })
  })
})
