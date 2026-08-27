/**
 * Isolated page editor: canvas edits, inline form fields, layout switch, publish.
 * Does not visit /forms/new.
 */
import { test, expect, type Page } from '@playwright/test'

async function registerAndOpenHome(page: Page) {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel(/email/i).fill(`editor+${unique}@example.com`)
  await page.getByLabel(/^password/i).fill('password123')
  await page.getByLabel(/business name/i).fill(`Canvas Co ${unique}`)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/home/)
  await page.goto('/landing-pages')
  await page.getByRole('link', { name: 'Edit' }).click()
  await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
}

test.describe('page editor canvas', () => {
  test('edit headline, add phone, switch layout, publish — never visit /forms/new', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000)
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await registerAndOpenHome(page)

    await expect(page).not.toHaveURL(/\/forms/)
    await expect(page.getByLabel('Theme')).toBeVisible()
    await expect(page.getByLabel('Accent')).toHaveCount(0)
    await expect(page.getByLabel('presetId')).toHaveCount(0)
    await expect(page.getByLabel('Headline', { exact: true })).toBeVisible()
    await page.getByLabel('Headline', { exact: true }).fill('Canvas Verified Headline')
    await expect(page.getByLabel('Headline', { exact: true })).toHaveValue(
      'Canvas Verified Headline',
    )

    const fieldCount = await page.getByLabel('Label', { exact: true }).count()
    await page.getByRole('button', { name: /add field/i }).click()
    await expect(page.getByLabel('Label', { exact: true })).toHaveCount(fieldCount + 1)
    await page.getByLabel('Label', { exact: true }).nth(fieldCount).fill('Phone')
    await page.getByLabel('Type', { exact: true }).nth(fieldCount).selectOption('PHONE')

    const layout = page.getByLabel('Layout')
    await layout.selectOption({ label: 'Email capture' })
    await expect(page.getByLabel('Headline', { exact: true })).toHaveCount(0)
    await page.getByLabel('Pitch').fill('Canvas Verified Pitch')
    await expect(page.getByLabel('Pitch')).toHaveValue('Canvas Verified Pitch')
    await expect(page.getByLabel('Phone')).toBeVisible()
    await expect(page.getByRole('button', { name: /save draft/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /preview/i })).toBeVisible()
    await expect(page.getByText(/Saving/)).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /preview/i })).toBeEnabled()
    await expect(page.getByText(/^Live at /)).toBeVisible()

    const lpId = page.url().split('/landing-pages/')[1]!
    const detail = await page.request.get(`${apiOrigin}/landing-pages/${lpId}`)
    expect(detail.ok()).toBeTruthy()
    const { slug } = (await detail.json()).data as { slug: string }

    const draftPreview = await page.request.get(`${apiOrigin}/landing-pages/${lpId}/preview`)
    expect(draftPreview.status()).toBe(200)
    expect(await draftPreview.text()).toContain('Canvas Verified Pitch')

    const anonPreview = await request.get(`${apiOrigin}/landing-pages/${lpId}/preview`)
    expect(anonPreview.status()).toBe(401)

    const liveBefore = await page.request.get(`${apiOrigin}/p/${slug}`)
    expect(liveBefore.status()).toBe(200)
    expect(await liveBefore.text()).not.toContain('Canvas Verified Pitch')

    const published = page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/publish') && res.ok(),
    )
    await page.getByRole('button', { name: /^publish$/i }).click()
    await published

    const hostedHref = await page.locator('a[href*="/p/"]').first().getAttribute('href')
    expect(hostedHref).toBeTruthy()
    const hostedPath = new URL(hostedHref!, apiOrigin).pathname
    const hostedResp = await page.request.get(`${apiOrigin}${hostedPath}`)
    expect(hostedResp.status()).toBe(200)
    const html = await hostedResp.text()
    expect(html).toContain('Canvas Verified Pitch')
    expect(html).toContain('class="lp-split"')
    expect(html).not.toContain('class="lp-section lp-hero"')
    expect(html).toContain('name="phone"')
    await expect(page.getByText(/^Live at /)).toBeVisible()

    await page.getByLabel('Pitch').fill('Unpublished draft pitch')
    await expect(page.getByText(/Saving/)).toBeVisible()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    const laterPreview = await page.request.get(`${apiOrigin}/landing-pages/${lpId}/preview`)
    expect(await laterPreview.text()).toContain('Unpublished draft pitch')
    const laterLive = await page.request.get(`${apiOrigin}${hostedPath}`)
    expect(await laterLive.text()).toContain('Canvas Verified Pitch')
    expect(await laterLive.text()).not.toContain('Unpublished draft pitch')

    expect(page.url()).not.toContain('/forms/new')
  })
})
