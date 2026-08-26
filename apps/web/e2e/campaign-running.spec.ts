/**
 * Campaign detail → Creatives + Ad Units: attach/create a creative, then run a first-party unit.
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

async function createCampaign(page: Page, name: string) {
  const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
  const creatives = await (await page.request.get(`${apiOrigin}/creatives`)).json()
  const creativeName = creatives.data[0].name as string

  await page.goto('/campaigns/new')
  await page.locator('#field-name').fill(name)
  await page.getByRole('checkbox', { name: 'Meta' }).check()
  await page.getByRole('button', { name: /create campaign/i }).click()
  await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)
  return creativeName
}

test.describe('campaign creatives and ad units', () => {
  test('create creative, attach, then create and activate an ad unit', async ({ page }) => {
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await loginAs(page)

    const campaignName = `Running Campaign ${Date.now()}`
    const seedCreativeName = await createCampaign(page, campaignName)

    await page.getByRole('link', { name: 'Creatives', exact: true }).click()
    await page.waitForURL(/\/creatives$/)
    await page.locator('#attach-creative').selectOption({ label: seedCreativeName })
    await page.getByRole('button', { name: 'Attach to campaign' }).click()
    await expect(page.getByText(seedCreativeName).first()).toBeVisible()

    const assets = await (await page.request.get(`${apiOrigin}/assets`)).json()
    const assetName = assets.data[0].name as string
    const creativeName = `E2E Creative ${Date.now()}`

    await page.getByRole('link', { name: 'New creative' }).click()
    await page.waitForURL(/\/creatives\/new$/)
    await page.getByLabel('Name').fill(creativeName)
    await page.getByLabel(assetName).check()
    await page.getByRole('button', { name: 'Create and attach' }).click()
    await page.waitForURL(/\/creatives$/)
    await expect(page.getByText(creativeName)).toBeVisible()

    await page.getByRole('link', { name: 'Ad Units', exact: true }).click()
    await page.waitForURL(/\/ad-units$/)
    await expect(page.getByText('No ad units yet')).toBeVisible()

    await page.getByRole('link', { name: 'New ad unit' }).click()
    await page.waitForURL(/\/ad-units\/new$/)
    await page.getByLabel('Creative').selectOption({ label: creativeName })
    await page.getByRole('button', { name: 'Create ad unit' }).click()
    await page.waitForURL(/\/ad-units$/)
    await expect(page.getByText(`Display banner · ${creativeName}`)).toBeVisible()
    await expect(page.getByText(/Draft/)).toBeVisible()

    await page.getByRole('button', { name: 'Activate' }).click()
    await expect(page.getByText(/Active/)).toBeVisible()
  })
})
