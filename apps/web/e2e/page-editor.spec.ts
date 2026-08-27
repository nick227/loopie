/**
 * Isolated page editor: canvas edits, inline form fields, layout switch, publish.
 * Does not visit /forms/new.
 */
import { test, expect, type Page } from '@playwright/test'

async function registerAndOpenHome(page: Page) {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel(/email/i).fill(`editor+${unique}@example.com`)
  await page.getByLabel(/^password/i).fill('password123')
  await page.getByLabel(/business name/i).fill(`Canvas Co ${unique}`)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/home/)
  await page.goto('/landing-pages')
  await page.getByRole('link', { name: 'Configure' }).click()
  await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
}

test.describe('page editor canvas', () => {
  test('edit headline, add phone, switch layout, publish — never visit /forms/new', async ({
    page,
  }) => {
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await registerAndOpenHome(page)

    await expect(page).not.toHaveURL(/\/forms/)
    await expect(page.getByLabel('Headline', { exact: true })).toBeVisible()
    await page.getByLabel('Headline', { exact: true }).fill('Canvas Verified Headline')
    await expect(page.getByLabel('Headline', { exact: true })).toHaveValue(
      'Canvas Verified Headline',
    )

    const fieldCount = await page.getByLabel('Label', { exact: true }).count()
    await page.getByRole('button', { name: /add field/i }).click()
    await expect(page.getByLabel('Label', { exact: true })).toHaveCount(fieldCount + 1)
    await page.getByLabel('Label', { exact: true }).nth(fieldCount).fill('Phone')
    await page.getByLabel('Type', { exact: true }).nth(fieldCount).selectOption('PHONE')

    await page.getByLabel('Layout').selectOption({ label: 'Simple Lead Gen' })
    await expect(page.getByRole('button', { name: /save draft/i })).toBeEnabled()
    await page.getByRole('button', { name: /save draft/i }).click()
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /^publish$/i }).click()
    await expect(page.getByText(/^Live at /)).toBeVisible({ timeout: 10000 })

    const hostedHref = await page.locator('a[href*="/p/"]').first().getAttribute('href')
    expect(hostedHref).toBeTruthy()
    const hostedPath = new URL(hostedHref!, apiOrigin).pathname
    const hostedResp = await page.request.get(`${apiOrigin}${hostedPath}`)
    expect(hostedResp.status()).toBe(200)
    const html = await hostedResp.text()
    expect(html).toContain('Canvas Verified Headline')
    expect(html).toContain('name="phone"')
    expect(page.url()).not.toContain('/forms/new')
  })
})
