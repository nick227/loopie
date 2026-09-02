import { db } from '@project/db'

const MAX_BODY_LENGTH = 4000

function cleanBody(value: unknown): string {
  if (typeof value !== 'string') throw { statusCode: 400, message: 'Message is required' }
  const body = value.trim()
  if (!body) throw { statusCode: 400, message: 'Message is required' }
  if (body.length > MAX_BODY_LENGTH) {
    throw { statusCode: 400, message: `Message must be ${MAX_BODY_LENGTH} characters or fewer` }
  }
  return body
}

// Native site mail uses InboxMessage as its source of truth. Authenticated conversations get a
// mirrored InboxThread for each business so the existing tenant-owned read/unread model remains
// intact; both copies are written in one transaction. Guest messages create only the recipient's
// thread, which is intentionally non-replyable because there is no authenticated return address.
export class InternalMessagingService {
  async sendToBusiness(input: {
    recipientBusinessId: string
    senderBusinessId?: string
    body: unknown
  }) {
    const body = cleanBody(input.body)
    const recipient = await db.business.findUnique({
      where: { id: input.recipientBusinessId },
      select: { id: true, name: true },
    })
    if (!recipient) throw { statusCode: 404, message: 'Business not found' }

    if (!input.senderBusinessId) {
      const now = new Date()
      const thread = await db.inboxThread.create({
        data: {
          businessId: recipient.id,
          type: 'BUSINESS',
          subject: 'Guest message',
          updatedAt: now,
          messages: {
            create: { kind: 'SITE', direction: 'INBOUND', body, createdAt: now },
          },
        },
      })
      return { threadId: null, recipientThreadId: thread.id, sentAt: now.toISOString() }
    }

    if (input.senderBusinessId === recipient.id) {
      throw { statusCode: 400, message: 'You cannot message your own business' }
    }

    const sender = await db.business.findUnique({
      where: { id: input.senderBusinessId },
      select: { id: true, name: true },
    })
    if (!sender) throw { statusCode: 401, message: 'Sender not found' }

    return db.$transaction(async (tx) => {
      const now = new Date()
      const upsertSenderThread = () =>
        tx.inboxThread.upsert({
          where: {
            businessId_peerBusinessId: {
              businessId: sender.id,
              peerBusinessId: recipient.id,
            },
          },
          update: { subject: recipient.name, lastReadAt: now, updatedAt: now },
          create: {
            businessId: sender.id,
            peerBusinessId: recipient.id,
            type: 'BUSINESS',
            subject: recipient.name,
            lastReadAt: now,
            updatedAt: now,
          },
        })
      const upsertRecipientThread = () =>
        tx.inboxThread.upsert({
          where: {
            businessId_peerBusinessId: {
              businessId: recipient.id,
              peerBusinessId: sender.id,
            },
          },
          update: { subject: sender.name, updatedAt: now },
          create: {
            businessId: recipient.id,
            peerBusinessId: sender.id,
            type: 'BUSINESS',
            subject: sender.name,
            updatedAt: now,
          },
        })

      // Always lock the pair in business-id order. Two businesses messaging each other at the
      // same instant otherwise acquire the mirrored rows in opposite orders and can deadlock.
      let senderThread: { id: string }
      let recipientThread: { id: string }
      if (sender.id.localeCompare(recipient.id) < 0) {
        senderThread = await upsertSenderThread()
        recipientThread = await upsertRecipientThread()
      } else {
        recipientThread = await upsertRecipientThread()
        senderThread = await upsertSenderThread()
      }
      await Promise.all([
        tx.inboxMessage.create({
          data: {
            threadId: senderThread.id,
            kind: 'SITE',
            direction: 'OUTBOUND',
            body,
            createdAt: now,
          },
        }),
        tx.inboxMessage.create({
          data: {
            threadId: recipientThread.id,
            kind: 'SITE',
            direction: 'INBOUND',
            body,
            createdAt: now,
          },
        }),
      ])
      return {
        threadId: senderThread.id,
        recipientThreadId: recipientThread.id,
        sentAt: now.toISOString(),
      }
    })
  }

  async reply(businessId: string, threadId: string, rawBody: unknown) {
    const thread = await db.inboxThread.findFirst({
      where: { id: threadId, businessId },
      include: { business: { select: { name: true } }, peerBusiness: { select: { name: true } } },
    })
    if (!thread) throw { statusCode: 404, message: 'Inbox thread not found' }
    if (thread.type !== 'BUSINESS' || !thread.peerBusinessId || !thread.peerBusiness) {
      throw { statusCode: 400, message: 'This thread cannot receive replies' }
    }

    const result = await this.sendToBusiness({
      senderBusinessId: businessId,
      recipientBusinessId: thread.peerBusinessId,
      body: rawBody,
    })
    return { threadId: result.threadId, sentAt: result.sentAt }
  }
}
