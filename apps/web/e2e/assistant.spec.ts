/**
 * Next Steps Assistant — verifies the V1 happy path (business info -> logo -> homepage ->
 * publish) end to end against a fresh account, entered through the Loopie Assistant icon in the
 * Shell header and driven entirely through the assistant modal. Each step calls a real existing
 * operation (updateBusiness, createLandingPage, publishLandingPage) — this proves the whole
 * chain, not just the resolver.
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
    // launcher) ever mounts — only the business name is required, so we can pass straight
    // through and let the assistant handle industry/location instead.
    await page.getByRole('button', { name: /continue to calendar/i }).click()
    await page.waitForURL(/\/calendar/)

    const assistantButton = page.getByRole('button', { name: /loopie assistant/i })
    await expect(assistantButton).toBeVisible({ timeout: 15000 })

    // --- Modal opens/closes correctly, Escape closes it ---
    await assistantButton.click()
    const dialog = page.getByTestId('assistant-modal')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Loopie Assistant' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // --- Assistant Home: state-aware greeting + the next real action, not "Step 1 of 4" ---
    await assistantButton.click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/what are we working on/i)).toBeVisible()
    await expect(dialog.getByText('Finish your business profile')).toBeVisible()

    // --- Step 1: business info (conversational framing, not a form wizard) ---
    await dialog.getByText('Finish your business profile').click()
    await expect(dialog.getByText("Let's get your business looking official.")).toBeVisible()
    await dialog.getByLabel('Industry').fill('Landscaping')
    await dialog.getByLabel('Location').fill('Austin, TX')
    await dialog.getByRole('button', { name: /continue/i }).click()
    await expect(dialog.getByText('Business details saved')).toBeVisible()

    // --- Step 2: logo (auto-advances after the brief confirmation) ---
    await expect(dialog.getByText('Do you have a logo you’d like to use?')).toBeVisible({
      timeout: 10000,
    })
    await dialog.locator('a').first().click()
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveCount(1, { timeout: 10000 })
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-photo.png'))
    await expect(page.getByRole('button', { name: 'Use selected' })).toBeEnabled({ timeout: 15000 })
    await page.getByRole('button', { name: 'Use selected' }).click()
    await expect(dialog.getByText('Logo added')).toBeVisible()

    // --- Step 3: create homepage ---
    await expect(
      dialog.getByText("Let's build your homepage from a template you can edit anytime."),
    ).toBeVisible({ timeout: 10000 })
    await dialog.getByRole('button', { name: /create homepage/i }).click()
    await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
    await expect(dialog.getByText('Homepage created')).toBeVisible({ timeout: 15000 })

    // --- Step 4: publish — a "meaningful completion", so it waits for the user, offering
    // real actions rather than auto-advancing away ---
    await expect(dialog.getByText('Your homepage is ready to go live.')).toBeVisible({
      timeout: 10000,
    })
    await dialog.getByRole('button', { name: /publish homepage/i }).click()
    await expect(dialog.getByText('Your homepage is live')).toBeVisible({ timeout: 15000 })
    await expect(dialog.getByRole('link', { name: 'View homepage' })).toBeVisible({
      timeout: 15000,
    })
    await dialog.getByRole('button', { name: /what's next/i }).click()

    // --- Back at Assistant Home: completion is derived live, no fake state ---
    await expect(dialog.getByText('Nice work — your homepage is live.')).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'View homepage' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Recompute is live, not cached: reloading and reopening still shows the completed state.
    await page.reload()
    await expect(assistantButton).toBeVisible({ timeout: 15000 })
    await assistantButton.click()
    await expect(dialog.getByText('Nice work — your homepage is live.')).toBeVisible({
      timeout: 15000,
    })
  })
})
