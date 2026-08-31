/**
 * WelcomeSection's "Add something" contract (docs/strategy/03-product-principles.md's 2026-08-30
 * persistent-top-nav revision) — the real creation flows CreateMenu.tsx already offers, surfaced
 * inline instead of behind the Create dropdown. Pages creates directly (no intermediate wizard);
 * the persistent top nav tabs are what reach Advertising/Contacts/Messages now, replacing the
 * former Inbox "Running" doorway cards and header launcher entirely for those three.
 */
import { test, expect } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

async function loginAs(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/home/)
}

test('Home shows the shared WelcomeSection: identity, Live presence, Recent response, Results, Add something', async ({
  page,
}) => {
  await loginAs(page)

  await expect(page.getByRole('link', { name: 'View profile' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Live presence', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recent response', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Add something', exact: true })).toBeVisible()

  // Add something offers exactly the real creation flows CreateMenu.tsx does — Page/Ad/Message —
  // no fabricated fourth entry for a "Post" flow that doesn't exist as its own thing yet.
  await expect(page.getByRole('button', { name: 'Create page' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create ad' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
})

test('Add something creates a new page directly, not just a navigation to the collection', async ({
  page,
}) => {
  await loginAs(page)

  await page.getByRole('button', { name: 'Create page' }).click()
  await page.waitForURL(/\/landing-pages\/[^/]+$/, { timeout: 10_000 })
  await expect(page.getByLabel('Theme')).toBeVisible()
})

test('The persistent top nav reaches Advertising, Contacts, and Messages directly — no launcher needed', async ({
  page,
}) => {
  await loginAs(page)

  await page.getByRole('link', { name: 'Advertising', exact: true }).click()
  await page.waitForURL(/\/ads$/)
  await expect(page.getByRole('link', { name: 'Advertising', exact: true })).toHaveClass(
    /border-primary/,
  )

  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await page.waitForURL(/\/contacts$/)
  await expect(page.getByRole('link', { name: 'Contacts', exact: true })).toHaveClass(
    /border-primary/,
  )

  await page.getByRole('link', { name: 'Messages', exact: true }).click()
  await page.waitForURL(/\/messages$/)
  await expect(page.getByRole('link', { name: 'Messages', exact: true })).toHaveClass(
    /border-primary/,
  )
  // A selected tab needs no back affordance — it's a peer root, not something descended into.
  await expect(page.locator('header').getByRole('button', { name: 'Home' })).toHaveCount(0)
})
