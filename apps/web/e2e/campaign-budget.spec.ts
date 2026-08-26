/**
 * Campaign detail → Budget: fund client wallet, authorize campaign, record platform spend.
 * Uses the ledger, not Campaign.budget minus spend.
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

function usd(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

async function metricDollars(page: Page, label: string) {
  const text = await metric(page, label).innerText()
  const match = text.match(/\$([\d,]+\.\d{2})/)
  return Number(match![1].replace(/,/g, ''))
}

test.describe('campaign budget ledger slice', () => {
  test('fund → authorize → record spend updates derived balances', async ({ page }) => {
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
    await expect(page.getByText('Client wallet', { exact: true })).toBeVisible()
    await expect(page.getByText('This campaign', { exact: true })).toBeVisible()

    const availableBefore = await metricDollars(page, 'Client available balance')

    await page.getByLabel('Amount to deposit').fill('1000')
    await page.getByRole('button', { name: 'Add funds to wallet' }).click()
    await expect(page.getByRole('status')).toContainText('does not authorize this campaign')
    await page.getByRole('button', { name: 'Confirm: add to wallet' }).click()
    await expect(metric(page, 'Client available balance')).toContainText(usd(availableBefore + 1000))

    await page.getByLabel('Amount to allocate').fill('800')
    await page.getByRole('button', { name: 'Authorize campaign funds' }).click()
    await expect(page.getByRole('status')).toContainText('does not add new money')
    await page.getByRole('button', { name: 'Confirm: authorize campaign' }).click()
    await expect(metric(page, 'Authorized funds')).toContainText('$800.00')
    await expect(metric(page, 'Reserved funds')).toContainText('$800.00')
    await expect(metric(page, 'Client available balance')).toContainText(usd(availableBefore + 200))

    await page.getByLabel('Reported spend').fill('125.37')
    await page.getByRole('button', { name: 'Record spend' }).click()
    await expect(metric(page, 'Platform-reported spend')).toContainText('$125.37')
    await expect(metric(page, 'Reserved funds')).toContainText('$674.63')
    await expect(metric(page, 'Client available balance')).toContainText(usd(availableBefore + 200))
    await expect(metric(page, 'Planning budget')).toContainText('$800.00')
  })
})
