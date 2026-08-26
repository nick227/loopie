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
  test('create an ad with media and attach it to a campaign', async ({ page }) => {
    await loginAs(page)

    const adName = `Library Ad ${Date.now()}`
    await page.goto('/ads/new')
    await page.getByPlaceholder('Ad name').fill(adName)
    await page.getByRole('button', { name: 'Choose media' }).click()
    await page.getByPlaceholder('Name', { exact: true }).fill(`Media ${Date.now()}`)
    await page.getByPlaceholder('URL').fill('https://example.com/ad.jpg')
    const added = page.waitForResponse(
      (response) => response.url().includes('/assets') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Add media' }).click()
    await added
    await page.getByRole('button', { name: 'Use selected' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/\/ads\/(?!new$)[^/]+$/)
    await expect(page.getByRole('heading', { name: adName })).toBeVisible()

    await page.goto('/ads')
    await expect(page.getByRole('link', { name: adName })).toBeVisible()

    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(`Attach ${Date.now()}`)
    await page.getByRole('checkbox', { name: 'LOOPIE' }).check()
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)

    const patched = page.waitForResponse(
      (response) =>
        response.url().includes('/campaigns/') && response.request().method() === 'PATCH',
    )
    await page.getByLabel('Attach an ad').selectOption({ label: adName })
    await patched
    await expect(page.getByRole('link', { name: adName })).toBeVisible()
    await expect(page.getByRole('row', { name: new RegExp(adName) })).toHaveCount(1)
  })
})
