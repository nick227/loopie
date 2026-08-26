// Filled-in integration test (not a generated stub) for the transactional-integrity pass:
// Sale <-> Lead contact consistency, and MessageService.send() staying atomic/idempotent.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

describe('Sale <-> Lead contact consistency', () => {
  it('rejects a sale whose leadId belongs to a different contact than contactId', async () => {
    const contactA = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Contact A', email: 'a@example.com' },
    })
    const contactB = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Contact B', email: 'b@example.com' },
    })
    const leadForB = await db.lead.create({
      data: { businessId: testBusinessId, contactId: contactB.id, sourceType: 'MANUAL' },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contactA.id,
        leadId: leadForB.id,
        amount: 100,
        date: new Date().toISOString(),
      },
    })

    expect(res.statusCode).toBe(400)
    const sales = await db.sale.findMany({ where: { businessId: testBusinessId } })
    expect(sales).toHaveLength(0)
  })

  it('accepts a sale whose leadId belongs to the same contact', async () => {
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Contact C', email: 'c@example.com' },
    })
    const lead = await db.lead.create({
      data: { businessId: testBusinessId, contactId: contact.id, sourceType: 'MANUAL' },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contact.id,
        leadId: lead.id,
        amount: 100,
        date: new Date().toISOString(),
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().data.leadId).toBe(lead.id)
  })
})

describe('MessageService.send() atomicity', () => {
  it('a failed send leaves no partial interaction/contact writes behind', async () => {
    const audience = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Everyone', type: 'MANUAL_LIST' },
    })
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Recipient', email: 'recipient@example.com' },
    })
    await db.audienceMember.create({ data: { audienceId: audience.id, contactId: contact.id } })

    const messageRes = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: asAuth(testUserId),
      payload: { channel: 'EMAIL', subject: 'Hi', body: 'Hello', audienceId: audience.id },
    })
    expect(messageRes.statusCode).toBe(201)
    const messageId = messageRes.json().data.id

    // Force the final statement inside send()'s transaction (the message status update) to fail
    // after the interaction/contact writes have already been issued, simulating a mid-transaction
    // crash — a Prisma middleware fires for queries run inside an interactive transaction too, so
    // this actually exercises rollback rather than just mocking the service.
    let attempted = false
    db.$use(async (params, next) => {
      if (!attempted && params.model === 'Message' && params.action === 'update') {
        attempted = true
        throw new Error('simulated failure')
      }
      return next(params)
    })

    const sendRes = await app.inject({
      method: 'POST',
      url: `/messages/${messageId}/send`,
      headers: asAuth(testUserId),
    })
    expect(sendRes.statusCode).toBe(500)

    const message = await db.message.findUniqueOrThrow({ where: { id: messageId } })
    expect(message.status).toBe('DRAFT')
    const interactions = await db.interaction.findMany({ where: { sourceMessageId: messageId } })
    expect(interactions).toHaveLength(0)
    const refreshedContact = await db.contact.findUniqueOrThrow({ where: { id: contact.id } })
    expect(refreshedContact.lastContactedAt).toBeNull()

    // A retry after the simulated failure sends cleanly exactly once.
    const retryRes = await app.inject({
      method: 'POST',
      url: `/messages/${messageId}/send`,
      headers: asAuth(testUserId),
    })
    expect(retryRes.statusCode).toBe(200)
    const finalInteractions = await db.interaction.findMany({
      where: { sourceMessageId: messageId },
    })
    expect(finalInteractions).toHaveLength(1)
  })
})
