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

test.describe('ads library', () => {
  test('create an ad with media and post it', async ({ page }) => {
    await loginAs(page)

    const adName = `Library Ad ${Date.now()}`
    await page.goto('/ads/new')
    await page.getByPlaceholder('Ad name').fill(adName)
    await page.getByRole('button', { name: 'Choose media' }).click()
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const added = page.waitForResponse(
      (response) => response.url().includes('/assets') && response.request().method() === 'POST',
    )
    await page
      .getByRole('dialog')
      .locator('input[type=file]')
      .setInputFiles({
        name: `ad-${Date.now()}.png`,
        mimeType: 'image/png',
        buffer: png,
      })
    await added
    await expect(page.getByRole('button', { name: 'Use selected' })).toBeEnabled()
    await page.getByRole('button', { name: 'Use selected' }).click()
    await expect(page.getByRole('button', { name: 'Choose media' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Desktop' })).toBeVisible()
    await page.getByRole('button', { name: 'Mobile' }).click()
    await page.getByRole('checkbox', { name: 'Meta Feed' }).check()
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await page.waitForURL(/\/ads\/(?!new$)[^/]+$/)
    await expect(page.getByRole('heading', { name: adName })).toBeVisible()
    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByRole('button', { name: 'Choose media' })).toBeVisible()
    await page.getByRole('button', { name: 'Choose media' }).click()
    const readded = page.waitForResponse(
      (response) => response.url().includes('/assets') && response.request().method() === 'POST',
    )
    await page
      .getByRole('dialog')
      .locator('input[type=file]')
      .setInputFiles({
        name: `ad-again-${Date.now()}.png`,
        mimeType: 'image/png',
        buffer: png,
      })
    await readded
    await page.getByRole('button', { name: 'Use selected' }).click()
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choose media' })).toHaveCount(0)

    await page.goto('/ads')
    await expect(page.getByRole('link', { name: adName })).toBeVisible()
  })
})
