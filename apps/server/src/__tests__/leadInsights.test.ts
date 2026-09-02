// Filled-in integration test (not a generated stub) for the CRM management-insights slice —
// GET /leads/insights. See CLAUDE.md's dated entry for the full design: everything here is
// derived from Lead's own fields and the existing Interaction timeline, no new state machine.
import { describe, it, expect } from 'vitest'
import {
  buildTestApp,
  asAuth,
  testUserId,
  testBusinessId,
  testOtherBusinessId,
  testOtherUserId,
} from './helpers'
import { db } from '@project/db'

const app = buildTestApp()
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

async function seedContact(businessId = testBusinessId, name = 'Insights Contact') {
  return db.contact.create({
    data: {
      businessId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    },
  })
}

async function seedLead(
  contactId: string,
  businessId = testBusinessId,
  overrides: Partial<{
    stage: string
    openSlot: string | null
    openedAt: Date
    closedAt: Date | null
    nextActionAt: Date | null
  }> = {},
) {
  return db.lead.create({
    data: {
      businessId,
      contactId,
      sourceType: 'MANUAL',
      stage: (overrides.stage ?? 'NEW') as any,
      openSlot: overrides.openSlot === undefined ? 'OPEN' : overrides.openSlot,
      openedAt: overrides.openedAt ?? new Date(),
      closedAt: overrides.closedAt ?? null,
      nextActionAt: overrides.nextActionAt ?? null,
    },
  })
}

async function getInsights(userId = testUserId) {
  const res = await app.inject({ method: 'GET', url: '/leads/insights', headers: asAuth(userId) })
  expect(res.statusCode).toBe(200)
  return res.json().data
}

describe('lead insights: empty state', () => {
  it('returns clean zeros/nulls with no leads at all', async () => {
    const data = await getInsights()
    expect(data.totalLeads).toBe(0)
    expect(data.timeToFirstContact).toEqual({
      averageHours: null,
      medianHours: null,
      sampleSize: 0,
    })
    expect(data.contactedWithin).toEqual({ within1hPct: 0, within24hPct: 0 })
    expect(data.avgTouchesBeforeEngaged).toBeNull()
    expect(data.avgTouchesBeforeWon).toBeNull()
    expect(data.overdueFollowUpRate).toBe(0)
  })
})

describe('time to first contact', () => {
  it('computes hours from openedAt to the first outbound touch', async () => {
    const contact = await seedContact()
    const openedAt = new Date(Date.now() - 5 * DAY)
    await seedLead(contact.id, testBusinessId, { openedAt })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        type: 'EMAIL_SENT',
        occurredAt: new Date(openedAt.getTime() + 2 * HOUR),
      },
    })

    const data = await getInsights()
    expect(data.timeToFirstContact.sampleSize).toBe(1)
    expect(data.timeToFirstContact.averageHours).toBeCloseTo(2, 1)
    expect(data.timeToFirstContact.medianHours).toBeCloseTo(2, 1)
  })
})

describe('contacted within 1h / 24h', () => {
  it('counts a fast and a slow contact correctly, and excludes leads too new to judge yet', async () => {
    const openedAt = new Date(Date.now() - 5 * DAY)

    const fast = await seedContact(testBusinessId, 'Fast Contact')
    await seedLead(fast.id, testBusinessId, { openedAt })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: fast.id,
        type: 'EMAIL_SENT',
        occurredAt: new Date(openedAt.getTime() + 20 * 60 * 1000),
      },
    })

    const slow = await seedContact(testBusinessId, 'Slow Contact')
    await seedLead(slow.id, testBusinessId, { openedAt })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: slow.id,
        type: 'EMAIL_SENT',
        occurredAt: new Date(openedAt.getTime() + 30 * HOUR),
      },
    })

    // Opened 10 minutes ago, never touched — hasn't failed either window yet, must not count.
    const tooNew = await seedContact(testBusinessId, 'Too New Contact')
    await seedLead(tooNew.id, testBusinessId, { openedAt: new Date(Date.now() - 10 * 60 * 1000) })

    const data = await getInsights()
    // 2 eligible leads for 1h (fast + slow, both old enough); 1 within 1h (fast).
    expect(data.contactedWithin.within1hPct).toBeCloseTo(50, 0)
    // 2 eligible leads for 24h; 1 within 24h (fast; slow took 30h).
    expect(data.contactedWithin.within24hPct).toBeCloseTo(50, 0)
  })
})

describe('touches before ENGAGED / WON', () => {
  it('counts outbound touches strictly before the first ENGAGED status change', async () => {
    const contact = await seedContact()
    const openedAt = new Date(Date.now() - 5 * DAY)
    await seedLead(contact.id, testBusinessId, { openedAt, stage: 'ENGAGED' })

    await db.interaction.createMany({
      data: [
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'EMAIL_SENT',
          occurredAt: new Date(openedAt.getTime() + 1 * HOUR),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'CALL_LOGGED',
          occurredAt: new Date(openedAt.getTime() + 2 * HOUR),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'STATUS_CHANGE',
          occurredAt: new Date(openedAt.getTime() + 3 * HOUR),
          metadata: { stage: 'ENGAGED' },
        },
        // After the ENGAGED transition — must not count.
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'MEETING',
          occurredAt: new Date(openedAt.getTime() + 4 * HOUR),
        },
      ],
    })

    const data = await getInsights()
    expect(data.avgTouchesBeforeEngaged).toBeCloseTo(2, 5)
  })

  it('counts outbound touches up to closedAt for a WON lead, regardless of which code path won it', async () => {
    const contact = await seedContact()
    const openedAt = new Date(Date.now() - 5 * DAY)
    const closedAt = new Date(openedAt.getTime() + 3 * HOUR)
    await seedLead(contact.id, testBusinessId, { openedAt, stage: 'WON', openSlot: null, closedAt })

    await db.interaction.createMany({
      data: [
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'EMAIL_SENT',
          occurredAt: new Date(openedAt.getTime() + 1 * HOUR),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'CALL_LOGGED',
          occurredAt: new Date(openedAt.getTime() + 2 * HOUR),
        },
        // After closedAt — must not count.
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'FOLLOW_UP',
          occurredAt: new Date(closedAt.getTime() + 1 * HOUR),
        },
      ],
    })

    const data = await getInsights()
    expect(data.avgTouchesBeforeWon).toBeCloseTo(2, 5)
  })
})

