import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import {
  asAuth,
  buildTestApp,
  testBusinessId,
  testOtherBusinessId,
  testUserId,
  validateResponse,
} from './helpers'

const app = buildTestApp()

describe('Home operating overview', () => {
  it('projects tenant-scoped Inbox work and meaningful activity into the fixed rail', async () => {
    const now = Date.now()
    const [jane, sarah, reached, otherTenant] = await Promise.all([
      db.contact.create({ data: { businessId: testBusinessId, name: 'Jane Smith' } }),
      db.contact.create({ data: { businessId: testBusinessId, name: 'Sarah Cole' } }),
      db.contact.create({ data: { businessId: testBusinessId, name: 'Chris Bell' } }),
      db.contact.create({ data: { businessId: testOtherBusinessId, name: 'Bob Private' } }),
    ])

    const [janeReply, sarahLead] = await Promise.all([
      db.interaction.create({
        data: {
          businessId: testBusinessId,
          contactId: jane.id,
          type: 'REPLY',
          sourceType: 'MESSAGE',
          metadata: { body: 'Can you come Friday afternoon?' },
          occurredAt: new Date(now - 10 * 60_000),
        },
      }),
      db.lead.create({
        data: {
          businessId: testBusinessId,
          contactId: sarah.id,
          sourceType: 'MANUAL',
          stage: 'NEW',
          openSlot: 'OPEN',
          openedAt: new Date(now - 5 * 60_000),
        },
      }),
      db.interaction.create({
        data: {
          businessId: testBusinessId,
          contactId: reached.id,
          type: 'EMAIL_SENT',
          sourceType: 'MESSAGE',
        },
      }),
      db.interaction.create({
        data: {
          businessId: testBusinessId,
          contactId: reached.id,
          type: 'AD_CLICK',
          sourceType: 'AD_RUN',
        },
      }),
      db.interaction.create({
        data: {
          businessId: testOtherBusinessId,
          contactId: otherTenant.id,
          type: 'REPLY',
          sourceType: 'MESSAGE',
          metadata: { body: 'This must never leak.' },
        },
      }),
      db.sale.create({
        data: {
          businessId: testBusinessId,
          contactId: jane.id,
          amount: 7100,
          date: new Date(),
          sourceType: 'MANUAL',
          idempotencyKey: 'home-overview-sale',
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

    const home = response.json().data
    expect(home.rail).toMatchObject({
      currency: 'USD',
      inboxWaiting: 2,
      reach: 1,
      responses: 1,
      leads: 1,
      revenue: 7100,
    })
    expect(home.inbox.items.map((item: { contactName: string }) => item.contactName)).toEqual([
      'Jane Smith',
      'Sarah Cole',
    ])
    expect(home.inbox.items[0]).toMatchObject({
      id: janeReply.id,
      preview: 'Can you come Friday afternoon?',
      actionLabel: 'Reply',
    })
    expect(home.inbox.items[1]).toMatchObject({ id: sarahLead.id, actionLabel: 'Review Lead' })
    expect(home.activity.items.map((item: { eventType: string }) => item.eventType)).toEqual(
      expect.arrayContaining(['REPLY_RECEIVED', 'LEAD_CREATED', 'SALE_RECORDED']),
    )
    expect(home.activity.items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ eventType: 'AD_CLICK' })]),
    )
    expect(JSON.stringify(home)).not.toContain('Bob Private')
    expect(home.primaryAction).toMatchObject({
      title: 'Jane Smith is waiting for a reply',
      actionLabel: 'Reply',
    })
  })
})
