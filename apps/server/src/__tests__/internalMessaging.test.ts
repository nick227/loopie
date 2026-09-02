import { describe, expect, it } from 'vitest'
import { db } from '@project/db'
import { asAuth, buildTestApp } from './helpers'

const app = buildTestApp()

async function registerBusiness(email: string, businessName: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'password12', businessName },
  })
  expect(response.statusCode).toBe(201)
  const token = String(response.headers['set-cookie'] ?? '').match(/token=([^;]+)/)?.[1]
  expect(token).toBeTruthy()
  const user = response.json().data
  const business = await db.business.findUniqueOrThrow({ where: { id: user.businessId } })
  return {
    userId: user.id as string,
    businessId: user.businessId as string,
    slug: business.slug as string,
    cookie: `token=${token}`,
  }
}

describe('Internal site messaging', () => {
  it('delivers an authenticated profile message into both inboxes and supports replies', async () => {
    const sender = await registerBusiness('site-sender@test.local', 'Sender Studio')
    const recipient = await registerBusiness('site-recipient@test.local', 'Recipient Works')

    const sent = await app.inject({
      method: 'POST',
      url: `/b/${recipient.slug}/messages`,
      headers: { cookie: sender.cookie },
      payload: { body: 'Could we work together next month?' },
    })
    expect(sent.statusCode).toBe(201)
    expect(sent.json().data.threadId).toBeTruthy()

    const senderList = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(sender.userId),
    })
    const recipientList = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(recipient.userId),
    })
    const senderThread = senderList.json().data.find((row: any) => row.type === 'BUSINESS')
    const recipientThread = recipientList.json().data.find((row: any) => row.type === 'BUSINESS')
    expect(senderThread).toMatchObject({
      subject: 'Recipient Works',
      peerBusinessId: recipient.businessId,
      canReply: true,
      unread: false,
      previewKind: 'SITE',
    })
    expect(recipientThread).toMatchObject({
      subject: 'Sender Studio',
      peerBusinessId: sender.businessId,
      canReply: true,
      unread: true,
      previewBody: 'Could we work together next month?',
    })

    const replied = await app.inject({
      method: 'POST',
      url: `/inbox/threads/${recipientThread.id}/reply`,
      headers: asAuth(recipient.userId),
      payload: { body: 'Yes — let us find a time.' },
    })
    expect(replied.statusCode).toBe(201)

    const senderDetail = await app.inject({
      method: 'GET',
      url: `/inbox/threads/${senderThread.id}`,
      headers: asAuth(sender.userId),
    })
    expect(senderDetail.json().data.messages).toMatchObject([
      { direction: 'OUTBOUND', kind: 'SITE', body: 'Could we work together next month?' },
      { direction: 'INBOUND', kind: 'SITE', body: 'Yes — let us find a time.' },
    ])
  })

  it('delivers guest messages as one-way, non-replyable inbox threads', async () => {
    const recipient = await registerBusiness('guest-recipient@test.local', 'Open Door Co')
    const sent = await app.inject({
      method: 'POST',
      url: `/b/${recipient.slug}/messages`,
      payload: { body: 'Are you open on Saturday?' },
    })
    expect(sent.statusCode).toBe(201)
    expect(sent.json().data.threadId).toBeNull()

    const list = await app.inject({
      method: 'GET',
      url: '/inbox/threads',
      headers: asAuth(recipient.userId),
    })
    const thread = list.json().data.find((row: any) => row.subject === 'Guest message')
    expect(thread).toMatchObject({
      type: 'BUSINESS',
      peerBusinessId: null,
      canReply: false,
      previewKind: 'SITE',
      previewBody: 'Are you open on Saturday?',
    })

    const reply = await app.inject({
      method: 'POST',
      url: `/inbox/threads/${thread.id}/reply`,
      headers: asAuth(recipient.userId),
      payload: { body: 'We are.' },
    })
    expect(reply.statusCode).toBe(400)
  })
})
