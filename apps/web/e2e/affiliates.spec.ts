import { test, expect, type Page } from '@playwright/test'

const API = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
}

test.describe('affiliate portal', () => {
  test('admin creates affiliate login, sale pays frozen net, manager assigns a cheaper deal', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => dialog.accept())
    const stamp = Date.now()
    await loginAs(page, 'demo@loopie.app', 'password123')
    await page.waitForURL(/\/calendar/)
    await expect(page.getByRole('link', { name: 'Affiliates' })).toBeVisible()
    await page.getByRole('link', { name: 'Affiliates' }).click()
    await page.waitForURL(/\/affiliates/)
    await page.goto('/affiliates/new')
    await expect(page.getByText('Destination landing page')).toBeVisible()
    await expect(page.getByText(/Past referrals stay attributed/)).toBeVisible()
    await page.goto('/affiliates/classes')
    await expect(page.getByText(/Named packages/)).toBeVisible()

    const classRes = await page.request.post(`${API}/affiliate-classes`, {
      data: { name: `E2E Class ${stamp}`, maxAffiliateRateBps: 5000, maxManagerShareBps: 5000 },
    })
    expect(classRes.status()).toBe(201)
    const classId = (await classRes.json()).data.id as string

    const dealRes = await page.request.post(`${API}/affiliate-deals`, {
      data: { name: `E2E 10 ${stamp}`, classId, affiliateRateBps: 1000, managerShareBps: 0 },
    })
    expect(dealRes.status()).toBe(201)
    const dealId = (await dealRes.json()).data.id as string
    await page.request.patch(`${API}/affiliate-classes/${classId}`, {
      data: { defaultDealId: dealId },
    })

    const cheapRes = await page.request.post(`${API}/affiliate-deals`, {
      data: { name: `E2E 5 ${stamp}`, classId, affiliateRateBps: 500, managerShareBps: 0 },
    })
    expect(cheapRes.status()).toBe(201)
    const cheapDealId = (await cheapRes.json()).data.id as string
    const cheapDealName = `E2E 5 ${stamp}`

    const pages = await (await page.request.get(`${API}/landing-pages`)).json()
    const published = pages.data.find((item: { status: string }) => item.status === 'PUBLISHED')
    expect(published).toBeTruthy()

    const repEmail = `rep-${stamp}@example.com`
    const managerEmail = `mgr-${stamp}@example.com`
    const repRes = await page.request.post(`${API}/affiliates`, {
      data: {
        name: `E2E Rep ${stamp}`,
        classId,
        dealId,
        email: repEmail,
        createLogin: true,
        destinationLandingPageId: published.id,
      },
    })
    expect(repRes.status()).toBe(201)
    const rep = (await repRes.json()).data

    const managerRes = await page.request.post(`${API}/affiliates`, {
      data: {
        name: `E2E Manager ${stamp}`,
        classId,
        dealId,
        email: managerEmail,
        createLogin: true,
      },
    })
    expect(managerRes.status()).toBe(201)
    const manager = (await managerRes.json()).data

    const downlineRes = await page.request.post(`${API}/affiliates`, {
      data: { name: `E2E Downline ${stamp}`, classId, dealId, managerId: manager.id },
    })
    expect(downlineRes.status()).toBe(201)

    const click = await page.request.get(`${API}/r/affiliate/${rep.id}`, { maxRedirects: 0 })
    expect(click.status()).toBe(302)
    const location = click.headers()['location']!
    expect(location).toContain(`/p/${published.slug}`)
    const sid = new URL(location).searchParams.get('sid')
    expect(sid).toBeTruthy()

    const submit = await page.request.post(`${API}/landing-pages/${published.id}/submissions`, {
      data: {
        sessionId: sid,
        data: { name: `E2E Buyer ${stamp}`, email: `buyer-${stamp}@example.com` },
      },
    })
    expect(submit.status()).toBe(201)
    const submitted = (await submit.json()).data

    const sale = await page.request.post(`${API}/sales`, {
      data: {
        contactId: submitted.contactId,
        leadId: submitted.leadId,
        amount: 500,
        date: new Date().toISOString(),
      },
    })
    expect(sale.status()).toBe(201)

    await page.goto('/affiliates/payouts')
    const owed = page
      .getByRole('link', { name: `E2E Rep ${stamp}` })
      .locator('xpath=following-sibling::p')
    await expect(owed).toHaveText(/\$50\.00 pending/)

    await page.getByRole('button', { name: /log out/i }).click()
    await loginAs(page, repEmail, rep.initialPassword)
    await page.waitForURL(/\/portal/)
    await expect(page.getByText(/your deal/i)).toBeVisible()
    await expect(page.getByText(/10%/)).toBeVisible()
    await expect(page.getByText(/Pending \$50\.00/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Campaigns' })).toHaveCount(0)

    await page.getByRole('button', { name: /log out/i }).click()
    await loginAs(page, managerEmail, manager.initialPassword)
    await page.waitForURL(/\/portal/)
    await page.getByRole('link', { name: 'Team' }).click()
    await page.waitForURL(/\/portal\/team/)
    await expect(page.getByText(`E2E Downline ${stamp}`)).toBeVisible()
    await page.locator('select').selectOption({ label: cheapDealName })
    await expect(page.getByText('5%')).toBeVisible()
    expect(cheapDealId).toBeTruthy()
  })
})
