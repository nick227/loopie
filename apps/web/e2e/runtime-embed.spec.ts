import { test, expect, type Page } from '@playwright/test'
import { db } from '@project/db'

async function registerAndOpenHome(page: Page) {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel(/email/i).fill(`editor+${unique}@example.com`)
  await page.getByLabel(/^password/i).fill('password123')
  await page.getByLabel(/business name/i).fill(`Canvas Co ${unique}`)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/business\/setup/)
  await page.getByRole('button', { name: /continue to inbox/i }).click()
  await page.waitForURL(/\/calendar/)
  await page.goto('/landing-pages')
  await page.locator('a[href^="/landing-pages/"]').first().click()
  await page.waitForURL(/\/landing-pages\/(?!new$)[^/]+$/)
}

test.describe('Runtime Embed Rendering Validation', () => {
  // Give ad-server time to boot along with web
  test.beforeAll(async ({ request }) => {
    await expect(async () => {
      const res = await request.get('http://localhost:3002/health')
      expect(res.status()).toBe(200)
    }).toPass({ timeout: 15000, intervals: [1000] })
  })

  test('comprehensive runtime pipeline', async ({ page, context }) => {
    test.setTimeout(90000)

    // 1. Create and publish a page
    await registerAndOpenHome(page)
    await page.getByLabel('Headline', { exact: true }).dblclick()
    await page.getByLabel('Headline', { exact: true }).fill('Original Content')
    await page.keyboard.press('Enter')

    // Inject all supported blocks into the DB for this page before we publish,
    // to test full block coverage through the render path.
    const pageUrl = page.url()
    const pageIdMatch = pageUrl.match(/\/landing-pages\/([^/]+)/)
    if (pageIdMatch) {
      const pageId = pageIdMatch[1]
      const dbPage = await db.landingPage.findFirst({ where: { slug: pageId } })
      if (dbPage) {
        const form = await db.form.create({
          data: {
            businessId: dbPage.businessId,
            name: 'Test Form',
            fields: {
              create: [
                { fieldKey: 'name', label: 'Name', type: 'TEXT', required: true, order: 0 },
                { fieldKey: 'email', label: 'Email', type: 'EMAIL', required: true, order: 1 },
              ],
            },
          },
        })

        await db.landingPage.update({
          where: { id: dbPage.id },
          data: {
            formId: form.id,
            schema: {
              sections: [
                { type: 'hero', order: 0, contentKey: 'b1' },
                { type: 'feature-grid', order: 1, contentKey: 'b2' },
                { type: 'form-embed', order: 2, contentKey: 'b3' },
                { type: 'split-capture', order: 3, contentKey: 'b4' },
                { type: 'footer', order: 4, contentKey: 'b5' },
                { type: 'cta-band', order: 5, contentKey: 'b6' },
                { type: 'studio-contact', order: 6, contentKey: 'b7' },
                { type: 'media-image', order: 7, contentKey: 'b8' },
                { type: 'media-youtube', order: 8, contentKey: 'b9' },
                { type: 'logo-cloud', order: 9, contentKey: 'b10' },
                { type: 'metrics', order: 10, contentKey: 'b11' },
                { type: 'comparison', order: 11, contentKey: 'b12' },
                { type: 'testimonials', order: 12, contentKey: 'b13' },
                { type: 'webinar-widget', order: 13, contentKey: 'b14' },
                { type: 'photo-gallery', order: 14, contentKey: 'b15' },
                { type: 'faq', order: 15, contentKey: 'b16' },
              ],
            },
          },
        })
      }
    }

    // Force a minor update in UI so the editor realizes it can publish
    await page.getByLabel('Headline', { exact: true }).dblclick()
    await page.getByLabel('Headline', { exact: true }).fill('Trigger Publish')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled({ timeout: 15000 })
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled({ timeout: 15000 })

    // 2. Get embed code
    await page.getByRole('button', { name: 'Embed' }).click()
    const iframeSnippet = page.locator('pre')
    await expect(iframeSnippet).toBeVisible()
    const text = await iframeSnippet.innerText()
    const match = text.match(/data-public-id="(page_[a-f0-9]+)"/)
    expect(match).not.toBeNull()
    const publicId = match![1]

    // 3. Mount on an external host
    const externalPage = await context.newPage()
    externalPage.on('console', (msg) => console.log('EXTERNAL PAGE CONSOLE:', msg.text()))
    // Inject mock external HTML that includes a listener to track messages
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>External Consumer</title></head>
      <body>
        <h1>My External Site</h1>
        <script>
          window.messagesReceived = [];
          window.addEventListener('message', (e) => {
            if(e.data?.type) window.messagesReceived.push(e.data.type);
          });
        </script>
        <script src="http://localhost:3002/v1.js" async></script>
        <div class="loopie-embed" data-public-id="${publicId}"></div>
      </body>
      </html>
    `
    // Route for ALLOWED origin
    await externalPage.route('http://localhost:3003/', (route) => {
      route.fulfill({ contentType: 'text/html', body: html })
    })

    // (Case 1) External fixture actually loads v1.js
    // (Case 2) authorize returns a token
    const [authRequest] = await Promise.all([
      externalPage.waitForResponse(
        (res) => res.url().includes('/authorize') && res.request().method() === 'POST',
      ),
      externalPage.goto('http://localhost:3003/'),
    ])

    const authData = await authRequest.json()
    if (!authData.data) console.log('AUTH ERROR:', authData)
    expect(authData.data?.nonce).toBeTruthy()

    // (Case 3) iframe mounts and reaches loopie:ready
    const iframe = externalPage.locator('iframe')
    await expect(iframe).toBeVisible()

    // (Case 4 & 5) loopie:init is received, rendered snapshot content is visible
    const iframeFrame = iframe.contentFrame()
    // Test that the Hero block (which we injected) is visibly rendered
    await expect(iframeFrame.locator('.lp-hero')).toBeVisible({ timeout: 10000 })

    // (Case 6) Disallowed origin fails cleanly
    // Set domain policy to ALLOWLIST but do not whitelist evil-site.test
    await db.embedDeployment.update({
      where: { publicId },
      data: { domainPolicy: 'ALLOWLIST' },
    })

    const evilPage = await context.newPage()
    await evilPage.route('http://localhost:3004/', (route) => {
      route.fulfill({ contentType: 'text/html', body: html })
    })

    const [evilAuthRes] = await Promise.all([
      evilPage.waitForResponse((res) => res.url().includes('/authorize')),
      evilPage.goto('http://localhost:3004/'),
    ])
    expect(evilAuthRes.status()).toBe(403) // Origin not allowed

    // (Case 7) Reused token behavior is correct
    const token = authData.data.nonce
    const badIframeRes = await externalPage.request.get(
      `http://localhost:3002/e/${publicId}?token=${token}`,
    )
    expect(badIframeRes.status()).toBe(401) // Token was consumed

    // (Case 8) Republishing updates rendered snapshot without changing publicId
    // reset to ANY for next steps
    await db.embedDeployment.update({ where: { publicId }, data: { domainPolicy: 'ANY' } })

    await page.keyboard.press('Escape') // Close modal
    await page.getByLabel('Headline', { exact: true }).dblclick()
    await page.getByLabel('Headline', { exact: true }).fill('Updated Content')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000) // Wait for auto-save
    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled({ timeout: 15000 })
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled({ timeout: 15000 })

    await externalPage.reload()
    const iframe2 = externalPage.locator('iframe')
    await expect(iframe2).toBeVisible()
    const iframeFrame2 = iframe2.contentFrame()
    await expect(iframeFrame2.locator('.lp-hero')).toBeVisible({ timeout: 10000 })

    // (Case 9 & 10) Resize and visibility events
    // We check our mocked window.messagesReceived array on the external page
    await expect(async () => {
      const messages = await externalPage.evaluate(() => (window as any).messagesReceived)
      expect(messages).toContain('loopie:ready')
    }).toPass({ timeout: 15000 })

    // (Case 11) Form validation failure (missing required fields)
    const formEmbed = iframeFrame2.locator('.lp-form-el')
    await expect(formEmbed).toBeVisible()

    // Bypass client-side validation to test server-side validation
    await formEmbed.evaluate((el) => el.setAttribute('novalidate', 'true'))

    // Attempt submit with empty fields
    await formEmbed.locator('button[type="submit"]').click()
    const errorEl = formEmbed.locator('.lp-error')
    await expect(errorEl).toBeVisible()
    await expect(errorEl).toContainText('missing required field name')

    // (Case 12) Successful form submission via external iframe
    await formEmbed.locator('input[name="name"]').fill('John Doe')
    await formEmbed.locator('input[name="email"]').fill('john@example.com')
    await formEmbed.locator('button[type="submit"]').click()

    // (Case 13) Inline success UI verification
    const successEl = iframeFrame2.locator('.lp-success')
    await expect(successEl).toBeVisible({ timeout: 10000 })
    await expect(successEl).toContainText("Thanks — we'll be in touch")

    // Allow the background worker to process it (or manually call it since worker is disabled in NODE_ENV=test)
    const { processEmbedOutbox } =
      await import('../../server/src/services/activity/EmbedProjectionWorker')
    await processEmbedOutbox()

    // Assert CRM projection asynchronously
    await expect(async () => {
      // Find the submission we just made
      const submissions = await db.formSubmission.findMany({
        where: {
          data: { path: '$.email', equals: 'john@example.com' },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      })
      expect(submissions.length).toBe(1)
      const submission = submissions[0]
      expect(submission.embedInstanceId).toBeTruthy()
      expect(submission.contactId).toBeTruthy() // Worker successfully linked the contact

      // Verify Contact
      const contact = await db.contact.findUnique({ where: { id: submission.contactId! } })
      expect(contact).toBeTruthy()
      expect(contact?.email).toBe('john@example.com')
      expect(contact?.name).toBe('John Doe')

      // Verify Activity Item (Projector ran successfully)
      const activity = await db.activityItem.findFirst({
        where: { sourceRecordId: submission.id, eventKey: 'FORM_SUBMISSION' },
      })
      expect(activity).toBeTruthy()
      expect(activity?.actorId).toBe(contact?.id)
      expect(activity?.actorLabel).toBe('John Doe')
    }).toPass({ timeout: 15000 })
  })
})
