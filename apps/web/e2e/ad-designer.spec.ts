/**
 * Ad Designer — verifies the core product contract end to end, in a real browser:
 *
 *   CREATE ONCE -> PAGES -> RIVER -> EMBED
 *
 * A single creative, composed once in the Designer with real presets (not defaults), must reopen
 * with the exact same appearance, then render — via the one shared @project/ad-renderer function,
 * not three separate implementations — on a Loopie Page, in River, and in the standalone embed
 * document a real external site would load. See CLAUDE.md's Ad Designer entry.
 *
 * Seed credentials come from packages/db/prisma/seed.ts. Run seed before tests: pnpm db:seed
 */
import { test, expect, type Page } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

async function loginAs(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/calendar/)
}

const AD_SERVER_ORIGIN = process.env.PLAYWRIGHT_AD_SERVER_URL ?? 'http://localhost:3002'
const API_ORIGIN = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

test.describe('Ad Designer — create once, use everywhere', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test('Poster: design with real presets -> save -> reopen -> publish -> Page -> River -> embed', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const marker = `PosterE2E ${Date.now()}`

    // --- 1/2: create a Poster, compose real content + media ---
    await page.goto('/ads/new?format=POSTER')
    await expect(page.locator('.adc.adc--poster')).toBeVisible()
    await page.getByPlaceholder('Internal name (not shown to visitors)').fill(marker)
    await page.getByPlaceholder('Headline').fill('Fall Sale')
    await page.getByPlaceholder('Supporting text').fill('20% off everything this weekend')
    await page.getByPlaceholder('CTA label (e.g. Shop now)').fill('Shop now')

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const uploaded = page.waitForResponse(
      (res) => res.url().includes('/assets') && res.request().method() === 'POST',
    )
    await page.locator('input[type=file]').setInputFiles({
      name: `poster-${Date.now()}.png`,
      mimeType: 'image/png',
      buffer: png,
    })
    await uploaded
    await expect(page.locator('.adc-media-img')).toBeVisible()

    // --- 2: real (non-default) presets — text placement, font scale, overlay, CTA placement —
    // and confirm the live preview responds to each, live, via the shared renderer ---
    const preview = page.locator('.adc').first()
    const previewCopy = preview.locator('.adc-copy')
    const previewOverlay = preview.locator('.adc-overlay')
    await expect(previewCopy).toHaveClass(/adc-place-bottom_left/) // POSTER's own default, sanity check
    await page.getByRole('button', { name: 'Top right', exact: true }).click()
    await expect(previewCopy).toHaveClass(/adc-place-top_right/)
    await page.getByRole('button', { name: 'Compact', exact: true }).click()
    await expect(previewCopy).toHaveClass(/adc-font-compact/)
    await page.getByRole('button', { name: 'None', exact: true }).click()
    await expect(previewOverlay).toHaveClass(/adc-overlay--none/)
    await page.getByRole('button', { name: 'Top banner', exact: true }).click()
    await expect(preview.locator('.adc-cta-banner')).toHaveText('Shop now')

    // Destination — EXTERNAL_URL (the default type)
    const destinationUrl = `https://example.com/fall-sale-${Date.now()}`
    await page.getByPlaceholder('https://example.com/offer').fill(destinationUrl)

    // --- 3: save -> reopen (hard reload) -> the creative retains its exact design ---
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForURL(
      (url) => /^\/ads\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/new'),
    )
    const adId = new URL(page.url()).pathname.split('/ads/')[1]!
    await page.reload()

    await expect(page.getByPlaceholder('Headline')).toHaveValue('Fall Sale')
    await expect(page.getByRole('button', { name: 'Top right', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: 'Compact', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: 'None', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: 'Top banner', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const reopenedPreview = page.locator('.adc').first()
    await expect(reopenedPreview.locator('.adc-copy')).toHaveClass(/adc-place-top_right/)
    await expect(reopenedPreview.locator('.adc-copy')).toHaveClass(/adc-font-compact/)
    await expect(reopenedPreview.locator('.adc-overlay')).toHaveClass(/adc-overlay--none/)
    await expect(reopenedPreview.locator('.adc-cta-banner')).toHaveText('Shop now')
    await expect(page.locator('.adc-media-img')).toBeVisible()
    await expect(page.getByPlaceholder('https://example.com/offer')).toHaveValue(destinationUrl)

    // --- 4: publish ---
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible()
    const published = page.waitForResponse(
      (res) => res.url().includes('/publish') && res.request().method() === 'POST' && res.ok(),
    )
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await published
    await expect(page.getByRole('button', { name: 'Republish', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Share to River' })).toBeVisible()

    // --- 5: place the saved creative on a real Loopie Page, by reference, via the actual ad-slot
    // picker UI (not the API directly — this is exactly the integration that must work). The page
    // itself is created via the API (the "New page" entry point is a separate, already-covered
    // UI this test isn't targeting — /landing-pages/new now redirects to the collection page,
    // whose own creation affordances are a different concern from Ad Designer/Page integration). ---
    const templatesResp = await page.request.get(`${API_ORIGIN}/landing-page-templates`)
    const templates = (await templatesResp.json()).data as { id: string }[]
    // A real hero+form template (the same one useQuickCreatePage/PagesStartRow default to) —
    // needed because this test actually opens the editor in the browser (unlike Test 2's
    // API-only destination page), and not every template carries a "Headline" field.
    const templateId =
      templates.find((t) => t.id === 'system-template-lead-gen')?.id ?? templates[0]!.id
    const lpName = `PosterPageE2E ${Date.now()}`
    const createPageRes = await page.request.post(`${API_ORIGIN}/landing-pages`, {
      data: { templateId, name: lpName, slug: `poster-page-e2e-${Date.now()}` },
    })
    expect(createPageRes.ok()).toBeTruthy()
    const landingPageId = (await createPageRes.json()).data.id as string

    await page.goto(`/landing-pages/${landingPageId}`)
    await expect(page.getByLabel('Headline', { exact: true })).toBeVisible({ timeout: 15000 })

    await expect(page.getByLabel('Ad', { exact: true })).toHaveCount(1)
    const slotSaved = page.waitForResponse(
      (res) => res.url().includes('/ad-slots') && res.request().method() === 'PUT' && res.ok(),
      { timeout: 10000 },
    )
    await page.getByLabel('Ad', { exact: true }).selectOption({ label: `${marker} · POSTER` })
    await slotSaved

    const pagePublished = page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/publish') && res.ok(),
    )
    await page.getByRole('button', { name: /^publish$/i }).click()
    await pagePublished

    const pageDataRes = await page.request.get(`${API_ORIGIN}/landing-pages/${landingPageId}`)
    expect(pageDataRes.ok()).toBeTruthy()
    const pageData = (await pageDataRes.json()).data
    expect(pageData.status).toBe('PUBLISHED')
    const hostedResp = await page.request.get(
      `${API_ORIGIN}${new URL(pageData.hostedUrl, API_ORIGIN).pathname}`,
    )
    expect(hostedResp.status()).toBe(200)
    const hostedHtml = await hostedResp.text()
    // The Page renders the exact same shared-renderer fragment (via the ad-server iframe src) —
    // not a flattened/second implementation. Context defaults to CONTAINED (no picker built yet).
    expect(hostedHtml).toContain(`/ads/${adId}/embed`)
    expect(hostedHtml).toContain('lp-ad--format-poster')
    expect(hostedHtml).toContain('lp-ad--contained')

    // The iframe target itself actually renders the Poster, CTA included.
    const pageAdEmbedResp = await page.request.get(`${AD_SERVER_ORIGIN}/ads/${adId}/embed`)
    expect(pageAdEmbedResp.status()).toBe(200)
    const pageAdEmbedHtml = await pageAdEmbedResp.text()
    expect(pageAdEmbedHtml).toContain('adc--poster')
    expect(pageAdEmbedHtml).toContain('Fall Sale')
    expect(pageAdEmbedHtml).toContain(`href="${destinationUrl}"`)

    // --- 6: share the same creative to River — real format, not a flattened image+caption post ---
    await page.goto(`/ads/${adId}`)
    const riverPosted = page.waitForResponse(
      (res) => res.url().includes('/river/posts') && res.request().method() === 'POST' && res.ok(),
    )
    await page.getByRole('button', { name: 'Share to River' }).click()
    const riverRes = await riverPosted
    const riverPostId = (await riverRes.json()).data.id as string
    expect(riverPostId).toBeTruthy()

    await page.goto(`/river/posts/${riverPostId}`)
    const riverPreview = page.locator('.adc').first()
    await expect(riverPreview).toBeVisible()
    await expect(riverPreview).toHaveClass(/adc--poster/)
    await expect(riverPreview.locator('.adc-copy')).toHaveClass(/adc-place-top_right/)
    await expect(riverPreview.locator('.adc-cta-banner')).toHaveText('Shop now')

    // --- 7: the generated embed code renders the same creative outside the editor, with a
    // working CTA/destination, via the exact public embed protocol a third-party site would use ---
    await page.goto(`/ads/${adId}`)
    await page.getByRole('button', { name: 'Get embed code' }).click()
    const snippet = await page.locator('pre').textContent()
    const publicId = snippet!.match(/data-public-id="([^"]+)"/)?.[1]
    expect(publicId).toBeTruthy()

    const authorizeRes = await page.request.post(
      `${AD_SERVER_ORIGIN}/v1/embeds/${publicId}/authorize`,
      { data: { url: 'https://third-party-site.test/', referrer: '' } },
    )
    expect(authorizeRes.ok()).toBeTruthy()
    const nonce = (await authorizeRes.json()).data.nonce as string
    expect(nonce).toBeTruthy()

    const iframeRes = await page.request.get(`${AD_SERVER_ORIGIN}/e/${publicId}?token=${nonce}`)
    expect(iframeRes.status()).toBe(200)
    const iframeHtml = await iframeRes.text()
    expect(iframeHtml).toContain('adc--poster')
    expect(iframeHtml).toContain('Fall Sale')
    expect(iframeHtml).toContain('adc-cta-banner')
    const clickHrefMatch = iframeHtml.match(/href="([^"]*\/v1\/embed\/[^"]+\/click[^"]*)"/)
    expect(clickHrefMatch).toBeTruthy()

    // Following the embed's own click link actually redirects to the real destination.
    const clickPath = clickHrefMatch![1]!
    const clickRes = await page.request.get(`${AD_SERVER_ORIGIN}${clickPath}`, {
      maxRedirects: 0,
    })
    expect([301, 302, 303, 307, 308]).toContain(clickRes.status())
    expect(clickRes.headers()['location']).toContain(destinationUrl)
  })

  test('Story and Feed Post: create each, and a LANDING_PAGE destination resolves to the real page', async ({
    page,
  }) => {
    test.setTimeout(90_000)

    // A real published destination page, created directly (this test's own focus is the ad
    // formats + destination resolution, not the page editor UI — already covered above).
    const templatesResp = await page.request.get(`${API_ORIGIN}/landing-page-templates`)
    const templateId = ((await templatesResp.json()).data as { id: string }[])[0]!.id
    const destSlug = `ad-designer-e2e-dest-${Date.now()}`
    const createPageRes = await page.request.post(`${API_ORIGIN}/landing-pages`, {
      data: { templateId, name: `AdDesignerDest ${Date.now()}`, slug: destSlug },
    })
    expect(createPageRes.ok()).toBeTruthy()
    const destPage = (await createPageRes.json()).data
    const publishPageRes = await page.request.post(
      `${API_ORIGIN}/landing-pages/${destPage.id}/publish`,
    )
    expect(publishPageRes.ok()).toBeTruthy()

    // --- Feed Post ---
    const feedMarker = `FeedPostE2E ${Date.now()}`
    await page.goto('/ads/new?format=FEED_POST')
    await expect(page.locator('.adc.adc--feed_post')).toBeVisible()
    await page.getByPlaceholder('Internal name (not shown to visitors)').fill(feedMarker)
    await page.getByPlaceholder('Headline').fill('New arrivals')
    await page.getByRole('button', { name: 'A Loopie Page' }).click()
    await page.getByLabel('Destination page').selectOption({ label: destPage.name })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForURL(
      (url) => /^\/ads\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/new'),
    )

    const feedPublished = page.waitForResponse(
      (res) => res.url().includes('/publish') && res.request().method() === 'POST' && res.ok(),
    )
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await feedPublished

    await page.getByRole('button', { name: 'Get embed code' }).click()
    const feedSnippet = await page.locator('pre').textContent()
    const feedPublicId = feedSnippet!.match(/data-public-id="([^"]+)"/)?.[1]
    const feedAuth = await page.request.post(
      `${AD_SERVER_ORIGIN}/v1/embeds/${feedPublicId}/authorize`,
      {
        data: { url: 'https://third-party-site.test/', referrer: '' },
      },
    )
    const feedNonce = (await feedAuth.json()).data.nonce as string
    const feedIframe = await page.request.get(
      `${AD_SERVER_ORIGIN}/e/${feedPublicId}?token=${feedNonce}`,
    )
    const feedIframeHtml = await feedIframe.text()
    expect(feedIframeHtml).toContain('adc--feed_post')
    const feedClickHref = feedIframeHtml.match(/href="([^"]*\/v1\/embed\/[^"]+\/click[^"]*)"/)?.[1]
    const feedClickRes = await page.request.get(`${AD_SERVER_ORIGIN}${feedClickHref}`, {
      maxRedirects: 0,
    })
    expect([301, 302, 303, 307, 308]).toContain(feedClickRes.status())
    // Resolved live from the LANDING_PAGE reference at publish time, not a copy — the real
    // hosted URL for the page this test just created.
    expect(feedClickRes.headers()['location']).toContain(destSlug)

    // --- Story ---
    const storyMarker = `StoryE2E ${Date.now()}`
    await page.goto('/ads/new?format=STORY')
    await expect(page.locator('.adc.adc--story')).toBeVisible()
    await page.getByPlaceholder('Internal name (not shown to visitors)').fill(storyMarker)
    await page.getByPlaceholder('Headline').fill('Swipe up')
    await expect(page.locator('.adc').first().locator('.adc-copy')).toHaveClass(
      /adc-place-bottom_center/,
    ) // STORY default
  })
})
