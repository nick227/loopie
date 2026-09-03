/**
 * Campaign detail: attach a library ad, activate a first-party unit.
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
}

test.describe('campaign ads', () => {
  test('attach a library ad and activate a LOOPIE placement', async ({ page }) => {
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await loginAs(page)

    const creatives = await (await page.request.get(`${apiOrigin}/creatives`)).json()
    const creativeName = creatives.data[0].name as string

    const campaignName = `Running Campaign ${Date.now()}`
    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(campaignName)
    await page.getByRole('checkbox', { name: 'LOOPIE' }).check()
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)

    const patched = page.waitForResponse(
      (response) =>
        response.url().includes('/campaigns/') && response.request().method() === 'PATCH',
    )
    await page.getByLabel('Attach an ad').selectOption({ label: creativeName })
    await patched

    await expect(page.getByRole('link', { name: creativeName })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Draft' })).toBeVisible()
    await expect(page.getByRole('row', { name: new RegExp(creativeName) })).toHaveCount(1)

    await page.getByRole('button', { name: 'Activate' }).click()
    await expect(page.getByRole('cell', { name: 'Active' })).toBeVisible()
  })

  test('Meta-only attach shows one row and no Activate', async ({ page }) => {
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await loginAs(page)

    const creatives = await (await page.request.get(`${apiOrigin}/creatives`)).json()
    const creativeName = creatives.data[0].name as string

    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(`Meta Campaign ${Date.now()}`)
    await page.getByRole('checkbox', { name: 'Meta' }).check()
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)

    const patched = page.waitForResponse(
      (response) =>
        response.url().includes('/campaigns/') && response.request().method() === 'PATCH',
    )
    await page.getByLabel('Attach an ad').selectOption({ label: creativeName })
    await patched

    await expect(page.getByRole('link', { name: creativeName })).toBeVisible()
    await expect(page.getByRole('row', { name: new RegExp(creativeName) })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Activate' })).toHaveCount(0)
  })
})
