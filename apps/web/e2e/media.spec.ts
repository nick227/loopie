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

test.describe('media library', () => {
  test('upload from URL, show specs, and pick it on an ad', async ({ page }) => {
    await loginAs(page)

    const name = `Portrait ${Date.now()}`
    await page.goto('/media')
    await page.getByRole('button', { name: 'Upload' }).click()
    await page.getByPlaceholder('Name', { exact: true }).fill(name)
    await page.getByPlaceholder('URL').fill('https://picsum.photos/id/1015/1080/1350')
    const created = page.waitForResponse(
      (response) => response.url().includes('/assets') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Add media' }).click()
    await created
    await expect(page.getByRole('link', { name })).toBeVisible()
    await expect(page.getByRole('link', { name })).toContainText('4:5 Feed')

    await page.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByText('1080×1350')).toBeVisible()
    await expect(page.getByText('0 ads')).toBeVisible()

    await page.goto('/ads/new')
    await page.getByPlaceholder('Ad name').fill(`Ad ${name}`)
    await page.getByRole('button', { name: 'Choose media' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: /insert media/i })).toBeVisible()
    await expect(page.getByPlaceholder('Search media')).toBeVisible()
    const box = await dialog.boundingBox()
    const viewport = page.viewportSize()
    expect(box?.y ?? 1).toBeLessThan(8)
    expect(box?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.85)
    await page.getByPlaceholder('Search media').fill(name)
    await expect(page.getByRole('button', { name })).toBeVisible()
    await page.getByRole('button', { name }).click()
    await page.getByRole('button', { name: 'Use selected' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL(/\/ads\/(?!new$)[^/]+$/)

    await page.goto('/media')
    await page.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.locator('section').filter({ hasText: 'Used in' })).toContainText('1 ad')
  })
})
