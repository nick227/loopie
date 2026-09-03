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
  await page.waitForURL(/\/calendar/)
}

function metric(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator('..')
}

test.describe('campaign budget ledger slice', () => {
  test('spend limit then reported spend without a client wallet deposit', async ({ page }) => {
    await loginAs(page)

    const campaignName = `Budget Campaign ${Date.now()}`
    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(campaignName)
    await page.getByRole('radio', { name: '$500' }).check()
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)

    await expect(page.getByLabel('Name')).toHaveValue(campaignName)
    await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0)
    await expect(page.getByText('Client wallet', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Spend Limit', { exact: true }).first()).toBeVisible()
    await expect(metric(page, 'Spend Plan')).toContainText('$500.00')

    await page.getByLabel('Spend limit').fill('800')
    await page.getByRole('button', { name: 'Set spend limit' }).click()
    await page.getByRole('button', { name: 'Confirm: set spend limit' }).click()
    await expect(metric(page, 'Spend Limit')).toContainText('$800.00')

    await page.getByLabel('Reported spend').fill('125.37')
    await page.getByRole('button', { name: 'Record spend' }).click()
    await expect(metric(page, 'Reported')).toContainText('$125.37')
  })

  test('edits name, budget, platforms, and destination on the campaign page', async ({ page }) => {
    await loginAs(page)

    const campaignName = `Inline Campaign ${Date.now()}`
    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(campaignName)
    await page.getByRole('checkbox', { name: 'Meta' }).check()
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)
    const campaignId = page.url().split('/campaigns/')[1]!

    const renamed = `Renamed ${Date.now()}`
    await expect(page.getByLabel('Name')).toHaveValue(campaignName)
    await page.getByLabel('Name').click()
    await page.getByLabel('Name').press('Control+A')
    await page.keyboard.type(renamed)
    await expect(page.getByLabel('Name')).toHaveValue(renamed)
    const nameSaved = page.waitForResponse(
      (res) => res.url().includes(`/campaigns/${campaignId}`) && res.request().method() === 'PATCH',
    )
    await page.keyboard.press('Tab')
    await nameSaved
    await page.getByLabel('End date').fill('2026-12-31')
    await page.getByLabel('End date').blur()
    await page.getByLabel('Budget').fill('750')
    await page.getByLabel('Budget').blur()
    await page.getByRole('checkbox', { name: 'Google' }).check()
    await page.getByLabel('Destination URL').fill('https://example.com/offer')
    await page.getByLabel('Destination URL').blur()

    await expect(page.getByLabel('Name')).toHaveValue(renamed)
    await expect(metric(page, 'Spend Plan')).toContainText('$750.00')
    await expect(page.getByRole('checkbox', { name: 'Google' })).toBeChecked()

    await page.goto(`/campaigns/${campaignId}/edit`)
    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}$`))
    await expect(page.getByLabel('Name')).toHaveValue(renamed)
    await expect(page.getByLabel('Destination URL')).toHaveValue('https://example.com/offer')
  })
})
