/**
 * Golden-path smoke test. Verifies the core auth loop and the main
 * landing page load. Adapt the selectors and URLs to match the project.
 *
 * Seed credentials come from packages/db/prisma/seed.ts.
 * Run seed before tests: pnpm db:seed
 */
import { test, expect } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

test.describe('auth flow', () => {
  test('login → protected page → logout', async ({ page }) => {
    await page.goto('/')

    // Should land on login when unauthenticated
    await expect(page).toHaveURL(/\/login/)

    // Log in
    await page.getByLabel(/email/i).fill(DEMO_EMAIL)
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
    await page.getByRole('button', { name: /log in|sign in/i }).click()

    // Should redirect to Home (docs/strategy/03-product-principles.md's 2026-08-30 nav revision —
    // a persistent top nav with Home as the first tab, not a standalone Inbox root)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page).toHaveURL(/\/home/)

    // Log out (Shell.tsx's persistent header — no sidebar; Log out lives in the account launcher)
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: /log out|sign out/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('register a new account', async ({ page }) => {
    await page.goto('/register')

    // RegisterPage.tsx fields: email, password, businessName (LOOPIE has one Business per
    // account, not a public username — see CLAUDE.md "RegisterInput uses businessName").
    const unique = Date.now()
    await page.getByLabel(/email/i).fill(`newuser+${unique}@example.com`)
    await page.getByLabel(/^password/i).fill('password123')
    await page.getByLabel(/business name/i).fill(`Test Business ${unique}`)
    await page.getByRole('button', { name: /create account/i }).click()

    // Should end up on the authenticated landing page
    await expect(page).not.toHaveURL(/\/register/)
  })

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/contacts')
    await expect(page).toHaveURL(/\/login/)
  })
})

// EXTEND: add app-specific flows below, e.g.:
//
// test.describe('messages', () => {
//   test.beforeEach(async ({ page }) => {
//     await loginAs(page, DEMO_EMAIL, DEMO_PASSWORD)
//   })
//
//   test('send a message', async ({ page }) => {
//     await page.goto('/messages')
//     await page.getByRole('button', { name: /new message/i }).click()
//     ...
//   })
// })

// Utility — reuse across tests when auth state isn't persisted
async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/home/)
}
