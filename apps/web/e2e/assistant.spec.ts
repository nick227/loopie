/**
 * Loopie Assistant — verifies the cross-product priority chain (Business -> Pages ->
 * Advertising -> Calendar fallback) end to end against a fresh account, entered through the
 * Loopie Assistant icon in the Shell header and driven entirely through the assistant panel.
 * Each action calls a real existing operation (updateBusiness, createLandingPage,
 * publishLandingPage, createCampaign) — this proves the whole chain, not just the resolver. Also
 * verifies the panel is non-modal (background stays usable, no backdrop) and that it hands off to
 * a real ad-promotion action instead of dead-ending straight into Calendar.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('next steps assistant', () => {
  test('walks a fresh business through business info -> logo -> homepage -> publish', async ({
    page,
  }) => {
    test.setTimeout(90_000)

    // --- Register a fresh account (only businessName is set — everything else is empty) ---
    const unique = Date.now()
    await page.goto('/register')
    await page.getByLabel(/email/i).fill(`assistant-e2e+${unique}@example.com`)
    await page.getByLabel(/^password/i).fill('password123')
    await page.getByLabel(/business name/i).fill(`Assistant E2E ${unique}`)
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).not.toHaveURL(/\/register/)

    // First-run onboarding gate (BusinessSetupPage) runs before Shell (and so the assistant
    // launcher) ever mounts — only the business name is required, so we can pass straight
    // through and let the assistant handle industry/location instead.
    await page.getByRole('button', { name: /continue to calendar/i }).click()
    await page.waitForURL(/\/calendar/)

    const assistantButton = page.getByRole('button', { name: /loopie assistant/i })
    await expect(assistantButton).toBeVisible({ timeout: 15000 })

    // --- Panel opens/closes correctly, Escape closes it ---
    await assistantButton.click()
    const dialog = page.getByTestId('assistant-modal')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Loopie Assistant' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // --- Non-modal: no backdrop, background stays usable while the panel is open ---
    await assistantButton.click()
    await expect(dialog).toBeVisible()
    await page.getByRole('link', { name: 'Pages' }).click()
    await expect(page).toHaveURL(/\/landing-pages/)
    await expect(dialog).toBeVisible()

    // --- Assistant Home: state-aware greeting + the next real action, not "Step 1 of 4" ---
    await expect(dialog.getByText(/what are we working on/i)).toBeVisible()
    await expect(dialog.getByText('Finish your business profile')).toBeVisible()

    // --- Step 1: business info (conversational framing, not a form wizard) ---
    await dialog.getByText('Finish your business profile').click()
    await expect(dialog.getByText("Let's get your business looking official.")).toBeVisible()
    await dialog.getByLabel('Industry').fill('Landscaping')
    await dialog.getByLabel('Location').fill('Austin, TX')
    await dialog.getByLabel('Phone').fill('555-0100')
    await dialog.getByLabel('Email').fill('hi@example.com')
    await dialog.getByLabel('About your business').fill('We do landscaping.')
    await dialog.getByRole('button', { name: /continue/i }).click()
    await expect(dialog.getByText('Business details saved')).toBeVisible()

    // --- Step 2: logo (auto-advances after the brief confirmation) ---
    await expect(dialog.getByText('Do you have a logo you’d like to use?')).toBeVisible({
      timeout: 10000,
    })
    await dialog.locator('a').first().click()
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveCount(1, { timeout: 10000 })
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-photo.png'))
    await expect(page.getByRole('button', { name: 'Use selected' })).toBeEnabled({ timeout: 15000 })
    await page.getByRole('button', { name: 'Use selected' }).click()
    await expect(dialog.getByText('Logo added')).toBeVisible()

    // --- Step 3: create homepage ---
    await expect(
      dialog.getByText("Let's build your homepage from a template you can edit anytime."),
    ).toBeVisible({ timeout: 10000 })
    await dialog.getByRole('button', { name: /create homepage/i }).click()
    await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
    await expect(dialog.getByText('Homepage created')).toBeVisible({ timeout: 15000 })

    // --- Step 4: publish homepage — no longer a dead end: it auto-advances into ADVERTISING,
    // since the homepage is now published with no promotion. ---
    await expect(dialog.getByText('Your homepage is ready to go live.')).toBeVisible({
      timeout: 10000,
    })
    await dialog.getByRole('button', { name: /publish homepage/i }).click()
    await expect(dialog.getByText('Your homepage is live')).toBeVisible({ timeout: 15000 })

    // --- ADVERTISING: create the real promotion campaign, landing on the real campaign page ---
    await expect(dialog.getByText(/is live, but nobody's being sent to it yet/i)).toBeVisible({
      timeout: 15000,
    })
    await dialog.getByRole('button', { name: /create your first promotion/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)
    // AssistantCampaignCreateStep closes the panel after navigating away.
    await expect(dialog).toBeHidden({ timeout: 10000 })
    const campaignId = page.url().split('/campaigns/')[1]!

    // --- Reopening always starts at Home; the fresh campaign has zero creatives, so ADVERTISING
    // now offers to resume it rather than create another one. ---
    await assistantButton.click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Finish setting up your campaign')).toBeVisible({
      timeout: 15000,
    })
    await dialog.getByText('Finish setting up your campaign').click()
    await dialog.getByRole('button', { name: /finish setting up your campaign/i }).click()
    await page.waitForURL(new RegExp(`/campaigns/${campaignId}$`))
    await expect(dialog).toBeHidden({ timeout: 10000 })

    // --- Attach a creative to each campaign via the real API (not the ads UI — out of scope
    // for this spec) so ADVERTISING stops finding anything to do, clearing the way to CALENDAR.
    // Registration auto-provisions its own default published page (see
    // AuthService.ts -> provisionDefaultPage), so there are genuinely two published pages
    // needing promotion here, not just the one created through this flow — loop rather than
    // hard-code a count. ---
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

    async function attachCreativeTo(id: string) {
      const assetRes = await page.request.post(`${apiOrigin}/assets`, {
        data: {
          type: 'IMAGE',
          name: `e2e asset ${id}`,
          url: 'https://picsum.photos/seed/assistant/800/600',
        },
      })
      expect(assetRes.ok()).toBeTruthy()
      const assetId = (await assetRes.json()).data.id
      const creativeRes = await page.request.post(`${apiOrigin}/creatives`, {
        data: { name: `e2e creative ${id}`, assetIds: [assetId] },
      })
      expect(creativeRes.ok()).toBeTruthy()
      const creativeId = (await creativeRes.json()).data.id
      const attachRes = await page.request.patch(`${apiOrigin}/campaigns/${id}`, {
        data: { creativeIds: [creativeId] },
      })
      expect(attachRes.ok()).toBeTruthy()
    }

    await attachCreativeTo(campaignId)

    for (let i = 0; i < 3; i++) {
      const nextRes = await page.request.get(`${apiOrigin}/assistant/next-action`)
      const next = (await nextRes.json()).data
      if (next.type !== 'ADVERTISING' || next.actionId !== 'campaign_create') break
      const campRes = await page.request.post(`${apiOrigin}/campaigns`, {
        data: { name: `Promote ${next.pageName}`, destinationUrl: next.pageUrl },
      })
      expect(campRes.ok()).toBeTruthy()
      await attachCreativeTo((await campRes.json()).data.id)
    }

    // These fixture calls went straight to the API, bypassing React Query entirely — reload so
    // the already-mounted panel's cached next-action response isn't stale.
    await page.reload()
    await expect(assistantButton).toBeVisible({ timeout: 15000 })

    // --- Back at Assistant Home: with Business/Pages/Advertising all clear, it hands off to
    // Calendar's own real next-best-action content instead of dead-ending ---
    await assistantButton.click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Nice work — your homepage is live.')).toBeVisible({
      timeout: 15000,
    })
    await expect(dialog.getByRole('link', { name: 'View homepage' })).toBeVisible()
    const ideaCard = dialog.getByRole('button', { name: /add to this week/i })
    const caughtUp = dialog.getByText(/all caught up/i)
    await expect(ideaCard.or(caughtUp)).toBeVisible({ timeout: 15000 })
    if (await ideaCard.isVisible()) {
      await ideaCard.click()
      await expect(dialog.getByText('Added to your calendar')).toBeVisible({ timeout: 10000 })
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Recompute is live, not cached: reloading and reopening still shows the same state.
    await page.reload()
    await expect(assistantButton).toBeVisible({ timeout: 15000 })
    await assistantButton.click()
    await expect(dialog.getByText('Nice work — your homepage is live.')).toBeVisible({
      timeout: 15000,
    })
  })

  test('Site Education: answers questions and exposes the same real action, without mutating anything', async ({
    page,
  }) => {
    test.setTimeout(60_000)

    const unique = Date.now()
    await page.goto('/register')
    await page.getByLabel(/email/i).fill(`assistant-education-e2e+${unique}@example.com`)
    await page.getByLabel(/^password/i).fill('password123')
    await page.getByLabel(/business name/i).fill(`Assistant Education E2E ${unique}`)
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).not.toHaveURL(/\/register/)
    await page.getByRole('button', { name: /continue to calendar/i }).click()
    await page.waitForURL(/\/calendar/)

    const assistantButton = page.getByRole('button', { name: /loopie assistant/i })
    await expect(assistantButton).toBeVisible({ timeout: 15000 })
    await assistantButton.click()
    const dialog = page.getByTestId('assistant-modal')
    await expect(dialog).toBeVisible()

    // --- The section is visible on Home alongside the real next action ---
    await expect(dialog.getByText('Learn about Loopie')).toBeVisible()
    await expect(dialog.getByText('Finish your business profile')).toBeVisible()

    // --- "What is this site?" — a plain static answer, Back returns to Home ---
    await dialog.getByRole('button', { name: 'What is this site?' }).click()
    await expect(dialog.getByText(/Loopie is one platform/)).toBeVisible()
    await dialog.getByRole('button', { name: /assistant home/i }).click()
    await expect(dialog.getByText('Learn about Loopie')).toBeVisible()

    // --- "How do I get started?" — state-aware note + the fixed path, with a link into
    // "What should I do next?" ---
    await dialog.getByRole('button', { name: 'How do I get started?' }).click()
    await expect(
      dialog.getByText("You're just getting started — here's the path ahead."),
    ).toBeVisible()
    await expect(
      dialog.getByText(/complete your business profile, publish a useful page/),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'What should I do next?' }).click()

    // --- "What should I do next?" reuses the resolver and exposes the SAME real action button
    // as the Home card (same label as STEP_COPY.business_info.actionLabel: "Continue") — clicking
    // it hands off into the real Flow, it doesn't mutate anything itself. ---
    await expect(dialog.getByText(/the most useful thing you can do is/i)).toBeVisible()
    await expect(
      dialog.getByText('A complete profile makes every page and message you send look credible'),
    ).toBeVisible()
    const doItButton = dialog.getByRole('button', { name: /^continue$/i })
    await expect(doItButton).toBeVisible()

    // Nothing was mutated by reading these answers: the business is still incomplete.
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    const beforeClick = await page.request.get(`${apiOrigin}/business`)
    expect((await beforeClick.json()).data.industry).toBeNull()

    await doItButton.click()
    await expect(dialog.getByText("Let's get your business looking official.")).toBeVisible()
    await expect(dialog.getByLabel('Industry')).toBeVisible()
  })
})
