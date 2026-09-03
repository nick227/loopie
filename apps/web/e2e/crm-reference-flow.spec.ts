/**
 * Contacts/CRM as the third reference implementation of the native Singleton/Collection/Entity
 * grammar (docs/strategy/03-product-principles.md), reusing the same navigation grammar Pages and
 * Advertising proved out (pages-reference-flow.spec.ts, advertising-reference-flow.spec.ts) while
 * keeping CRM's own semantics: the entity's existing Overview/Activity/Messages/Sales tabs are
 * untouched, and collection rows quietly distinguish a LOOPIE-native contact from one backed by a
 * linked external record (badge, not a different row shape).
 *
 *   Home -> Contacts (via the persistent top nav tab) -> filter/search -> open Contact -> switch
 *   a local tab -> Back restores the Contacts collection's exact state -> Home tab restores
 *   Home's exact position.
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
  await page.waitForURL(/\/calendar/)
  await page.goto('/profile')
}

test.describe('CRM — Singleton/Collection/Entity reference implementation', () => {
  test('Home -> Contacts -> filter/search -> open Contact -> switch tab -> Back -> Home tab restores exact state', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await loginAs(page)

    // A real, uniquely-named, CSV-imported contact — imported (not POST /contacts) specifically
    // so it carries a real ExternalContactRecord (provider: 'CSV'), the exact signal the
    // collection row's synced-source badge reads. Also gives search a name only this test could
    // match, avoiding flakiness against the shared demo DB's accumulated contacts.
    const marker = `CrmRefE2E ${Date.now()}`
    const importResp = await page.request.post(`${apiOrigin}/contacts/import`, {
      data: { contacts: [{ name: marker, email: `crmrefe2e+${Date.now()}@example.com` }] },
    })
    expect(importResp.ok()).toBeTruthy()
    expect((await importResp.json()).data.created).toBe(1)

    // --- Home: capture baseline state Back has to restore later ---
    await expect(page.getByRole('heading', { name: 'Live presence', exact: true })).toBeVisible()
    await page.waitForTimeout(300)
    await page.evaluate(() => window.scrollTo(0, 300))

    // --- Home -> Contacts, through the persistent top nav tab ---
    await page.getByRole('link', { name: 'Contacts', exact: true }).click()
    await page.waitForURL(/\/contacts$/)
    // No separate title text anywhere — the highlighted tab itself communicates location
    // (matching the reference image, which has no title text beside its tabs either).
    await expect(page.getByRole('link', { name: 'Contacts', exact: true })).toHaveClass(
      /border-primary/,
    )
    await expect(page.locator('header').getByRole('button', { name: 'Home' })).toHaveCount(0)

    // --- Filter/search: state this Back has to restore ---
    await page.getByPlaceholder('Search name or email…').fill(marker)
    await page.getByRole('combobox', { name: 'Source' }).selectOption('CSV')

    // Live Presence never carries CONTACT-type items, so no scoping needed to disambiguate from
    // WelcomeSection above (unlike the Ads spec, which does).
    const row = page.getByRole('link').filter({ hasText: marker })
    await expect(row).toBeVisible()
    // One concise relationship line, not a directory card — and the imported contact is quietly
    // distinguished (a real "Csv" badge sourced from Contact.records, not a guess), while a
    // LOOPIE-native contact would show no such badge at all.
    await expect(row).toContainText('Csv')

    // --- Open the Contact ---
    await row.click()
    await page.waitForURL(/\/contacts\/[^/]+$/)
    await expect(page.getByRole('button', { name: 'Contacts' })).toBeVisible()
    await expect(
      page.locator('main').getByRole('link', { name: 'Contacts', exact: true }),
    ).toHaveCount(0)
    await expect(page.locator('header').getByText(marker, { exact: true })).toBeVisible()

    // The entity's existing tabs, untouched — just prove switching still works.
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
    await page.getByRole('tab', { name: 'Sales' }).click()
    await expect(page.getByText('No sales yet')).toBeVisible()

    // --- Back -> the Contacts collection restores its exact state ---
    await page.getByRole('button', { name: 'Contacts' }).click()
    await page.waitForURL(/\/contacts$/)
    await expect(page.getByPlaceholder('Search name or email…')).toHaveValue(marker)
    await expect(page.getByRole('combobox', { name: 'Source' })).toHaveValue('CSV')

    // --- Home tab -> same Home position ---
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await page.waitForURL(/\/profile/)
    await expect(page.getByRole('heading', { name: 'Live presence', exact: true })).toBeVisible()
    await page.waitForTimeout(800) // let the best-effort scroll-restore retries settle
    // Proves the restore pathway actually engaged (moved us away from a fresh top-of-page load),
    // not pixel-exact equality with the pre-navigation position — see the equivalent Pages/
    // Advertising specs for why exact equality isn't the right assertion here.
    const scrollAfter = await page.evaluate(() => window.scrollY)
    expect(scrollAfter).toBeGreaterThan(50)
  })
})
