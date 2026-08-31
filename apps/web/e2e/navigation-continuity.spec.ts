/**
 * Persistent top nav (docs/strategy/03-product-principles.md's 2026-08-30 revision, reversing the
 * earlier "Inbox is root" model): one header shape everywhere — logo + business name, five peer
 * tabs (Home/Pages/Advertising/Contacts/Messages), Create/notifications/account on the right. A
 * selected tab shows no back affordance of its own (it's a peer root); entity pages get a real
 * "‹ Collection" back segment below the tabs, matching wherever they were actually opened from
 * (location.state), with a universal "‹ Home" fallback everywhere else. Back always matches where
 * clicking it actually goes (no navigate(-1) reliance), and Home restores its own scroll position
 * when returned to.
 */
import { test, expect } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

async function loginAs(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/home/)
}

test('Home shows the five peer tabs and no back segment (it is a root, not something descended into)', async ({
  page,
}) => {
  await loginAs(page)
  await expect(page.locator('aside')).toHaveCount(0)
  await expect(page.locator('header').getByRole('button', { name: 'Home' })).toHaveCount(0)
  for (const label of ['Home', 'Pages', 'Advertising', 'Contacts', 'Messages']) {
    await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveClass(/border-primary/)
})

test('Home -> Contacts -> Contact -> Back -> Back restores Home scroll', async ({ page }) => {
  await loginAs(page)

  await expect(page.getByRole('heading', { name: 'Live presence', exact: true })).toBeVisible()
  await page.waitForTimeout(300) // let Live presence/Results settle before measuring scroll height
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(150)
  const scrollBeforeLeaving = await page.evaluate(() => window.scrollY)

  // Home -> Contacts collection, via the persistent top nav tab (not a launcher).
  await page.getByRole('link', { name: 'Contacts', exact: true }).click()
  await page.waitForURL(/\/contacts$/)
  await expect(page.locator('header').getByRole('button', { name: 'Home' })).toHaveCount(0)

  // Contacts -> a specific Contact entity (excluding the "New Contact" create-action link).
  const firstContactLink = page.locator('a[href^="/contacts/"]:not([href="/contacts/new"])').first()
  const contactName = (await firstContactLink.locator('.font-medium').first().textContent())?.trim()
  await firstContactLink.click()
  await page.waitForURL(/\/contacts\/[^/]+$/)

  // Header sub-row now: "‹ Contacts  {contact name}" — the real parent name, and the entity's own
  // name once it loads (usePageTitle), not a generic "Back" / placeholder.
  const entityBack = page.getByRole('button', { name: 'Contacts' })
  await expect(entityBack).toBeVisible()
  if (contactName) {
    await expect(page.locator('header').getByText(contactName, { exact: true })).toBeVisible()
  }

  // Back once -> Contacts collection (one level, not straight to Home).
  await entityBack.click()
  await page.waitForURL(/\/contacts$/)
  await expect(page.locator('header').getByRole('button', { name: 'Home' })).toHaveCount(0)

  // Home tab -> Home, with scroll restored.
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await page.waitForURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'Live presence', exact: true })).toBeVisible()

  await page.waitForTimeout(800)
  const scrollAfterReturning = await page.evaluate(() => window.scrollY)
  expect(scrollAfterReturning).toBeGreaterThan(scrollBeforeLeaving - 60)
})

test('An entity opened directly from a Home thread shows "Home" as its back label', async ({
  page,
}) => {
  await loginAs(page)

  // Find any Recent Response thread row that links onward to its own thread page.
  const threadRow = page.locator('a[href^="/inbox/"]').first()
  await threadRow.waitFor()
  await threadRow.click()
  await page.waitForURL(/\/inbox\/[^/]+$/)

  const openContact = page.getByRole('link', { name: 'Open contact' })
  test.skip(
    (await openContact.count()) === 0,
    'No contact-linked thread in seeded data for this run',
  )
  await openContact.click()
  await page.waitForURL(/\/contacts\/[^/]+$/)

  // Reached via a Home thread (not the Contacts collection), so the back label says "Home" here,
  // and clicking it goes straight back to Home — not the thread page it was actually one hop from.
  const back = page.getByRole('button', { name: 'Home' })
  await expect(back).toBeVisible()
  await back.click()
  await page.waitForURL(/\/home$/)
})

test('Advertising and Pages show no back segment; Business Profile shows "‹ Home"', async ({
  page,
}) => {
  await loginAs(page)

  await page.goto('/ads')
  await expect(page.locator('header').getByRole('button', { name: 'Home' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Advertising', exact: true })).toHaveClass(
    /border-primary/,
  )

  await page.goto('/landing-pages')
  await expect(page.locator('header').getByRole('button', { name: 'Home' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Pages', exact: true })).toHaveClass(/border-primary/)

  await page.goto('/business')
  await expect(page.getByRole('button', { name: 'Home' })).toBeVisible()
  // Business Profile's header title is dynamic (usePageTitle, the real business name) once
  // loaded — "Business Profile" is only the fallback shown before that resolves, so wait for the
  // real name rather than asserting the transient fallback text.
  await expect(
    page.locator('header').getByText('Riverside Auto Detailing', { exact: true }),
  ).toBeVisible()
})

test('The header account launcher reaches Business Profile and account actions', async ({
  page,
}) => {
  await loginAs(page)
  await page.getByRole('button', { name: 'Menu' }).click()
  // Contacts/Advertising/Pages/Messages are real top nav tabs now — the launcher only carries
  // what isn't a peer tab.
  const menu = page.getByLabel('More')
  await expect(menu.getByRole('link', { name: 'Business Profile', exact: true })).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Profile', exact: true })).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Log out' })).toBeVisible()
})
