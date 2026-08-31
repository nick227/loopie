// Live Presence + weekly Results deltas (2026-08-30) — the two genuinely new backend pieces built
// for the persistent-top-nav redesign's shared WelcomeSection (docs/strategy/03-product-
// principles.md). Both explicitly avoid fabricating numbers the app can't back — see
// livePresence.ts's own comment and the null-delta assertion below.
import { describe, it, expect } from 'vitest'
import { db } from '@project/db'
import { asAuth, buildTestApp, testBusinessId, testUserId, validateResponse } from './helpers'

const app = buildTestApp()

function mondayStart(d: Date): Date {
  const day = d.getUTCDay() // 0=Sun..6=Sat
  const mondayOffset = (day + 6) % 7
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset))
}

// Mirrors homeOverview.ts's localWeek() boundary math exactly (offsetMinutes=0, matching this
// suite's own `utcOffsetMinutes=0` requests) so these fixture timestamps land unambiguously in
// the correct this-week/last-week bucket regardless of which real calendar day the suite runs on.
const thisWeekStart = mondayStart(new Date())
const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
const thisWeekAt = new Date(thisWeekStart.getTime() + 25 * 60 * 60 * 1000) // safely inside this week
const lastWeekAt = new Date(lastWeekStart.getTime() + 25 * 60 * 60 * 1000) // safely inside last week

async function createTemplate() {
  return db.landingPageTemplate.create({
    data: {
      name: 'Live Presence Template',
      isSystem: true,
      schema: {
        sections: [{ key: 'form', type: 'form-embed', order: 0, hideable: false, editable: [] }],
        themeTokens: [],
      },
    },
  })
}

describe('Live Presence', () => {
  it('unions a published Page, a running Ad, and a sent Message with real backed stats', async () => {
    const template = await createTemplate()
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: { templateId: template.id, name: 'Live Page', slug: `live-page-${Date.now()}` },
    })
    expect(pageRes.statusCode).toBe(201)
    const page = pageRes.json().data
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    await db.pageView.createMany({
      data: [{ landingPageId: page.id }, { landingPageId: page.id }, { landingPageId: page.id }],
    })

    const ad = await db.advertisement.create({
      data: { businessId: testBusinessId, name: 'Live Ad' },
    })
    await db.adRun.create({
      data: {
        advertisementId: ad.id,
        platform: 'META',
        status: 'ACTIVE',
        impressions: 400,
        conversions: 12,
      },
    })

    const audience = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Live Presence Audience', type: 'MANUAL_LIST' },
    })
    const message = await db.message.create({
      data: {
        businessId: testBusinessId,
        channel: 'EMAIL',
        subject: 'Live Message',
        body: 'hi',
        audienceId: audience.id,
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/home?utcOffsetMinutes=0',
      headers: asAuth(testUserId),
    })
    expect(response.statusCode).toBe(200)
    await validateResponse('getHomeSummary', 200, response.json())

    const items = response.json().data.livePresence as {
      type: string
      id: string
      title: string
      statusLabel: string
      thumbnailUrl: string | null
      stat1: { value: number; label: string }
      stat2: { value: number; label: string }
    }[]

    const pageItem = items.find((i) => i.type === 'PAGE' && i.id === page.id)
    expect(pageItem).toMatchObject({
      title: 'Live Page',
      statusLabel: 'Live',
      stat1: { value: 3, label: 'visits' },
      stat2: { value: 0, label: 'submissions' },
    })

    const adItem = items.find((i) => i.type === 'AD' && i.id === ad.id)
    expect(adItem).toMatchObject({
      title: 'Live Ad',
      statusLabel: 'Running',
      thumbnailUrl: null, // no IMAGE asset attached — never fabricates a thumbnail
      stat1: { value: 400, label: 'impressions' },
      stat2: { value: 12, label: 'leads' },
    })

    const messageItem = items.find((i) => i.type === 'MESSAGE' && i.id === message.id)
    expect(messageItem).toMatchObject({
      title: 'Live Message',
      statusLabel: 'Sent',
      thumbnailUrl: null,
      // No open-rate/engagement number — that tracking doesn't exist in this app. Real signals
      // only: current audience size and real leads sourced from this message.
      stat2: { value: 0, label: 'leads' },
    })
    expect(messageItem?.stat1.label).toBe('in audience')
  })
})

