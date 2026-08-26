import { test, expect, type Page } from '@playwright/test'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
}

test.describe('affiliate portal', () => {
  test('admin sees Affiliates; affiliate sees deal rates not Campaigns', async ({ page }) => {
    await loginAs(page, 'demo@loopie.app', 'password123')
    await page.waitForURL(/\/home/)
    await expect(page.getByRole('link', { name: 'Affiliates' })).toBeVisible()
    await page.getByRole('link', { name: 'Affiliates' }).click()
    await page.waitForURL(/\/affiliates/)
    await expect(page.getByText('Jordan Referrer')).toBeVisible()

    const classes = await (await page.request.get(`${API}/affiliate-classes`)).json()
    const classId = classes.data[0].id
    const dealRes = await page.request.post(`${API}/affiliate-deals`, {
      data: { name: `E2E ${Date.now()}`, classId, affiliateRateBps: 1000, managerShareBps: 0 },
    })
    expect(dealRes.status()).toBe(201)

    await page.getByRole('button', { name: /log out/i }).click()
    await loginAs(page, 'affiliate@loopie.app', 'password123')
    await page.waitForURL(/\/portal/)
    await expect(page.getByText(/your deal/i)).toBeVisible()
    await expect(page.getByText(/10%/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Campaigns' })).toHaveCount(0)
  })
})
