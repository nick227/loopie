/**
 * Campaign Budget: spend plan / limit / reported / settled.
 * Client wallet deposit is hidden in Phase 1 (non-custodial). Spend limit does not require LOOPIE-held funds.
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

function metric(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator('..')
}

test.describe('campaign budget ledger slice', () => {
  test('spend limit then reported spend without a client wallet deposit', async ({ page }) => {
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await loginAs(page)

    const creatives = await (await page.request.get(`${apiOrigin}/creatives`)).json()
    const creativeId = creatives.data[0].id

    const campaignName = `Budget Campaign ${Date.now()}`
    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(campaignName)
    await page.locator('#field-budget').fill('800')
    await page.locator('#field-startDate').fill(new Date().toISOString())
    await page.locator('#field-platforms').fill('META')
    await page.locator('#field-creativeIds').fill(creativeId)
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)

    await page.getByRole('link', { name: 'Budget' }).click()
    await page.waitForURL(/\/budget$/)
    await expect(page.getByText('Client wallet', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Spend Limit', { exact: true }).first()).toBeVisible()
    await expect(metric(page, 'Spend Plan')).toContainText('$800.00')

    await page.getByLabel('Spend limit').fill('800')
    await page.getByRole('button', { name: 'Set spend limit' }).click()
    await page.getByRole('button', { name: 'Confirm: set spend limit' }).click()
    await expect(metric(page, 'Spend Limit')).toContainText('$800.00')

    await page.getByLabel('Reported spend').fill('125.37')
    await page.getByRole('button', { name: 'Record spend' }).click()
    await expect(metric(page, 'Reported')).toContainText('$125.37')
  })
})
