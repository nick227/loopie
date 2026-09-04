/**
 * The Studio template's job: a distinct, bold editorial design language for creative/marketing
 * studios — reusing the canonical content model end to end (no new backend fields), inline
 * editable, and with a real inquiry form.
 */
import { test, expect, type Page } from '@playwright/test'

async function registerAndOpenHome(page: Page) {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel(/email/i).fill(`studio+${unique}@example.com`)
  await page.getByLabel(/^password/i).fill('password123')
  await page.getByLabel(/business name/i).fill(`Studio Co ${unique}`)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/business\/setup/)
  await page.getByRole('button', { name: /continue to inbox/i }).click()
  await page.waitForURL(/\/calendar/)
  await page.goto('/landing-pages')
  await page.locator('a[href^="/landing-pages/"]').first().click()
  await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
}

test.describe('studio template', () => {
  test('renders, is inline-editable, and publishes with a real working contact form', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await registerAndOpenHome(page)

    await page.getByLabel('Layout').selectOption({ label: 'Creative studio' })
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    // Inline-editable, same double-click model as every other template.
    const headline = page.getByLabel('Hero headline')
    await expect(headline).toBeVisible()
    await headline.dblclick()
    await headline.fill('Studio template renders correctly')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Studio template renders correctly')).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    const published = page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/publish') && res.ok(),
    )
    await page.getByRole('button', { name: /^publish$/i }).click()
    await published

    const hostedHref = await page.locator('a[href*="/p/"]').first().getAttribute('href')
    expect(hostedHref).toBeTruthy()

    const visitor = await page.context().browser()!.newContext()
    const publicPage = await visitor.newPage()
    await publicPage.goto(hostedHref!)
    await expect(publicPage.getByText('Studio template renders correctly')).toBeVisible()

    await publicPage.getByLabel('Name').fill('Jordan Client')
    await publicPage.getByLabel('Email').fill('jordan@example.com')
    await publicPage.locator('form button[type="submit"]').click()
    await expect(publicPage.getByText(/thanks/i)).toBeVisible({ timeout: 10000 })
    await visitor.close()
  })
})
