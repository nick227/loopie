/**
 * The webinar-signup template's whole reason for being: a real, live "seats filled" number
 * (never fake/seeded, never polled — accurate as of each request) plus an inline email-capture
 * form, both editable in the studio-quality visual editor.
 */
import { test, expect, type Page } from '@playwright/test'

async function registerAndOpenHome(page: Page) {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel(/email/i).fill(`webinar+${unique}@example.com`)
  await page.getByLabel(/^password/i).fill('password123')
  await page.getByLabel(/business name/i).fill(`Webinar Co ${unique}`)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/business\/setup/)
  await page.getByRole('button', { name: /continue to inbox/i }).click()
  await page.waitForURL(/\/home/)
  await page.goto('/landing-pages')
  await page.locator('a[href^="/landing-pages/"]').first().click()
  await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
}

test.describe('webinar signup template', () => {
  test('real seats-filled count starts at zero and increments after a real public submission', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await registerAndOpenHome(page)

    await page
      .getByLabel('Layout')
      .selectOption({ label: 'Scale Your Growth Engine — Free Live Masterclass' })
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    // Real count, not a fake baseline — zero registrations so far. Switching to this template
    // from an existing page never backfills starter content (only page-creation does — see
    // content-preservation.spec.ts), so seats capacity starts unset; set it directly.
    await expect(page.getByText('Seats reserved')).toBeVisible()
    await page.getByLabel('Seats total').dblclick()
    await page.getByLabel('Seats total').fill('500')
    await page.keyboard.press('Enter')
    await expect(page.getByText('0 / 500', { exact: true })).toBeVisible()

    // Countdown widget is live — verify it actually renders real digits, not just placeholder text.
    await expect(page.getByText(/^\d{2}$/).first()).toBeVisible()

    // Give the event a real date so the countdown/date line has something to show.
    await page.getByLabel('Event date and time').click()
    await page.getByLabel('Event date and time').fill('2027-01-15T17:00')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    const published = page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/publish') && res.ok(),
    )
    await page.getByRole('button', { name: /^publish$/i }).click()
    await published

    const hostedHref = await page.locator('a[href*="/p/"]').first().getAttribute('href')
    expect(hostedHref).toBeTruthy()

    // Visit the real hosted page as a fresh, anonymous browser context — the actual public
    // experience, not an authenticated API call.
    const visitor = await page.context().browser()!.newContext()
    const publicPage = await visitor.newPage()
    await publicPage.goto(hostedHref!)
    await expect(publicPage.getByText('0 / 500 seats reserved', { exact: false })).toBeVisible()
    await expect(publicPage.getByText(/^\d{2}$/).first()).toBeVisible()

    await publicPage.getByLabel('Name').fill('Ada Visitor')
    await publicPage.getByLabel('Email').fill('ada@example.com')
    // The button's label is the reusable Form's own submitLabel (e.g. "Get in touch") — not the
    // widget card's static "Reserve your seat" heading — so target the real submit button itself.
    await publicPage.locator('form button[type="submit"]').click()
    await expect(publicPage.getByText(/thanks/i)).toBeVisible({ timeout: 10000 })

    // No polling — the number is only accurate as of the next request, which is exactly what
    // this asserts: a fresh page load reflects the real, updated count.
    await publicPage.reload()
    await expect(publicPage.getByText('1 / 500 seats reserved', { exact: false })).toBeVisible()
    await visitor.close()
  })
})
