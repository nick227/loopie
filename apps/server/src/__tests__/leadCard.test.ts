// Filled-in integration test (not a generated stub) for the CRM pipeline/activity slice — the
// revised LeadStage vocabulary (ENGAGED/PROPOSAL, WON/LOST unchanged), the "lead card" data on
// GET /contacts/{contactId} (currentLead: stage, contacted, per-type activity counts, last touch,
// next action), and POST /contacts/{contactId}/interactions for manually logging effort. See
// CLAUDE.md's dated entry for the full design.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function seedContact(name = 'Pipeline Contact') {
  return db.contact.create({
    data: {
      businessId: testBusinessId,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    },
  })
}

async function seedLead(
  contactId: string,
  overrides: Partial<{
    stage: string
    openSlot: string | null
    openedAt: Date
    closedAt: Date | null
  }> = {},
) {
  return db.lead.create({
    data: {
      businessId: testBusinessId,
      contactId,
      sourceType: 'MANUAL',
      stage: (overrides.stage ?? 'NEW') as any,
      openSlot: overrides.openSlot === undefined ? 'OPEN' : overrides.openSlot,
      openedAt: overrides.openedAt ?? new Date(),
      closedAt: overrides.closedAt ?? null,
    },
  })
}

describe('pipeline stage vocabulary', () => {
  it('accepts the new ENGAGED and PROPOSAL stages, and WON/LOST behavior is unchanged', async () => {
    const contact = await seedContact()
    const lead = await seedLead(contact.id)

    const engaged = await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'ENGAGED' },
    })
    expect(engaged.statusCode).toBe(200)
    expect(engaged.json().data.stage).toBe('ENGAGED')

    const proposal = await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'PROPOSAL' },
    })
    expect(proposal.json().data.stage).toBe('PROPOSAL')
    // WON/LOST close the lead exactly as before — unaffected by the vocabulary change.
    expect(proposal.json().data.closedAt).toBeNull()

    const won = await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'WON' },
    })
    expect(won.json().data.stage).toBe('WON')
    expect(won.json().data.closedAt).not.toBeNull()
  })
})

describe('lead card (Contact.currentLead)', () => {
  it('counts logged activity by type, flags contacted, and reports last touch', async () => {
    const contact = await seedContact()
    const lead = await seedLead(contact.id)

    await db.interaction.createMany({
      data: [
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'EMAIL_SENT',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'EMAIL_SENT',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'TEXT_SENT',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'CALL_LOGGED',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'MEETING',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'WEBINAR',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'EVENT',
          occurredAt: new Date(),
        },
        // Inbound reply and a system event — must not count as "our effort".
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'REPLY',
          occurredAt: new Date(),
        },
        {
          businessId: testBusinessId,
          contactId: contact.id,
          type: 'FORM_SUBMITTED',
          occurredAt: new Date(),
        },
      ],
    })

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    const currentLead = res.json().data.currentLead
    expect(currentLead.id).toBe(lead.id)
    expect(currentLead.contacted).toBe(true)
    expect(currentLead.activityCounts).toEqual({
      email: 2,
      text: 1,
      call: 1,
      meeting: 1,
      webinarEvent: 2, // WEBINAR + EVENT combined
    })
    expect(currentLead.lastTouchAt).not.toBeNull()
  })

  it('reports not contacted with zero counts when nothing has happened yet', async () => {
    const contact = await seedContact()
    await seedLead(contact.id)

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    const currentLead = res.json().data.currentLead
    expect(currentLead.contacted).toBe(false)
    expect(currentLead.lastTouchAt).toBeNull()
    expect(currentLead.activityCounts).toEqual({
      email: 0,
      text: 0,
      call: 0,
      meeting: 0,
      webinarEvent: 0,
    })
  })

  it('is null for a contact with no lead at all', async () => {
    const contact = await seedContact()
    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    expect(res.json().data.currentLead).toBeNull()
  })

  it("scopes activity to the current lead's own open window — an older, closed lead's effort does not bleed onto a new one", async () => {
    const contact = await seedContact()
    const oldLead = await seedLead(contact.id, {
      openSlot: null,
      openedAt: new Date('2026-01-01'),
      closedAt: new Date('2026-01-05'),
      stage: 'LOST',
    })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        type: 'CALL_LOGGED',
        occurredAt: new Date('2026-01-03'), // inside the OLD lead's window only
      },
    })
    const newLead = await seedLead(contact.id, { openedAt: new Date('2026-02-01') })
    await db.interaction.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        type: 'EMAIL_SENT',
        occurredAt: new Date('2026-02-02'),
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    const currentLead = res.json().data.currentLead
    // The currently-open lead is preferred over the older closed one.
    expect(currentLead.id).toBe(newLead.id)
    expect(currentLead.id).not.toBe(oldLead.id)
    expect(currentLead.activityCounts.call).toBe(0) // old lead's call is not double-counted
    expect(currentLead.activityCounts.email).toBe(1)
  })

  it('falls back to the most recently created lead when none is open', async () => {
    const contact = await seedContact()
    await seedLead(contact.id, { openSlot: null, closedAt: new Date(), stage: 'LOST' })

    const res = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    expect(res.json().data.currentLead).not.toBeNull()
    expect(res.json().data.currentLead.stage).toBe('LOST')
  })
})

describe('logging activity', () => {
  it('logs a manual activity and it shows up in the interaction timeline', async () => {
    const contact = await seedContact()
    await seedLead(contact.id)

    const res = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'MEETING', note: 'Discovery call went well' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.type).toBe('MEETING')
    expect(res.json().data.metadata.note).toBe('Discovery call went well')

    const timeline = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
    })
    expect(timeline.json().data.some((i: any) => i.type === 'MEETING')).toBe(true)
  })

  it('rejects logging a system-of-record type (cannot fake EMAIL_SENT or SALE_RECORDED)', async () => {
    const contact = await seedContact()

    const fakeEmail = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'EMAIL_SENT' },
    })
    expect(fakeEmail.statusCode).toBe(400)

    const fakeSale = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'SALE_RECORDED' },
    })
    expect(fakeSale.statusCode).toBe(400)
  })

  it('respects an explicit occurredAt for logging something that already happened', async () => {
    const contact = await seedContact()
    const res = await app.inject({
      method: 'POST',
      url: `/contacts/${contact.id}/interactions`,
      headers: asAuth(testUserId),
      payload: { type: 'FOLLOW_UP', occurredAt: '2026-01-15T10:00:00.000Z' },
    })
    expect(res.json().data.occurredAt).toBe('2026-01-15T10:00:00.000Z')
  })
})

describe('next action', () => {
  it('can be set and cleared on a lead', async () => {
    const contact = await seedContact()
    const lead = await seedLead(contact.id)

    const set = await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { nextActionNote: 'Send proposal', nextActionAt: '2026-03-01T00:00:00.000Z' },
    })
    expect(set.json().data.nextActionNote).toBe('Send proposal')
    expect(set.json().data.nextActionAt).toBe('2026-03-01T00:00:00.000Z')

    const contactRes = await app.inject({
      method: 'GET',
      url: `/contacts/${contact.id}`,
      headers: asAuth(testUserId),
    })
    expect(contactRes.json().data.currentLead.nextActionNote).toBe('Send proposal')

    const cleared = await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { nextActionNote: null, nextActionAt: null },
    })
    expect(cleared.json().data.nextActionNote).toBeNull()
    expect(cleared.json().data.nextActionAt).toBeNull()
  })
})
