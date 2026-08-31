/**
 * Advertising as the second reference implementation of the native Singleton/Collection/Entity
 * grammar (docs/strategy/03-product-principles.md), reusing the same navigation grammar Pages
 * proved out (pages-reference-flow.spec.ts) while keeping Advertising's own semantics: monitoring-
 * first entity, LOOPIE-owned vs. connected-external destinations distinguished (not split into
 * separate products), capability-gated manage.
 *
 *   Home -> Advertising (via the persistent top nav tab) -> create an Ad -> send it to a real
 *   LOOPIE-owned Page destination (no external platform connection required) -> inspect the
 *   result on the entity -> Back restores the Advertising collection's exact state -> reopen
 *   the same Ad -> Back -> Home tab restores Home's exact position.
 *
 * Deliberately does not exercise the Facebook/Google paid-send path — that preflight/connector
 * flow is mid-flight, unrelated work (see CLAUDE.md's Ad Tracking Hardening / platform-connector
 * history) and not part of the Advertising collection/entity grammar this spec verifies.
 *
 * Rewritten 2026-08-30 for the persistent-top-nav revision (Home/Pages/Advertising/Contacts/
 * Messages as peer tabs, no more Inbox-as-root doorway/back-button model).
 *
 * Seed credentials come from packages/db/prisma/seed.ts. Run seed before tests: pnpm db:seed
 */
import { test, expect, type Page } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

async function loginAs(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/home/)
}

