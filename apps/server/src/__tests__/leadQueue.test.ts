// Filled-in integration test (not a generated stub) for the CRM work-queue slice — GET /leads/
// queue, the "open this in the morning and work from it" landing view. See CLAUDE.md's dated
// entry for the full design: buckets are non-exclusive (a lead can be both NEW and
// NEVER_CONTACTED), OVERDUE/NEEDS_FOLLOW_UP are mutually exclusive by construction (a plan exists
// and is late, vs. no plan exists at all), and only open (not WON/LOST) leads are queue material.
import { describe, it, expect } from 'vitest'
import {
  buildTestApp,
  asAuth,
  testUserId,
  testOtherUserId,
  testBusinessId,
  testOtherBusinessId,
} from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function seedContact(businessId = testBusinessId, name = 'Queue Contact') {
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
      nextActionAt: overrides.nextActionAt ?? null,
    },
  })
}

async function getQueue() {
  const res = await app.inject({ method: 'GET', url: '/leads/queue', headers: asAuth(testUserId) })
  expect(res.statusCode).toBe(200)
  return res.json().data as any[]
}

describe('lead work queue', () => {
  it('is empty when there are no open leads', async () => {
    expect(await getQueue()).toEqual([])
  })

  it('a fresh lead is both NEW and NEVER_CONTACTED', async () => {
    const contact = await seedContact()
    const lead = await seedLead(contact.id)

    const queue = await getQueue()
    const row = queue.find((r) => r.id === lead.id)
    expect(row.buckets.sort()).toEqual(['NEVER_CONTACTED', 'NEW'])
    expect(row.contacted).toBe(false)
  })

  it('logging outbound activity drops NEVER_CONTACTED and adds NEEDS_FOLLOW_UP (no plan set)', async () => {
    const contact = await seedContact()
    const lead = await seedLead(contact.id)
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        type: 'CALL_LOGGED',
        occurredAt: new Date(),
      },
    })

    const queue = await getQueue()
    const row = queue.find((r) => r.id === lead.id)
    expect(row.contacted).toBe(true)
    expect(row.buckets).not.toContain('NEVER_CONTACTED')
    expect(row.buckets).toContain('NEEDS_FOLLOW_UP')
    expect(row.buckets).not.toContain('OVERDUE')
  })

  it('a past-due next action is OVERDUE, not NEEDS_FOLLOW_UP — the two are mutually exclusive', async () => {
    const contact = await seedContact()
    const lead = await seedLead(contact.id, testBusinessId, {
      nextActionAt: new Date('2020-01-01'), // safely in the past
    })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        type: 'EMAIL_SENT',
        occurredAt: new Date(),
      },
    })

    const queue = await getQueue()
    const row = queue.find((r) => r.id === lead.id)
    expect(row.buckets).toContain('OVERDUE')
    expect(row.buckets).not.toContain('NEEDS_FOLLOW_UP')
  })

  it('a future next action is neither OVERDUE nor NEEDS_FOLLOW_UP — there is a plan and it is not late', async () => {
    const contact = await seedContact()
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const lead = await seedLead(contact.id, testBusinessId, { nextActionAt: future })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        type: 'EMAIL_SENT',
        occurredAt: new Date(),
      },
    })

    const queue = await getQueue()
    const row = queue.find((r) => r.id === lead.id)
    expect(row.buckets).not.toContain('OVERDUE')
    expect(row.buckets).not.toContain('NEEDS_FOLLOW_UP')
  })

  it('ENGAGED stage lands in the ENGAGED bucket', async () => {
    const contact = await seedContact()
    const lead = await seedLead(contact.id, testBusinessId, { stage: 'ENGAGED' })

    const queue = await getQueue()
    const row = queue.find((r) => r.id === lead.id)
    expect(row.buckets).toContain('ENGAGED')
  })

  it('WON/LOST leads never appear in the queue', async () => {
    const contact = await seedContact()
    const wonLead = await seedLead(contact.id, testBusinessId, { stage: 'WON', openSlot: null })

    const queue = await getQueue()
    expect(queue.some((r) => r.id === wonLead.id)).toBe(false)
  })

  it("an older closed lead's activity does not leak into a new open lead's contacted status", async () => {
    const contact = await seedContact()
    await seedLead(contact.id, testBusinessId, {
      stage: 'LOST',
      openSlot: null,
      openedAt: new Date('2026-01-01'),
    })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        type: 'CALL_LOGGED',
        occurredAt: new Date('2026-01-02'), // only within the OLD lead's window
      },
    })
    const newLead = await seedLead(contact.id, testBusinessId, { openedAt: new Date('2026-06-01') })

    const queue = await getQueue()
    const row = queue.find((r) => r.id === newLead.id)
    expect(row.contacted).toBe(false)
    expect(row.buckets).toContain('NEVER_CONTACTED')
  })

  it("never leaks another tenant's leads", async () => {
    const myContact = await seedContact(testBusinessId)
    const mine = await seedLead(myContact.id, testBusinessId)
    const theirContact = await seedContact(testOtherBusinessId, 'Other Tenant Contact')
    const theirs = await seedLead(theirContact.id, testOtherBusinessId)

    const mineQueue = await getQueue()
    expect(mineQueue.some((r) => r.id === mine.id)).toBe(true)
    expect(mineQueue.some((r) => r.id === theirs.id)).toBe(false)

    const theirsRes = await app.inject({
      method: 'GET',
      url: '/leads/queue',
      headers: asAuth(testOtherUserId),
    })
    const theirsQueue = theirsRes.json().data
    expect(theirsQueue.some((r: any) => r.id === theirs.id)).toBe(true)
    expect(theirsQueue.some((r: any) => r.id === mine.id)).toBe(false)
  })

  it('includes contact display info and the next action note verbatim', async () => {
    const contact = await seedContact(testBusinessId, 'Displayable Name')
    const lead = await seedLead(contact.id, testBusinessId)
    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { nextActionNote: 'Call back after lunch' },
    })

    const queue = await getQueue()
    const row = queue.find((r) => r.id === lead.id)
    expect(row.contact.id).toBe(contact.id)
    expect(row.contact.name).toBe('Displayable Name')
    expect(row.nextActionNote).toBe('Call back after lunch')
  })
})
