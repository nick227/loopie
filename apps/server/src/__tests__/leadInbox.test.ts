// Regression coverage for the first real CRM event wired into Inbox (2026-08-28): a Lead stage
// change posts a SYSTEM message into the *same* CONTACT thread as that person's real
// communications — proving the "CRM is not a new thread type" read of the product's omni-inbox
// direction. No Meta/Graph mocking needed here — this path never touches a connector.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function createLead(contactName: string) {
  const contact = await db.contact.create({
    data: {
      businessId: testBusinessId,
      name: contactName,
      email: `${contactName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    },
  })
  const lead = await db.lead.create({
    data: { businessId: testBusinessId, contactId: contact.id, sourceType: 'MANUAL' },
  })
  return { contact, lead }
}

async function threadForContact(contactId: string) {
  return db.inboxThread.findUnique({
    where: { contactId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}

describe('Inbox: Lead stage changes post into the contact thread', () => {
  it('posts a SYSTEM message naming the real stage transition', async () => {
    const { contact, lead } = await createLead('Marcus Hill')

    const res = await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'QUALIFIED' },
    })
    expect(res.statusCode).toBe(200)

    const thread = await threadForContact(contact.id)
    expect(thread).toBeTruthy()
    expect(thread!.type).toBe('CONTACT')
    expect(thread!.subject).toBe('Marcus Hill')
    expect(thread!.messages).toHaveLength(1)
    expect(thread!.messages[0]!.kind).toBe('SYSTEM')
    expect(thread!.messages[0]!.direction).toBe('INTERNAL')
    expect(thread!.messages[0]!.subject).toBe('Lead status changed')
    expect(thread!.messages[0]!.body).toBe('Moved from New to Qualified.')
  })

  it('lands in the SAME thread as a real sent message, not a separate CRM thread', async () => {
    const { contact, lead } = await createLead('Priya Patel')
    const audience = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Priya audience', type: 'MANUAL_LIST' },
    })
    await db.audienceMember.create({ data: { audienceId: audience.id, contactId: contact.id } })
    const messageRes = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: asAuth(testUserId),
      payload: {
        channel: 'EMAIL',
        subject: 'Quote attached',
        body: 'Here is your quote.',
        audienceId: audience.id,
      },
    })
    await app.inject({
      method: 'POST',
      url: `/messages/${messageRes.json().data.id}/send`,
      headers: asAuth(testUserId),
    })

    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'CONTACTED' },
    })

    const threads = await db.inboxThread.findMany({ where: { contactId: contact.id } })
    expect(threads).toHaveLength(1) // one thread, not two
    const thread = await threadForContact(contact.id)
    expect(thread!.messages.map((m) => m.subject)).toContain('Lead status changed')
  })

  it('does not post a message for an update that leaves the stage unchanged', async () => {
    const { contact, lead } = await createLead('Alex Kim')

    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { owner: 'someone@example.com' },
    })

    expect(await threadForContact(contact.id)).toBeNull()
  })

  it('shows the stage-change message as the list preview when it is the most recent event', async () => {
    const { contact, lead } = await createLead('Sam Rivera')

    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'QUALIFIED' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(testUserId),
    })
    const thread = res.json().data.find((t: any) => t.contactId === contact.id)
    expect(thread).toBeTruthy()
    expect(thread.previewKind).toBe('SYSTEM')
    expect(thread.previewBody).toBe('Moved from New to Qualified.')
  })

  it('picks whichever of a stage change or a real message is actually most recent for the preview', async () => {
    const { contact, lead } = await createLead('Taylor Brooks')
    const audience = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Taylor audience', type: 'MANUAL_LIST' },
    })
    await db.audienceMember.create({ data: { audienceId: audience.id, contactId: contact.id } })

    // Stage change first...
    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'CONTACTED' },
    })
    // ...then a real message, which should now win the preview.
    const messageRes = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: asAuth(testUserId),
      payload: {
        channel: 'EMAIL',
        subject: 'Following up',
        body: 'Just checking in.',
        audienceId: audience.id,
      },
    })
    await app.inject({
      method: 'POST',
      url: `/messages/${messageRes.json().data.id}/send`,
      headers: asAuth(testUserId),
    })

    const res = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(testUserId),
    })
    const thread = res.json().data.find((t: any) => t.contactId === contact.id)
    expect(thread.previewKind).toBe('EMAIL')
    expect(thread.previewBody).toBe('Just checking in.')
  })

  it('handles a second stage change on an already-existing thread, appended in order', async () => {
    const { contact, lead } = await createLead('Jordan Lee')

    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'CONTACTED' },
    })
    await app.inject({
      method: 'PATCH',
      url: `/leads/${lead.id}`,
      headers: asAuth(testUserId),
      payload: { stage: 'QUALIFIED' },
    })

    const thread = await threadForContact(contact.id)
    expect(thread!.messages).toHaveLength(2)
    expect(thread!.messages[0]!.body).toBe('Moved from New to Contacted.')
    expect(thread!.messages[1]!.body).toBe('Moved from Contacted to Qualified.')
  })
})
