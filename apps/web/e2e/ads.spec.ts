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
    const desktopBox = await page.getByTestId('ad-preview').boundingBox()
    await page.getByRole('button', { name: 'Mobile' }).click()
    const mobileBox = await page.getByTestId('ad-preview').boundingBox()
    expect(desktopBox?.height).toBe(mobileBox?.height)
    // The demo business has no Meta connection — the preflight must block the send rather than
    // allow a mysterious pseudo-send, offering to connect Facebook instead of "Send draft".
    await page.getByRole('checkbox', { name: 'Facebook' }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Media order · Facebook' })).toBeVisible()
    await expect(page.getByText('Get Leads · Lead created')).toBeVisible()
    // The authorization sentence, generated live from the in-progress order.
    await expect(page.getByText(/^Spend .* to Get Leads from US on Facebook Feed/)).toBeVisible()
    await expect(page.getByText('Needs attention')).toBeVisible()
    await expect(page.getByText('Facebook is not connected')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Connect Facebook' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Send paused draft/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Back' }).click()
    await page.getByRole('checkbox', { name: 'Facebook' }).uncheck()

    // A Page placement is LOOPIE's own delivery — no platform connection, no money modal — and
    // sends straight from "Put ad on page" on the destination row itself.
    const pageCheckbox = page.locator('input[type=checkbox]').nth(2)
    await pageCheckbox.check()
    await page.getByRole('button', { name: 'Put ad on page' }).click()
    await page.waitForURL(/\/ads\/(?!new$)[^/]+$/)
    await expect(page.getByRole('heading', { name: adName })).toBeVisible()
    await expect(page.getByText('On this page')).toBeVisible()
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
    await expect(page.getByRole('heading', { name: adName, exact: true })).toBeVisible()
  })
})
