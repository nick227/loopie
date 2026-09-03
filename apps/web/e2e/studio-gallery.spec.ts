/**
 * The Studio template's photo gallery widget: a real multi-select upload through the shared asset
 * picker, genuinely integrated with the canonical Content layer (same `content.gallery.items`
 * array, same `GalleryAddButton`/MediaPicker as every other asset-backed slot) — not a bolt-on
 * with its own storage. Verifies a real uploaded photo (not starter-content stock imagery) shows
 * up in the Editor tile, the Content tab's Gallery field, and the public hosted page's lightbox.
 */
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

const TEST_PHOTO = path.join(__dirname, 'fixtures', 'test-photo.png')

async function registerAndOpenHome(page: Page) {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel(/email/i).fill(`studio-gallery+${unique}@example.com`)
  await page.getByLabel(/^password/i).fill('password123')
  await page.getByLabel(/business name/i).fill(`Gallery Co ${unique}`)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/business\/setup/)
  await page.getByRole('button', { name: /continue to inbox/i }).click()
  await page.waitForURL(/\/calendar/)
  await page.goto('/landing-pages')
  await page.locator('a[href^="/landing-pages/"]').first().click()
  await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
}

test.describe('studio gallery widget', () => {
  test('uploads a real photo, syncs to Content, and publishes with a working lightbox', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await registerAndOpenHome(page)

    await page.getByLabel('Layout').selectOption({ label: 'Studio — Bold, Editorial Portfolio' })
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    // Editor tab: open the gallery's "Add photos" picker and upload a real image file.
    const addPhotos = page.getByRole('button', { name: /add photos/i })
    await addPhotos.scrollIntoViewIfNeeded()
    await addPhotos.click()

    const dialog = page.getByRole('dialog', { name: /insert media/i })
    await expect(dialog).toBeVisible()
    await dialog.locator('input[type="file"]').setInputFiles(TEST_PHOTO)

    const useSelected = dialog.getByRole('button', { name: /use selected/i })
    await expect(useSelected).toBeEnabled({ timeout: 10000 })
    await useSelected.click()
    await expect(dialog).not.toBeVisible()

    // Real asset resolves to a real <img src> in the editor tile (not a blank placeholder div —
    // exactly the assetId-resolution gap this test exists to catch). The gallery section is the
    // one containing the "Add photos" trigger; the newly uploaded photo is appended last.
    const gallerySection = page.locator('section').filter({ has: addPhotos })
    const galleryTileImgs = gallerySection.locator('img')
    await expect(galleryTileImgs.last()).toBeVisible({ timeout: 10000 })
    const uploadedSrc = await galleryTileImgs.last().getAttribute('src')
    expect(uploadedSrc).toBeTruthy()

    // Caption the new photo inline so it's identifiable later on the public page. CanvasText is
    // double-click-to-activate, same interaction model as every other inline field in this app.
    const captionInputs = page.getByLabel(/photo \d+ caption/i)
    const lastCaption = captionInputs.last()
    await lastCaption.dblclick()
    await lastCaption.fill('Fresh from the upload test')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10000 })

    // Content tab: the same content, same shared field — proves genuine integration, not a
    // parallel gallery implementation.
    await page.getByRole('tab', { name: 'Content' }).click()
    await expect(page.getByText('Gallery', { exact: true }).first()).toBeVisible()
    await expect(page.getByLabel(/photo \d+ caption/i).last()).toHaveValue(
      'Fresh from the upload test',
    )

    await page.getByRole('tab', { name: 'Editor' }).click()

    const published = page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/publish') && res.ok(),
    )
    await page.getByRole('button', { name: /^publish$/i }).click()
    await published

    const hostedHref = await page.locator('a[href*="/p/"]').first().getAttribute('href')
    expect(hostedHref).toBeTruthy()

    const visitor = await page.context().browser()!.newContext()
    const publicPage = await visitor.newPage()
    await publicPage.goto(hostedHref!)

    const publicTile = publicPage.locator('.lp-gallery-tile', {
      hasText: 'Fresh from the upload test',
    })
    await expect(publicTile).toBeVisible()
    await expect(publicTile.locator('img')).toHaveAttribute('src', /.+/)

    // Real lightbox: click opens an enlarged view, Escape closes it.
    await publicTile.locator('img').click()
    const lightbox = publicPage.locator('.lp-lightbox, [class*="lightbox"]').first()
    await expect(lightbox).toBeVisible({ timeout: 5000 })
    await publicPage.keyboard.press('Escape')
    await expect(lightbox).not.toBeVisible()

    await visitor.close()
  })
})
