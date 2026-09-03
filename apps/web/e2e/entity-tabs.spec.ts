/**
 * Entity-local sections (docs/strategy/03-product-principles.md's Singleton/Collection/Entity
 * grammar) — Contact and Page detail now split into tabs (plain local state, no new routes).
 */
import { test, expect } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

async function loginAs(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/calendar/)
}

test('Contact detail shows Overview/Activity/Messages/Sales tabs', async ({ page }) => {
  await loginAs(page)
  await page.goto('/contacts')
  const firstContactLink = page.locator('a[href^="/contacts/"]:not([href="/contacts/new"])').first()
  await firstContactLink.waitFor()
  await firstContactLink.click()
  await page.waitForURL(/\/contacts\/[^/]+$/)

  // Overview is the default tab — identity content visible.
  await expect(page.getByText('Display identity')).toBeVisible()

  await page.getByRole('tab', { name: 'Activity' }).click()
  await expect(page.getByText('Display identity')).not.toBeVisible()

  await page.getByRole('tab', { name: 'Messages' }).click()
  await page.getByRole('tab', { name: 'Sales' }).click()
  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(page.getByText('Display identity')).toBeVisible()
})

test('Page detail shows Editor/Activity tabs with real performance data', async ({ page }) => {
  await loginAs(page)
  await page.goto('/landing-pages')
  const firstPageLink = page
    .locator('a[href^="/landing-pages/"]:not([href="/landing-pages/new"])')
    .first()
  await firstPageLink.waitFor()
  await firstPageLink.click()
  await page.waitForURL(/\/landing-pages\/[^/]+$/)

  // Editor is the default tab.
  await expect(page.getByLabel('Theme')).toBeVisible()

  await page.getByRole('tab', { name: 'Activity' }).click()
  await expect(page.getByLabel('Theme')).not.toBeVisible()
  await expect(page.getByText('Views')).toBeVisible()
  await expect(page.getByText('Submissions')).toBeVisible()
  await expect(page.getByText('Revenue')).toBeVisible()

  await page.getByRole('tab', { name: 'Editor' }).click()
  await expect(page.getByLabel('Theme')).toBeVisible()
})
