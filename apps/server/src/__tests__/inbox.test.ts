// Regression coverage for the Messages -> Inbox slice (2026-08-28): real sent Messages are read
// live through Inbox (Interaction joined back to Message), never duplicated into a persisted
// InboxMessage row; CONTACT and ADVERTISEMENT threads list together; simple thread-level
// unread/read state. Message.send()'s own existing behavior is untouched — see
// transactionalIntegrity.test.ts for that coverage; this file only proves the new read surface.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function sendMessageTo(
  contactName: string,
  overrides: { channel?: string; body?: string } = {},
) {
  const audience = await db.audience.create({
    data: { businessId: testBusinessId, name: `${contactName} audience`, type: 'MANUAL_LIST' },
  })
  const contact = await db.contact.create({
    data: {
      businessId: testBusinessId,
      name: contactName,
      email: `${contactName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    },
  })
  await db.audienceMember.create({ data: { audienceId: audience.id, contactId: contact.id } })

  const messageRes = await app.inject({
    method: 'POST',
    url: '/messages',
    headers: asAuth(testUserId),
    payload: {
      channel: overrides.channel ?? 'EMAIL',
      subject: 'Appointment reminder',
      body: overrides.body ?? 'Are you still good for Thursday?',
      audienceId: audience.id,
    },
  })
  const messageId = messageRes.json().data.id
  await app.inject({
    method: 'POST',
    url: `/messages/${messageId}/send`,
    headers: asAuth(testUserId),
  })
  return { contact, messageId }
}

describe('Inbox: real messages read live, never duplicated', () => {
  it('lists a CONTACT thread for a message recipient with a live preview from the real Message', async () => {
    const { contact } = await sendMessageTo('Priya Patel', {
      body: 'Are you still good for Thursday?',
    })

    const res = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const thread = res.json().data.find((t: any) => t.contactId === contact.id)
    expect(thread).toBeTruthy()
    expect(thread.type).toBe('CONTACT')
    expect(thread.subject).toBe('Priya Patel')
    expect(thread.previewKind).toBe('EMAIL')
    expect(thread.previewBody).toBe('Are you still good for Thursday?')
    expect(thread.unread).toBe(true)
  })

  it("returns the thread's messages read live from Interaction+Message, not a persisted copy", async () => {
    const { contact, messageId } = await sendMessageTo('Jordan Lee', {
      channel: 'TEXT',
      body: 'Reply YES to confirm.',
    })
    const listRes = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(testUserId),
    })
    const threadId = listRes.json().data.find((t: any) => t.contactId === contact.id).id

    const res = await app.inject({
      method: 'GET',
      url: `/inbox/threads/${threadId}`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.messages).toHaveLength(1)
    expect(res.json().data.messages[0].kind).toBe('SMS')
    expect(res.json().data.messages[0].direction).toBe('OUTBOUND')
    expect(res.json().data.messages[0].body).toBe('Reply YES to confirm.')

    // No second row was ever created for this content — it's read straight off the real Message.
    const persisted = await db.inboxMessage.count({ where: { threadId } })
    expect(persisted).toBe(0)
    const realMessage = await db.message.findUniqueOrThrow({ where: { id: messageId } })
    expect(realMessage.body).toBe('Reply YES to confirm.')
  })

  it('marking a thread read clears unread until a new message arrives', async () => {
    const { contact } = await sendMessageTo('Alex Kim')
    const listRes = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(testUserId),
    })
    const threadId = listRes.json().data.find((t: any) => t.contactId === contact.id).id

    const readRes = await app.inject({
      method: 'POST',
      url: `/inbox/threads/${threadId}/read`,
      headers: asAuth(testUserId),
    })
    expect(readRes.statusCode).toBe(200)
    expect(readRes.json().data.unread).toBe(false)

    const audience2 = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Second send audience', type: 'MANUAL_LIST' },
    })
    await db.audienceMember.create({ data: { audienceId: audience2.id, contactId: contact.id } })
    const secondMessageRes = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: asAuth(testUserId),
      payload: {
        channel: 'EMAIL',
        subject: 'Follow up',
        body: 'Just checking in.',
        audienceId: audience2.id,
      },
    })
    await app.inject({
      method: 'POST',
      url: `/messages/${secondMessageRes.json().data.id}/send`,
      headers: asAuth(testUserId),
    })

    const afterRes = await app.inject({
      method: 'GET',
      url: `/inbox/threads/${threadId}`,
      headers: asAuth(testUserId),
    })
    expect(afterRes.statusCode).toBe(200)
    const refreshed = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(testUserId),
    })
    const thread = refreshed.json().data.find((t: any) => t.id === threadId)
    expect(thread.unread).toBe(true)
    expect(thread.previewBody).toBe('Just checking in.')
  })

  it('filter=unread excludes threads that have been marked read', async () => {
    const { contact: readContact } = await sendMessageTo('Read Contact')
    const { contact: unreadContact } = await sendMessageTo('Unread Contact')
    const listRes = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(testUserId),
    })
    const readThreadId = listRes.json().data.find((t: any) => t.contactId === readContact.id).id
    await app.inject({
      method: 'POST',
      url: `/inbox/threads/${readThreadId}/read`,
      headers: asAuth(testUserId),
    })

    const res = await app.inject({
      method: 'GET',
      url: '/inbox/threads?filter=unread',
      headers: asAuth(testUserId),
    })
    const ids = res.json().data.map((t: any) => t.contactId)
    expect(ids).toContain(unreadContact.id)
    expect(ids).not.toContain(readContact.id)
  })

  it('SOCIAL sends do not create a CONTACT thread (not a 1:1 conversation)', async () => {
    const { contact } = await sendMessageTo('Social Contact', {
      channel: 'SOCIAL',
      body: 'Big sale this weekend!',
    })
    const res = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(testUserId),
    })
    expect(res.json().data.find((t: any) => t.contactId === contact.id)).toBeUndefined()
  })

  it('404s a thread that belongs to another business', async () => {
    const other = await db.business.create({ data: { name: 'Other Biz' } })
    const otherThread = await db.inboxThread.create({
      data: { businessId: other.id, type: 'CONTACT', subject: 'Not yours', contactId: null },
    })
    const res = await app.inject({
      method: 'GET',
      url: `/inbox/threads/${otherThread.id}`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(404)
  })
})
