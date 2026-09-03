/**
 * Next Steps Assistant — verifies the V1 happy path (business info -> logo -> homepage ->
 * publish) end to end against a fresh account, driven entirely through the assistant panel
 * mounted in Shell.tsx. Each step calls a real existing operation (updateBusiness,
 * createLandingPage, publishLandingPage) — this proves the whole chain, not just the resolver.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('next steps assistant', () => {
  test('walks a fresh business through business info -> logo -> homepage -> publish', async ({
    page,
  }) => {
    test.setTimeout(90_000)

    // --- Register a fresh account (only businessName is set — everything else is empty) ---
    const unique = Date.now()
    await page.goto('/register')
    await page.getByLabel(/email/i).fill(`assistant-e2e+${unique}@example.com`)
    await page.getByLabel(/^password/i).fill('password123')
    await page.getByLabel(/business name/i).fill(`Assistant E2E ${unique}`)
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).not.toHaveURL(/\/register/)

    // First-run onboarding gate (BusinessSetupPage) runs before Shell (and so the assistant
    // panel) ever mounts — only the business name is required, so we can pass straight through
    // and let the assistant handle industry/location instead.
    await page.getByRole('button', { name: /continue to calendar/i }).click()
    await page.waitForURL(/\/calendar/)

    const panel = page.getByTestId('assistant-panel')

    // --- Step 1: business info ---
    await expect(panel).toBeVisible({ timeout: 15000 })
    await expect(panel.getByText('Step 1 of 4')).toBeVisible()
    await expect(panel.getByText("Let's set up your business info")).toBeVisible()
    await panel.getByLabel('Industry').fill('Landscaping')
    await panel.getByLabel('Location').fill('Austin, TX')
    await panel.getByRole('button', { name: /continue/i }).click()

    // --- Step 2: logo ---
    await expect(panel.getByText('Step 2 of 4')).toBeVisible({ timeout: 10000 })
    await expect(panel.getByText('Add your logo')).toBeVisible()
    // BusinessLogoField renders a single <a> wrapping the Avatar; clicking it opens MediaPicker.
    await panel.locator('a').first().click()
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveCount(1, { timeout: 10000 })
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-photo.png'))
    await expect(page.getByRole('button', { name: 'Use selected' })).toBeEnabled({ timeout: 15000 })
    await page.getByRole('button', { name: 'Use selected' }).click()

    // --- Step 3: create homepage ---
    await expect(panel.getByText('Step 3 of 4')).toBeVisible({ timeout: 10000 })
    await expect(panel.getByText('Create your homepage')).toBeVisible()
    await panel.getByRole('button', { name: /create homepage/i }).click()
    await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)

    // --- Step 4: publish ---
    await expect(panel.getByText('Step 4 of 4')).toBeVisible({ timeout: 15000 })
    await expect(panel.getByText('Publish your homepage')).toBeVisible()
    await panel.getByRole('button', { name: /publish homepage/i }).click()

    // --- Done ---
    await expect(panel.getByText("You're all set")).toBeVisible({ timeout: 15000 })

    // Recompute is live, not cached: a fresh load still shows the completed state.
    await page.reload()
    await expect(page.getByTestId('assistant-panel').getByText("You're all set")).toBeVisible({
      timeout: 15000,
    })
  })
})
