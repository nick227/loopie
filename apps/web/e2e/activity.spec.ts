import { test, expect } from '@playwright/test'
import { db } from '@project/db'

const DEMO_EMAIL = 'demo@loopie.app'
const DEMO_PASSWORD = 'password123'
const API_URL = 'http://127.0.0.1:3001'

test.describe('Activity Command Center', () => {
  let businessId: string
  let authCookie: string

  test.beforeEach(async ({ page, request }) => {
    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    })
    expect(loginRes.ok()).toBeTruthy()
    authCookie = loginRes.headers()['set-cookie']!

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(DEMO_EMAIL)
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD)
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    await page.waitForURL(/\/calendar/)

    const user = await db.user.findUnique({ where: { email: DEMO_EMAIL } })
    businessId = user!.businessId
  })

  test('E2E validation of activity flows', async ({ page, request }) => {
    const leadId = `lead-${Date.now()}`
    const leadActivityId = `act-lead-${Date.now()}`
    await db.activityItem.create({
      data: {
        id: leadActivityId,
        businessId,
        sourceKind: 'LOOPIE',
        sourceRecordType: 'Lead',
        sourceRecordId: leadId,
        eventKey: 'LEAD_CREATED',
        taxonomyVersion: 'v1',
        type: 'LEAD_CREATED',
        occurredAt: new Date(),
        observedAt: new Date(),
        storyId: `lead-${leadId}`,
        sourceLabel: 'Lead Management',
        actorKind: 'CONTACT',
        actorLabel: 'Test Lead',
        attention: 'ACTION_REQUIRED',
        summary: 'New Lead: Test Lead',
        detail: 'Lead created at stage NEW',
        leadId,
        attentionItem: {
          create: {
            state: 'NEEDS_ACTION',
          },
        },
      },
    })

    const contactRes = await request.post(`${API_URL}/contacts`, {
      headers: { Cookie: authCookie },
      data: {
        name: 'Test Lead',
        email: `lead-${Date.now()}@example.com`,
        source: 'WEBSITE',
      },
    })
    expect(contactRes.ok()).toBeTruthy()
    const contactData = await contactRes.json()

    const saleRes = await request.post(`${API_URL}/sales`, {
      headers: { Cookie: authCookie },
      data: {
        contactId: contactData.data.id,
        amount: 1000,
        date: new Date().toISOString(),
        idempotencyKey: `sale-${Date.now()}`,
      },
    })
    expect(saleRes.ok()).toBeTruthy()

    const adRunId = `adrun-${Date.now()}`
    const activityId = `act-${Date.now()}`
    await db.activityItem.create({
      data: {
        id: activityId,
        businessId,
        sourceKind: 'LOOPIE',
        sourceRecordType: 'AdRun',
        sourceRecordId: adRunId,
        eventKey: 'AD_RUN_FAILED',
        taxonomyVersion: 'v1',
        type: 'AD_RUN_FAILED',
        occurredAt: new Date(),
        observedAt: new Date(),
        storyId: `adrun-${adRunId}`,
        sourceLabel: 'Ad Manager',
        actorKind: 'SYSTEM',
        actorLabel: 'System',
        attention: 'ACTION_REQUIRED',
        summary: 'AdRun failed',
        detail: 'Simulated failure for E2E',
        runId: adRunId,
        attentionItem: {
          create: {
            state: 'NEEDS_ACTION',
          },
        },
      },
    })

    await page.goto('/activity')

    await expect(page.getByText('New Lead: Test Lead')).toBeVisible()
    await expect(page.getByText('Sale')).toBeVisible()

    await page.goto('/activity?needsAction=true')
    await expect(page.getByText('AdRun failed')).toBeVisible()

    await page.getByText('AdRun failed').click()
    await page.getByRole('button', { name: 'Mark Resolved' }).click()
    await expect(page.getByText('AdRun failed')).not.toBeVisible()

    await page.goto('/activity')
    await expect(page.getByText('AdRun failed')).toBeVisible()

    const newLeadId = `lead-${Date.now()}`
    const newLeadActivityId = `act-lead-${Date.now()}`
    await db.activityItem.create({
      data: {
        id: newLeadActivityId,
        businessId,
        sourceKind: 'LOOPIE',
        sourceRecordType: 'Lead',
        sourceRecordId: newLeadId,
        eventKey: `LEAD_CREATED_${newLeadId}`,
        taxonomyVersion: 'v1',
        type: 'LEAD_CREATED',
        occurredAt: new Date(),
        observedAt: new Date(),
        storyId: `lead-${newLeadId}`,
        sourceLabel: 'Lead Management',
        actorKind: 'CONTACT',
        actorLabel: 'Another Lead',
        attention: 'ACTION_REQUIRED',
        summary: 'New Lead: Another Lead',
        detail: 'Lead created at stage NEW',
        leadId: newLeadId,
        attentionItem: {
          create: {
            state: 'NEEDS_ACTION',
          },
        },
      },
    })

    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.getByRole('button', { name: 'New updates available' })).toBeVisible({
      timeout: 5000,
    })

    await page.getByRole('button', { name: 'New updates available' }).click()
    await expect(page.getByText('New Lead: Another Lead')).toBeVisible()
  })
})