describe('channel mix', () => {
  it('groups by the real channel column (Channel taxonomy), WEBINAR and EVENT counted separately, percentages sum to 100', async () => {
    const contact = await seedContact()
    await seedLead(contact.id)
    await db.interaction.createMany({
      data: [
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'EMAIL_SENT',
          channel: 'EMAIL',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'EMAIL_SENT',
          channel: 'EMAIL',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'TEXT_SENT',
          channel: 'TEXT',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'SOCIAL_POST_SENT',
          channel: 'SOCIAL',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'CALL_LOGGED',
          channel: 'CALL',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'WEBINAR',
          channel: 'WEBINAR',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'EVENT',
          channel: 'EVENT',
          occurredAt: new Date(),
        },
      ],
    })

    const data = await getInsights()
    const byChannel = Object.fromEntries(data.channelMix.map((c: any) => [c.channel, c]))
    expect(byChannel.EMAIL.count).toBe(2)
    expect(byChannel.TEXT.count).toBe(1)
    expect(byChannel.SOCIAL.count).toBe(1)
    expect(byChannel.CALL.count).toBe(1)
    expect(byChannel.WEBINAR.count).toBe(1)
    expect(byChannel.EVENT.count).toBe(1)
    expect(byChannel.MEETING.count).toBe(0)
    const totalPct = data.channelMix.reduce((sum: number, c: any) => sum + c.pct, 0)
    expect(totalPct).toBeCloseTo(100, 5)
  })
})

describe('overdue follow-up rate', () => {
  it('is the fraction of currently-open leads with a past-due next action', async () => {
    const a = await seedContact(testBusinessId, 'Overdue Lead')
    await seedLead(a.id, testBusinessId, { nextActionAt: new Date('2020-01-01') })
    const b = await seedContact(testBusinessId, 'On Track Lead')
    await seedLead(b.id, testBusinessId, { nextActionAt: new Date(Date.now() + 7 * DAY) })

    const data = await getInsights()
    expect(data.overdueFollowUpRate).toBeCloseTo(50, 0)
  })
})

describe('stage conversion', () => {
  it('reports a monotonically non-increasing funnel and excludes LOST beyond NEW', async () => {
    const stages = ['NEW', 'NEW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'WON', 'LOST']
    for (const stage of stages) {
      const c = await seedContact(testBusinessId, `Stage ${stage} ${Math.random()}`)
      await seedLead(c.id, testBusinessId, {
        stage,
        openSlot: stage === 'WON' || stage === 'LOST' ? null : 'OPEN',
      })
    }

    const data = await getInsights()
    const byStage = Object.fromEntries(
      data.stageConversion.map((s: any) => [s.stage, s.reachedCount]),
    )
    expect(data.totalLeads).toBe(7)
    expect(byStage.NEW).toBe(7) // everyone was NEW once, including the LOST one
    expect(byStage.CONTACTED).toBe(4) // CONTACTED, ENGAGED, QUALIFIED, WON — not the 2 NEW, not LOST
    expect(byStage.ENGAGED).toBe(3)
    expect(byStage.QUALIFIED).toBe(2)
    expect(byStage.WON).toBe(1)

    // Monotonically non-increasing along the funnel.
    const counts = data.stageConversion.map((s: any) => s.reachedCount)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
  })
})

describe('window isolation', () => {
  it("an older closed lead's touches do not count toward a new lead's time-to-first-contact", async () => {
    const contact = await seedContact()
    await seedLead(contact.id, testBusinessId, {
      stage: 'LOST',
      openSlot: null,
      openedAt: new Date('2026-01-01'),
      closedAt: new Date('2026-01-05'),
    })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        type: 'CALL_LOGGED',
        occurredAt: new Date('2026-01-02'),
      },
    })
    // A fresh lead, opened well after the old one closed, with no touches of its own.
    await seedLead(contact.id, testBusinessId, { openedAt: new Date(Date.now() - 10 * DAY) })

    const data = await getInsights()
    // The old LOST lead legitimately has its own valid first-touch (24h, within its own window)
    // — sampleSize is 1, not 2: the new lead must NOT also pick up that same call as if it were
    // its own first contact, which is the actual bug this test guards against.
    expect(data.timeToFirstContact.sampleSize).toBe(1)
    expect(data.timeToFirstContact.averageHours).toBeCloseTo(24, 1)
  })
})

describe('tenant isolation', () => {
  it("never mixes another business's leads into the numbers", async () => {
    const mine = await seedContact(testBusinessId)
    await seedLead(mine.id, testBusinessId)
    const theirs = await seedContact(testOtherBusinessId, 'Other Tenant')
    await seedLead(theirs.id, testOtherBusinessId, {
      stage: 'WON',
      openSlot: null,
      closedAt: new Date(),
    })
    await seedLead(theirs.id, testOtherBusinessId, {
      stage: 'WON',
      openSlot: null,
      closedAt: new Date(),
    })

    const mineData = await getInsights(testUserId)
    expect(mineData.totalLeads).toBe(1)

    const theirsData = await getInsights(testOtherUserId)
    expect(theirsData.totalLeads).toBe(2)
  })
})
