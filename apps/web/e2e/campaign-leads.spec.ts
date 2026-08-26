/**
 * Campaign detail → Leads: campaign-scoped outcomes, click-through to Contact timeline.
 */
import { test, expect, type Page } from '@playwright/test'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'

async function loginAs(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL(/\/home/)
}

test.describe('campaign leads outcomes', () => {
  test('attributed lead appears on campaign leads and opens contact timeline', async ({ page }) => {
    const apiOrigin = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    await loginAs(page)

    const creatives = await (await page.request.get(`${apiOrigin}/creatives`)).json()
    const creativeId = creatives.data[0].id
    const landingPages = await (await page.request.get(`${apiOrigin}/landing-pages`)).json()
    const published = landingPages.data.find((item: { status: string }) => item.status === 'PUBLISHED')
    expect(published).toBeTruthy()

    const campaignName = `Leads Campaign ${Date.now()}`
    await page.goto('/campaigns/new')
    await page.locator('#field-name').fill(campaignName)
    await page.locator('#field-budget').fill('500')
    await page.locator('#field-startDate').fill(new Date().toISOString())
    await page.locator('#field-platforms').fill('META')
    await page.locator('#field-creativeIds').fill(creativeId)
    await page.getByRole('button', { name: /create campaign/i }).click()
    await page.waitForURL(/\/campaigns\/(?!new$)[^/]+$/)
    const campaignId = page.url().split('/campaigns/')[1]!

    const deployments = await (await page.request.get(`${apiOrigin}/campaigns/${campaignId}/deployments`)).json()
    const deploymentId = deployments.data[0].id as string
    await page.request.patch(`${apiOrigin}/deployments/${deploymentId}`, {
      data: { destinationLandingPageId: published.id, status: 'ACTIVE' },
    })

    const click = await page.request.get(`${apiOrigin}/r/${deploymentId}`, { maxRedirects: 0 })
    expect(click.status()).toBe(302)
    const location = click.headers()['location']
    expect(location).toBeTruthy()
    const sid = new URL(location!).searchParams.get('sid')
    expect(sid).toBeTruthy()

    const contactName = `E2E Lead ${Date.now()}`
    const submit = await page.request.post(`${apiOrigin}/landing-pages/${published.id}/submissions`, {
      data: { sessionId: sid, data: { name: contactName, email: `e2e-${Date.now()}@example.com` } },
    })
    expect(submit.status()).toBe(201)

    await page.getByRole('link', { name: 'Leads', exact: true }).click()
    await page.waitForURL(/\/leads$/)
    await expect(page.getByText(contactName)).toBeVisible()
    await expect(page.getByText(/META/)).toBeVisible()
    await expect(page.getByText('Qualified').or(page.getByText('New'))).toBeVisible()

    await page.getByText(contactName).click()
    await page.waitForURL(/\/contacts\//)
    await expect(page.getByRole('heading', { name: contactName })).toBeVisible()
    await expect(page.getByText('Timeline')).toBeVisible()
    await expect(page.getByText('Form submitted')).toBeVisible()
  })
})
