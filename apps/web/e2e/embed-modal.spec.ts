import { test, expect, type Page } from '@playwright/test'

async function registerAndOpenHome(page: Page) {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel(/email/i).fill(`editor+${unique}@example.com`)
  await page.getByLabel(/^password/i).fill('password123')
  await page.getByLabel(/business name/i).fill(`Canvas Co ${unique}`)
  await page.getByRole('button', { name: /create account/i }).click()
  // A brand-new business hasn't saved its identity yet, so First-Login lands on the one-calm-
  // screen setup before Inbox
  await page.waitForURL(/\/business\/setup/)
  await page.getByRole('button', { name: /continue to inbox/i }).click()
  await page.waitForURL(/\/calendar/)
  await page.goto('/landing-pages')
  // Collection rows are the entire clickable link (UniversalRow)
  await page.locator('a[href^="/landing-pages/"]').first().click()
  await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
}

test.describe('Embed Modal Integration', () => {
  test('unpublished object -> explicit publish-first state -> no embed code', async ({ page }) => {
    await registerAndOpenHome(page)

    // Go back to the list view to create a new page
    await page.goto('/landing-pages')

    // Create a new page so it's guaranteed to be an unpublished draft
    await page.getByRole('button', { name: /New Page/i }).click()
    // Select blank template
    await page.getByRole('button', { name: /Blank/i }).click()
    await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)

    // Page is unpublished initially. Open embed modal.
    await page.getByRole('button', { name: 'Embed' }).click()

    // Should see error state explicitly asking to publish
    await expect(page.getByText('Publish this page before embedding it.')).toBeVisible()
    await expect(page.locator('pre')).not.toBeVisible()

    // Close modal
    await page.getByRole('button', { name: 'Close' }).click()
  })

  test('published object -> creates deployment -> consistent publicId', async ({ page }) => {
    await registerAndOpenHome(page)

    // The default home page is already published. Let's make an edit so we can publish it.
    await page.getByLabel('Headline', { exact: true }).dblclick()
    await page.getByLabel('Headline', { exact: true }).fill('Edited Headline')
    await page.keyboard.press('Enter')

    // Wait for the save to complete and publish to become enabled
    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled()

    // Publish the page
    await page.getByRole('button', { name: 'Publish' }).click()
    // Wait for publish to complete (button becomes disabled since there are no unpublished changes)
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled({ timeout: 15000 })

    // Open embed modal
    await page.getByRole('button', { name: 'Embed' }).click()

    // It should load and then show the iframe snippet
    const iframeSnippet = page.locator('pre')
    await expect(iframeSnippet).toBeVisible({ timeout: 10000 })

    const text = await iframeSnippet.innerText()
    expect(text).toContain('<iframe')
    expect(text).toContain('src="https://ad.loopie.up/v1/embed/page_')

    // Extract the publicId
    const match = text.match(/embed\/(page_[a-f0-9]+)/)
    expect(match).not.toBeNull()
    const publicId = match![1]

    // Close and reopen
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()

    // Ensure modal is closed before reopening
    await expect(page.getByText('Publish this page before embedding it.')).not.toBeVisible()

    await page.getByRole('button', { name: 'Embed' }).click()

    // Verify it's the exact same publicId, proving idempotency
    await expect(iframeSnippet).toBeVisible({ timeout: 10000 })
    const text2 = await iframeSnippet.innerText()
    expect(text2).toContain(publicId)
  })
})
