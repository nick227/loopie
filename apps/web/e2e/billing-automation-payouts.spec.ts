import { test, expect, type Page } from '@playwright/test'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3021'

async function loginAs(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('demo@loopie.app')
  await page.getByLabel(/password/i).fill('password123')
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/home/)
}

test.describe('billing, automations, payout queue', () => {
  test('billing shows plan, plain status, checkout return, and not-configured copy', async ({
    page,
  }) => {
    await loginAs(page)
    await page.goto('/billing')
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible()
    await expect(page.getByText('LOOPIE', { exact: true })).toBeVisible()
    await expect(page.getByText('Not subscribed')).toBeVisible()
    await expect(page.getByText(/isn't connected yet/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Subscribe' })).toHaveCount(0)

    await page.goto('/billing?checkout=success')
    await expect(page.getByText(/Payment submitted/)).toBeVisible()
    await page.goto('/billing?checkout=cancel')
    await expect(page.getByText(/Nothing was charged/)).toBeVisible()
  })

  test('automation detail and logs are readable', async ({ page }) => {
    await loginAs(page)
    const name = `E2E follow-up ${Date.now()}`
    const created = await page.request.post(`${API}/automations`, {
      data: { name, trigger: 'LEAD_CREATED', waitDays: 2, action: 'SEND_EMAIL' },
    })
    expect(created.status()).toBe(201)
    const automationId = (await created.json()).data.id as string

    await page.goto(`/automations/${automationId}`)
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByText('Active')).toBeVisible()
    await expect(page.getByText(/when lead created, wait 2 days, then send email/i)).toBeVisible()
    await expect(page.getByText(/Last run never/)).toBeVisible()
    await expect(page.getByText('No runs yet.')).toBeVisible()

    await page.goto('/automations')
    await expect(page.getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible()

    const listed = await page.request.get(`${API}/automations?limit=50`)
    expect(listed.status()).toBe(200)
    const withLogs = (await listed.json()).data.find(
      (row: { name: string }) => row.name === 'Follow up new leads',
    )
    expect(withLogs).toBeTruthy()
    await page.goto(`/automations/${withLogs.id}`)
    await expect(page.getByRole('heading', { name: 'Follow up new leads' })).toBeVisible()
    await expect(page.getByText('Executed')).toBeVisible()
    await expect(page.getByText('Skipped')).toBeVisible()
    await expect(page.getByText('Failed')).toBeVisible()
    await expect(page.getByText('Contact opted out of email')).toBeVisible()
    await expect(page.getByText('Provider rejected the send')).toBeVisible()

    await page.getByRole('link', { name: 'View all' }).click()
    await expect(page.getByRole('heading', { name: 'Logs' })).toBeVisible()
    await expect(page.getByText('Executed')).toBeVisible()
    await expect(page.getByText('Contact opted out of email')).toBeVisible()
  })

  test('payout queue shows Sending, Transferred, and Payable', async ({ page }) => {
    await loginAs(page)
    await page.goto('/affiliates/payouts')
    await expect(page.getByRole('heading', { name: 'Payouts' })).toBeVisible()
    await expect(page.getByText('Sending').first()).toBeVisible()
    await expect(page.getByText('Transferred').first()).toBeVisible()
    await expect(page.getByText('Payable').first()).toBeVisible()
    await expect(page.getByText(/not yet received at the bank/i)).toBeVisible()
    await expect(page.getByText(/waiting for Stripe to confirm the transfer/i)).toBeVisible()
    const pay = page.getByRole('button', { name: /Pay \$18\.00/ })
    await expect(pay).toBeVisible()
    await expect(pay).toBeDisabled()
  })
})
