/**
 * Google OAuth browser path (IdP stubbed via GOOGLE_AUTH_E2E_STUB).
 *
 * Flow under test: Login/Register Google button → /auth/google (302 toward Google) → our
 * callback with a stub code + valid signed state → session cookie → landing.
 * Google's consent screen is not completed (redirect_uri may be unregistered in Console;
 * token exchange uses GOOGLE_AUTH_E2E_STUB codes on the API).
 *
 * Requires: seeded demo account, API with GOOGLE_CLIENT_* + GOOGLE_AUTH_E2E_STUB=1,
 * PUBLIC_APP_URL = Playwright baseURL.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

async function googleCallbackUrl(request: APIRequestContext, code: string, returnTo: string) {
  const start = await request.get(`${API}/auth/google?returnTo=${encodeURIComponent(returnTo)}`, {
    maxRedirects: 0,
  })
  expect(start.status()).toBe(302)
  const location = start.headers().location
  expect(location).toMatch(/accounts\.google\.com/)
  const state = new URL(location!).searchParams.get('state')
  expect(state).toBeTruthy()
  const callback = new URL('/auth/google/callback', API)
  callback.searchParams.set('code', code)
  callback.searchParams.set('state', state!)
  return callback.toString()
}

async function clickGoogleAndFinish(
  page: Page,
  request: APIRequestContext,
  opts: { button: RegExp; code: string; returnTo: string },
) {
  const callback = await googleCallbackUrl(request, opts.code, opts.returnTo)

  await page.getByRole('button', { name: opts.button }).click()
  // Button must leave the SPA via /auth/google (browser follows the 302 to Google or Google's
  // redirect_uri error page — either proves the wiring).
  await page.waitForURL(/\/auth\/google|accounts\.google\.com/, { timeout: 10_000 })

  await page.goto(callback)
}

test.describe('Google auth', () => {
  test('existing user: Continue with Google → session → calendar', async ({
    page,
    context,
    request,
  }) => {
    await page.goto('/login?returnTo=/calendar')
    await clickGoogleAndFinish(page, request, {
      button: /continue with google/i,
      code: 'e2e-existing',
      returnTo: '/calendar',
    })

    await expect(page).toHaveURL(/\/calendar/, { timeout: 15_000 })

    const cookies = await context.cookies(API)
    expect(cookies.some((c) => c.name === 'token' && c.value.length > 0)).toBe(true)
  })

  test('new user: Sign up with Google → session → business setup', async ({
    page,
    context,
    request,
  }) => {
    const email = `google-e2e+${Date.now()}@example.com`
    await page.goto('/register')
    await clickGoogleAndFinish(page, request, {
      button: /sign up with google/i,
      code: `e2e-new:${email}`,
      returnTo: '/',
    })

    await expect(page).toHaveURL(/\/business\/setup/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /let.s get to know you/i })).toBeVisible()

    const cookies = await context.cookies(API)
    expect(cookies.some((c) => c.name === 'token' && c.value.length > 0)).toBe(true)
  })
})
