import { expect, test } from '@playwright/test'

const hostPort = Number(process.env.EMBED_PHASE0_HOST_PORT ?? 4177)
const runtimePort = Number(process.env.EMBED_PHASE0_RUNTIME_PORT ?? 4178)
const allowedHost = `http://127.0.0.1:${hostPort}`
const deniedHost = `http://localhost:${hostPort}`
const runtime = `http://127.0.0.1:${runtimePort}`

test.describe('Embed Phase 0 browser contract', () => {
  test('authorizes from the browser Origin header and denies another origin before rendering', async ({
    page,
    request,
  }) => {
    await page.goto(`${allowedHost}/origin`)
    await expect(page.locator('body')).toHaveAttribute('data-status', 'authorized')
    await expect(page.locator('body')).toHaveAttribute('data-redeemed', '1')

    await page.goto(`${deniedHost}/origin`)
    await expect(page.locator('body')).toHaveAttribute('data-status', 'denied')
    await expect(page.locator('iframe')).toHaveCount(0)

    const state = await (await request.get(`${runtime}/state`)).json()
    expect(state.authorizationOrigins).toContain(allowedHost)
    expect(state.authorizationOrigins).toContain(deniedHost)
  })

  test('redeems an authorized bootstrap token exactly once', async ({ page }) => {
    await page.goto(`${allowedHost}/origin?replay=1`)
    await expect(page.locator('body')).toHaveAttribute('data-redeemed', '1')
    await expect(page.locator('body')).toHaveAttribute('data-rejected', '1')
  })

  test('qualifies a Page view only after an uninterrupted visible second', async ({ page }) => {
    await page.goto(`${allowedHost}/visibility?kind=page`)
    await page.waitForTimeout(1100)
    await expect(page.locator('body')).toHaveAttribute('data-events', '')

    await page.locator('#target').scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(600)
    await expect(page.locator('body')).toHaveAttribute('data-events', '')

    await page.locator('#target').scrollIntoViewIfNeeded()
    await expect(page.locator('body')).toHaveAttribute('data-events', 'page_viewed', {
      timeout: 1800,
    })
  })

  test('pauses Page qualification while its browser window is backgrounded', async ({
    page,
    context,
    browserName,
  }) => {
    test.fixme(
      true,
      'Requires a headed browser with a real window manager; this CI host has Xvfb only and no sudo access to install one',
    )
    test.skip(
      browserName !== 'chromium',
      'Playwright exposes browser-window control only through Chromium CDP',
    )
    await page.goto(`${allowedHost}/visibility?kind=page`)
    await page.locator('#target').scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    const browserWindow = await context.newCDPSession(page)
    const { windowId } = await browserWindow.send('Browser.getWindowForTarget')
    await browserWindow.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'minimized' },
    })
    await page.waitForFunction(() => document.visibilityState === 'hidden')
    await new Promise((resolve) => setTimeout(resolve, 800))
    await browserWindow.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'normal' },
    })
    await page.waitForFunction(() => document.visibilityState === 'visible')
    await expect(page.locator('body')).toHaveAttribute('data-events', '')

    await expect(page.locator('body')).toHaveAttribute('data-events', 'page_viewed', {
      timeout: 1800,
    })
  })

  test('qualifies one Ad impression at 50 percent visibility for one continuous second', async ({
    page,
  }) => {
    await page.goto(`${allowedHost}/visibility?kind=ad`)
    await page.locator('#target').scrollIntoViewIfNeeded()
    await expect(page.locator('body')).toHaveAttribute('data-events', 'ad_impression', {
      timeout: 1800,
    })
    await page.waitForTimeout(1100)
    await expect(page.locator('body')).toHaveAttribute('data-events', 'ad_impression')
  })

  test('resets Ad qualification when an iframe resize breaks the visibility threshold', async ({
    page,
  }) => {
    await page.goto(`${allowedHost}/visibility?kind=ad`)
    const target = page.locator('#target')
    await target.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await target.evaluate((frame) => {
      frame.style.width = '4000px'
    })
    await page.waitForTimeout(600)
    await expect(page.locator('body')).toHaveAttribute('data-events', '')

    await target.evaluate((frame) => {
      frame.style.width = '300px'
    })
    await expect(page.locator('body')).toHaveAttribute('data-events', 'ad_impression', {
      timeout: 1800,
    })
  })

  test('blocks programmatic Ad top navigation but permits a real user-activated tracked link', async ({
    page,
  }) => {
    await page.goto(`${allowedHost}/ad-navigation`)
    const ad = page.frameLocator('#ad')
    await ad.locator('#tracked-ad-link').evaluate((link: HTMLAnchorElement) => link.click())
    await page.waitForTimeout(250)
    await expect(page).toHaveURL(`${allowedHost}/ad-navigation`)

    await ad.locator('#tracked-ad-link').click()
    await expect(page).toHaveURL(`${allowedHost}/navigated?via=ad`)
    await expect(page.locator('body')).toHaveAttribute('data-via', 'ad')
  })

  test('allows validated loader navigation after asynchronous form success', async ({ page }) => {
    await page.goto(`${allowedHost}/form-navigation`)
    await page.frameLocator('#form').locator('#submit').click()
    await expect(page).toHaveURL(`${allowedHost}/navigated?via=form-success`)
    await expect(page.locator('body')).toHaveAttribute('data-via', 'form-success')
  })
})