describe('Weekly Results deltas', () => {
  it('computes real week-over-week percent change for leads, customers, and revenue', async () => {
    const [contactThisWeek, contactLastWeekOnly] = await Promise.all([
      db.contact.create({ data: { businessId: testBusinessId, name: 'This Week Contact' } }),
      db.contact.create({ data: { businessId: testBusinessId, name: 'Last Week Contact' } }),
    ])

    // Leads: 2 this week, 1 last week -> +100%.
    await Promise.all([
      db.lead.create({
        data: {
          businessId: testBusinessId,
          contactId: contactThisWeek.id,
          sourceType: 'MANUAL',
          stage: 'NEW',
          openSlot: 'OPEN',
          openedAt: thisWeekAt,
          createdAt: thisWeekAt,
        },
      }),
      db.lead.create({
        data: {
          businessId: testBusinessId,
          contactId: contactThisWeek.id,
          sourceType: 'MANUAL',
          stage: 'NEW',
          openSlot: null,
          openedAt: thisWeekAt,
          createdAt: thisWeekAt,
        },
      }),
      db.lead.create({
        data: {
          businessId: testBusinessId,
          contactId: contactLastWeekOnly.id,
          sourceType: 'MANUAL',
          stage: 'NEW',
          openSlot: null,
          openedAt: lastWeekAt,
          createdAt: lastWeekAt,
        },
      }),
    ])

    // Revenue: $100 this week (1 distinct customer), $50 last week (a different customer) -> +100%
    // for both revenue and customers.
    await Promise.all([
      db.sale.create({
        data: {
          businessId: testBusinessId,
          contactId: contactThisWeek.id,
          amount: 100,
          date: thisWeekAt,
          sourceType: 'MANUAL',
          idempotencyKey: 'weekly-this-1',
        },
      }),
      db.sale.create({
        data: {
          businessId: testBusinessId,
          contactId: contactLastWeekOnly.id,
          amount: 50,
          date: lastWeekAt,
          sourceType: 'MANUAL',
          idempotencyKey: 'weekly-last-1',
        },
      }),
    ])

    const response = await app.inject({
      method: 'GET',
      url: '/home?utcOffsetMinutes=0',
      headers: asAuth(testUserId),
    })
    expect(response.statusCode).toBe(200)
    await validateResponse('getHomeSummary', 200, response.json())

    const weeklyResults = response.json().data.weeklyResults
    expect(weeklyResults).toEqual({
      leads: { value: 2, previousValue: 1, deltaPct: 100 },
      customers: { value: 1, previousValue: 1, deltaPct: 0 },
      revenue: { value: 100, previousValue: 50, deltaPct: 100 },
      messagesSent: { value: 0, previousValue: 0, deltaPct: null },
    })
  })

  it('reports a null delta, never a fabricated percentage, with no prior-week baseline', async () => {
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Only This Week' },
    })
    await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'MANUAL',
        stage: 'NEW',
        openSlot: 'OPEN',
        openedAt: thisWeekAt,
        createdAt: thisWeekAt,
      },
    })
    await db.sale.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        amount: 250,
        date: thisWeekAt,
        sourceType: 'MANUAL',
        idempotencyKey: 'weekly-new-1',
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/home?utcOffsetMinutes=0',
      headers: asAuth(testUserId),
    })
    expect(response.statusCode).toBe(200)
    await validateResponse('getHomeSummary', 200, response.json())

    const weeklyResults = response.json().data.weeklyResults
    expect(weeklyResults).toEqual({
      leads: { value: 1, previousValue: 0, deltaPct: null },
      customers: { value: 1, previousValue: 0, deltaPct: null },
      revenue: { value: 250, previousValue: 0, deltaPct: null },
      messagesSent: { value: 0, previousValue: 0, deltaPct: null },
    })
  })
})
