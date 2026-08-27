/**
 * End-to-end verification of the acquisition-chain vertical slice:
 * Campaign -> Landing Page -> live preview -> content/theme -> form -> publish
 * -> use as campaign destination.
 *
 * Seed credentials and the "Book a Detail" form come from packages/db/prisma/seed.ts.
 * Run seed before tests: pnpm db:seed
 */
import { test, expect, type Page } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/home/)
}

test.describe('landing page vertical slice', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_EMAIL, DEMO_PASSWORD)
  })

  test('campaign -> landing page -> preview -> content/theme -> form -> publish -> destination', async ({
    page,
  }) => {
    // Same resolution as playwright.config.ts's own apiURL — the app itself talks to this via
    // VITE_API_URL (see apps/web/src/main.tsx), which isn't exposed to the test process directly.
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

    // --- Create a campaign ---
    const campaignName = `E2E Campaign ${Date.now()}`
    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(campaignName)
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)
    await expect(page.getByLabel('Name')).toHaveValue(campaignName)
    const campaignId = page.url().split('/campaigns/')[1]!

    // --- Create a landing page ---
    const lpName = `E2E Landing Page ${Date.now()}`
    await page.goto('/landing-pages/new')
    await page.getByPlaceholder('Spring Detailing Promo').fill(lpName)
    await page.getByRole('button', { name: /create & continue/i }).click()
    await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)

    await expect(page.getByLabel('Headline', { exact: true })).toBeVisible()

    await page.getByLabel('Headline', { exact: true }).fill('E2E Verified Headline')
    await expect(page.getByRole('button', { name: /save draft/i })).toBeEnabled()
    await page.getByRole('button', { name: /save draft/i }).click()
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel('Headline', { exact: true })).toHaveValue('E2E Verified Headline')

    await expect(page.getByLabel('Theme')).toBeVisible()
    await expect(page.getByLabel('Accent')).toHaveCount(0)
    await expect(page.getByLabel('presetId')).toHaveCount(0)
    await expect(page.getByLabel('inkColor')).toHaveCount(0)
    await page.getByLabel('Theme').selectOption({ label: 'Shopfront' })
    await expect(page.getByRole('button', { name: /save draft/i })).toBeEnabled()
    await page.getByRole('button', { name: /save draft/i }).click()
    await expect(page.getByLabel('Theme')).toHaveValue('shopfront')

    await page.getByRole('button', { name: /^publish$/i }).click()
    await expect(page.getByText(/^Live at /)).toBeVisible({ timeout: 10000 })

    // --- Use as campaign destination ---
    await page.getByLabel('Campaign', { exact: true }).selectOption({ label: campaignName })
    await page.getByRole('button', { name: /set as destination/i }).click()
    await expect(page.getByText('Campaign destination updated.')).toBeVisible({ timeout: 10000 })

    // --- Campaign detail resolves the destination back to this landing page ---
    await page.goto(`/campaigns/${campaignId}`)
    await expect(page.getByRole('link', { name: lpName })).toBeVisible()

    // --- The hosted page actually serves the published content ---
    const hostedHref = await page.getByLabel('Destination URL').inputValue()
    expect(hostedHref).toBeTruthy()
    const hostedPath = new URL(hostedHref, apiOrigin).pathname
    const hostedResp = await page.request.get(`${apiOrigin}${hostedPath}`)
    expect(hostedResp.status()).toBe(200)
    expect(await hostedResp.text()).toContain('E2E Verified Headline')
  })
})
