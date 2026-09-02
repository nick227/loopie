/**
 * The canonical content model's whole reason for existing: switching a page's template must
 * never discard content a different template doesn't render. Also covers Corporate Professional's
 * inline editing directly in its own rich (non-iframe) preview.
 */
import { test, expect, type Page } from '@playwright/test'

async function registerAndOpenHome(page: Page) {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel(/email/i).fill(`content+${unique}@example.com`)
  await page.getByLabel(/^password/i).fill('password123')
  await page.getByLabel(/business name/i).fill(`Content Co ${unique}`)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/business\/setup/)
  await page.getByRole('button', { name: /continue to inbox/i }).click()
  await page.waitForURL(/\/home/)
  await page.goto('/landing-pages')
  // Collection rows are the entire clickable link (UniversalRow) — there is no separate "Edit"
  // text link. A fresh business already has one default Home page (provisionDefaultPage).
  await page.locator('a[href^="/landing-pages/"]').first().click()
  await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
}

test.describe('landing page content preservation', () => {
  test('switching templates never discards content the other template does not render', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await registerAndOpenHome(page)

    const layout = page.getByLabel('Layout')

    // hero is a canonical slot group shared by every template's schema — editing it on Corporate
    // Professional and switching to the plain Sales page must carry the value straight across,
    // not just preserve-and-disable it (they render the *same* enabled field).
    await layout.selectOption({ label: 'Nexus Consulting | Strategic Growth Solutions' })
    await expect(page.getByLabel('Hero headline')).toBeVisible()
    await page.getByLabel('Hero headline').dblclick()
    await page.getByLabel('Hero headline').fill('Preserve Me Headline')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    // A field only Corporate Professional's schema declares (Sales page has no testimonials
    // slot at all) — template switches never backfill starter content on their own (that only
    // happens at page-creation time), so write something distinctive here directly.
    await page.getByLabel('Testimonials headline').dblclick()
    await page.getByLabel('Testimonials headline').fill('Preserve Me Too')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    await layout.selectOption({ label: 'Sales page' })
    await expect(page.getByLabel('Headline', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Headline', { exact: true })).toHaveText('Preserve Me Headline')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    // Content tab: the Corporate-Professional-only slot group (testimonials) still shows up,
    // disabled, with the value just written — not silently discarded by the switch.
    await page.getByRole('tab', { name: 'Content' }).click()
    await expect(page.getByText('Not in current layout').first()).toBeVisible()
    await expect(page.getByLabel('Testimonials Headline')).toHaveValue('Preserve Me Too')
    await expect(page.getByLabel('Testimonials Headline')).toBeDisabled()

    // Switch back to Corporate Professional: both edits are still there, now re-enabled.
    await page.getByRole('tab', { name: 'Editor' }).click()
    await layout.selectOption({ label: 'Nexus Consulting | Strategic Growth Solutions' })
    await expect(page.getByLabel('Hero headline')).toHaveText('Preserve Me Headline')
    await expect(page.getByLabel('Testimonials headline')).toHaveText('Preserve Me Too')
  })

  test('inline-edits Corporate Professional hero headline directly in its own preview', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await registerAndOpenHome(page)

    const layout = page.getByLabel('Layout')
    await layout.selectOption({ label: 'Nexus Consulting | Strategic Growth Solutions' })
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    const headline = page.getByLabel('Hero headline')
    await expect(headline).toBeVisible()
    await headline.dblclick()
    await headline.fill('Corporate Inline Edit Works')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Corporate Inline Edit Works')).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('no Sections tab; Content tab has a visibility toggle; nav/brand is editable content; theme recolors Corporate Professional', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await registerAndOpenHome(page)

    // Sections was folded into Content — there is no third structural tab any more.
    await expect(page.getByRole('tab', { name: 'Sections' })).toHaveCount(0)

    const layout = page.getByLabel('Layout')
    await layout.selectOption({ label: 'Nexus Consulting | Strategic Growth Solutions' })
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    // Brand name is a real content hole now, not baked-in "Nexus" text — this page was switched
    // to Corporate Professional from an existing Sales page, so it has no starter content yet
    // (that only seeds at page-creation time), proven by the empty-state placeholder showing.
    const brand = page.getByLabel('Brand name')
    await expect(brand).toHaveText('Brand')
    await brand.dblclick()
    await brand.fill('Acme Growth Partners')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Acme Growth Partners')).toBeVisible()

    // Theming: the hero CTA's background is driven by --lp-primary, which starts at the Carbon
    // preset's color. Switching theme must actually recolor it. No starter content exists here
    // (switched from an existing page, not created fresh), so the CTA shows its placeholder text.
    const ctaButton = page.getByText('Add a call to action').first()
    const before = await ctaButton.evaluate((el) => getComputedStyle(el).backgroundColor)
    await page.getByLabel('Theme').selectOption({ label: 'Shopfront' })
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect
      .poll(() => ctaButton.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(before)

    // Content tab: a hideable section (Features) gets a visibility toggle; toggling it off is
    // reflected immediately in the visual Editor tab too (same layoutConfig, not a separate copy).
    await page.getByRole('tab', { name: 'Content' }).click()
    const featuresToggle = page.getByRole('button', { name: 'Hide Features' })
    await expect(featuresToggle).toBeVisible()
    await featuresToggle.click()
    await expect(page.getByRole('button', { name: 'Show Features' })).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    await page.getByRole('tab', { name: 'Editor' }).click()
    await expect(page.getByLabel('Features headline')).toHaveCount(0)
  })
})
