/**
 * Campaign detail: ads (creative + serve), activate a first-party unit.
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

test.describe('campaign ads', () => {
  test('create and activate an ad with a library creative', async ({ page }) => {
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await loginAs(page)

    const creatives = await (await page.request.get(`${apiOrigin}/creatives`)).json()
    const creativeName = creatives.data[0].name as string

    const campaignName = `Running Campaign ${Date.now()}`
    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(campaignName)
    await page.getByRole('checkbox', { name: 'Meta' }).check()
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)

    await page.getByRole('link', { name: 'New ad' }).click()
    await page.waitForURL(/\/ad-units\/new$/)
    await page.getByLabel('Creative').selectOption({ label: creativeName })
    await page.getByRole('button', { name: 'Create ad' }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)
    await expect(page.getByText(creativeName).first()).toBeVisible()
    await expect(page.getByText(/Display banner/)).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Draft' })).toBeVisible()

    await page.getByRole('button', { name: 'Activate' }).click()
    await expect(page.getByRole('cell', { name: 'Active' })).toBeVisible()
  })
})