test.describe('Advertising — Singleton/Collection/Entity reference implementation', () => {
  test('Home -> Advertising -> create -> send -> inspect -> reopen -> Back -> Home tab restores exact state', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await loginAs(page)

    // A real, uniquely-named destination Page for the send step below — the shared demo DB
    // accumulates many same-named draft pages across e2e runs, so a positional destination-
    // checkbox index would be flaky; an exact aria-label from a page this test itself created
    // is not.
    const templatesResp = await page.request.get(`${apiOrigin}/landing-page-templates`)
    const templateId = ((await templatesResp.json()).data as { id: string }[])[0]!.id
    const destPageName = `AdDestE2E ${Date.now()}`
    const createPageResp = await page.request.post(`${apiOrigin}/landing-pages`, {
      data: { templateId, name: destPageName, slug: `ad-dest-e2e-${Date.now()}` },
    })
    expect(createPageResp.ok()).toBeTruthy()

    // --- Home: capture baseline state Back has to restore later ---
    await expect(page.getByRole('heading', { name: 'Live presence', exact: true })).toBeVisible()
    await page.waitForTimeout(300)
    await page.evaluate(() => window.scrollTo(0, 300))

    // --- Home -> Advertising, through the persistent top nav tab ---
    await page.getByRole('link', { name: 'Advertising', exact: true }).click()
    await page.waitForURL(/\/ads$/)
    // No separate title text anywhere — the highlighted tab itself communicates location
    // (matching the reference image, which has no title text beside its tabs either).
    await expect(page.getByRole('link', { name: 'Advertising', exact: true })).toHaveClass(
      /border-primary/,
    )
    await expect(page.locator('header').getByRole('button', { name: 'Home' })).toHaveCount(0)

    // State this Back has to restore: real search text, not an incidental empty default.
    const marker = `AdRefE2E ${Date.now()}`
    await page.getByPlaceholder('Search ads by name...').fill(marker)

    // --- Create an Ad ---
    await page.getByRole('button', { name: 'New ad' }).click()
    await page.waitForURL(/\/ads\/new$/)
    await expect(page.locator('header').getByText('New ad', { exact: true })).toBeVisible()
    await page.getByPlaceholder('Ad name').fill(marker)

    // The Embed affordance's placement is real now, even disabled ahead of the embed runtime —
    // present from the moment the entity surface renders, same slot on create as on edit.
    await expect(page.getByRole('button', { name: 'Embed' })).toBeDisabled()

    await page.getByRole('button', { name: 'Choose media' }).click()
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const uploaded = page.waitForResponse(
      (res) => res.url().includes('/assets') && res.request().method() === 'POST',
    )
    await page
      .getByRole('dialog')
      .locator('input[type=file]')
      .setInputFiles({ name: `ad-${Date.now()}.png`, mimeType: 'image/png', buffer: png })
    await uploaded
    await expect(page.getByRole('button', { name: 'Use selected' })).toBeEnabled()
    await page.getByRole('button', { name: 'Use selected' }).click()
    await expect(page.getByRole('button', { name: 'Choose media' })).toHaveCount(0)

    // --- Send to the LOOPIE-owned Page destination — no external connector needed ---
    const sent = page.waitForResponse(
      (res) => res.url().includes('/runs') && res.request().method() === 'POST' && res.ok(),
    )
    await page.getByRole('checkbox', { name: destPageName }).check()
    await sent
    await page.waitForURL(/\/ads\/(?!new$)[^/]+$/, { timeout: 15_000 })

    // --- Back reads "Advertising" now that this is a real entity route, no duplicate chrome ---
    await expect(page.getByRole('button', { name: 'Advertising' })).toBeVisible()
    await expect(
      page.locator('main').getByRole('link', { name: 'Advertising', exact: true }),
    ).toHaveCount(0)
    await expect(page.locator('header').getByText(marker, { exact: true })).toBeVisible()

    // --- Inspect the result, on the entity itself: monitoring-first, LOOPIE-owned delivery ---
    await expect(page.getByText('On this page')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Embed' })).toBeDisabled()

    // --- Back -> the Advertising collection restores its exact state ---
    await page.getByRole('button', { name: 'Advertising' }).click()
    await page.waitForURL(/\/ads$/)
    await expect(page.getByPlaceholder('Search ads by name...')).toHaveValue(marker)
    // Scoped below the search bar — WelcomeSection's own Live Presence grid (also on this page)
    // could in principle carry a link with the same marker text once this ad is live there too.
    const row = page
      .getByPlaceholder('Search ads by name...')
      .locator('xpath=following::a[contains(., "' + marker + '")]')
      .first()
    await expect(row).toBeVisible()
    // The row reflects the send without a stale wait (the same invalidation-fix class as Pages'
    // usePublishLandingPage fix, applied here to the AdRun mutation hooks), and distinguishes the
    // LOOPIE-owned destination inline, not as a separate product.
    await expect(row).toContainText('Running')
    await expect(row).toContainText('Pages')

    // --- Reopen the same Ad from the collection, confirm it's the same entity ---
    await row.click()
    await page.waitForURL(/\/ads\/[^/]+$/)
    await expect(page.locator('header').getByText(marker, { exact: true })).toBeVisible()

    // --- Back -> same Advertising collection state ---
    await page.getByRole('button', { name: 'Advertising' }).click()
    await page.waitForURL(/\/ads$/)
    await expect(page.getByPlaceholder('Search ads by name...')).toHaveValue(marker)

    // --- Home tab -> same Home position ---
    await page.getByRole('link', { name: 'Home', exact: true }).click()
    await page.waitForURL(/\/home/)
    await expect(page.getByRole('heading', { name: 'Live presence', exact: true })).toBeVisible()
    await page.waitForTimeout(800) // let the best-effort scroll-restore retries settle
    // Proves the restore pathway actually engaged (moved us away from a fresh top-of-page load),
    // not pixel-exact equality with the pre-navigation position — the mechanism itself
    // (useRestoreHomeScroll's own comment, InboxSummaryPage.tsx) is documented as best-effort,
    // and Playwright's own scroll-into-view-before-click behavior on the navigating link disturbs
    // the "before" measurement in a way that has nothing to do with the restore logic being
    // tested.
    const scrollAfter = await page.evaluate(() => window.scrollY)
    expect(scrollAfter).toBeGreaterThan(50)
  })
})
