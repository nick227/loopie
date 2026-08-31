import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { resolveAudienceWhere } from './AudienceService'
import { requireAudience, requireAutomation, requireTemplate } from '../lib/ownership'
import { scheduleAutomationRuns } from '../lib/automationScheduling'
import { ACTIVE_SALE_WHERE } from '../lib/salePredicates'

function toMessageDTO(message: any, recipientCount = 0) {
  return {
    id: message.id,
    businessId: message.businessId,
    channel: message.channel,
    subject: message.subject,
    body: message.body,
    audienceId: message.audienceId,
    templateId: message.templateId,
    automationId: message.automationId,
    status: message.status,
    scheduledAt: message.scheduledAt?.toISOString() ?? null,
    sentAt: message.sentAt?.toISOString() ?? null,
    recipientCount,
    createdAt: message.createdAt.toISOString(),
  }
}

// A switch (not a Record lookup) so noUncheckedIndexedAccess can't widen the
// result to include `undefined` even though every MessageChannel is covered.
function interactionTypeForChannel(
  channel: 'EMAIL' | 'TEXT' | 'SOCIAL',
): 'EMAIL_SENT' | 'TEXT_SENT' | 'SOCIAL_POST_SENT' {
  switch (channel) {
    case 'EMAIL':
      return 'EMAIL_SENT'
    case 'TEXT':
      return 'TEXT_SENT'
    case 'SOCIAL':
      return 'SOCIAL_POST_SENT'
  }
}

export class MessageService {
  async list(
    businessId: string,
    opts: { cursor?: string; limit?: number; status?: string; channel?: string },
  ) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (opts.status) AND.push({ status: opts.status })
    if (opts.channel) AND.push({ channel: opts.channel })
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const messages = await db.message.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = messages.length > limit
    const items = hasMore ? messages.slice(0, limit) : messages
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    const data = await Promise.all(items.map((m) => this._toDTOWithCount(m)))
    return { data, meta: { hasMore, nextCursor } }
  }

  async create(businessId: string, data: any) {
    await requireAudience(businessId, data.audienceId)
    if (data.templateId) await requireTemplate(businessId, data.templateId)
    if (data.automationId) await requireAutomation(businessId, data.automationId)
    const message = await db.message.create({
      data: {
        businessId,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        audienceId: data.audienceId,
        templateId: data.templateId,
        automationId: data.automationId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    })
    return this._toDTOWithCount(message)
  }

  async get(businessId: string, messageId: string) {
    return this._toDTOWithCount(await this._find(businessId, messageId))
  }

  async update(businessId: string, messageId: string, data: any) {
    const current = await this._find(businessId, messageId)
    if (current.status === 'SENT')
      throw { statusCode: 409, message: 'Sent messages cannot be edited' }
    if (data.audienceId !== undefined) await requireAudience(businessId, data.audienceId)
    const message = await db.message.update({
      where: { id: messageId },
      data: {
        ...(data.subject !== undefined ? { subject: data.subject } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.audienceId !== undefined ? { audienceId: data.audienceId } : {}),
        ...(data.scheduledAt !== undefined
          ? {
              scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
              status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
            }
          : {}),
      },
    })
    return this._toDTOWithCount(message)
  }

  async delete(businessId: string, messageId: string) {
    const message = await this._find(businessId, messageId)
    if (message.status === 'SENT')
      throw { statusCode: 409, message: 'Sent messages cannot be deleted' }
    await db.message.delete({ where: { id: messageId } })
  }

  // Resolves the audience to eligible contacts, writes one Interaction per recipient, and
  // marks the message SENT. Actual email/SMS delivery is a plugin not yet installed (see
  // CLAUDE.md Parking lot) — this records the send as a real business event either way.
  async send(businessId: string, messageId: string) {
    const message = await this._find(businessId, messageId)
    if (message.status === 'SENT') throw { statusCode: 409, message: 'Message already sent' }

    if (message.channel === 'SOCIAL') {
      const { SocialDeliveryService } = await import('./SocialDeliveryService')
      const delivery = new SocialDeliveryService()
      const result = await delivery.publish(message.id, businessId)
      if (!result.success) {
        // Mark failed if external delivery fails
        await db.message.update({ where: { id: messageId }, data: { status: 'FAILED' } })
        throw { statusCode: 500, message: `Social delivery failed: ${result.reason}` }
      }
    }

    const audience = await db.audience.findFirst({ where: { id: message.audienceId, businessId } })
    if (!audience) throw { statusCode: 404, message: 'Audience not found' }

    const eligibilityField =
      message.channel === 'EMAIL'
        ? 'emailEligible'
        : message.channel === 'TEXT'
          ? 'smsEligible'
          : null
    const filterWhere = resolveAudienceWhere(audience)
    const baseWhere = filterWhere ?? {
      businessId,
      deletedAt: null,
      audienceMemberships: { some: { audienceId: audience.id } },
    }
    const where = eligibilityField ? { ...baseWhere, [eligibilityField]: true } : baseWhere

    const recipients = await db.contact.findMany({
      where,
      select: { id: true, name: true, email: true },
    })
    const interactionType = interactionTypeForChannel(message.channel)

    if (message.channel === 'EMAIL' && recipients.length > 0) {
      const emails = recipients.map((r) => r.email).filter((e): e is string => Boolean(e))
      const { EmailDeliveryService } = await import('./EmailDeliveryService')
      const emailDelivery = new EmailDeliveryService()
      const result = await emailDelivery.publishBatch(message.subject ?? '', message.body, emails)

      if (!result.success) {
        await db.message.update({ where: { id: messageId }, data: { status: 'FAILED' } })
        throw {
          statusCode: 500,
          message: `Email delivery failed for some or all recipients: ${result.errors[0]}`,
        }
      }
    }

    // Atomic: a crash partway through must not leave the interaction/contact writes committed
    // while status stays DRAFT/SCHEDULED — that would make a retry re-send to every recipient
    // (the top-of-function status guard only protects against retrying an *already-completed*
    // send). Wrapping all of it in one transaction means a retry after failure always starts
    // from a clean, unsent state.
    const sent = await db.$transaction(async (tx) => {
      if (recipients.length) {
        await tx.interaction.createMany({
          data: recipients.map((r) => ({
            businessId,
            contactId: r.id,
            type: interactionType,
            sourceType: 'MESSAGE' as const,
            sourceMessageId: message.id,
          })),
        })
        await tx.contact.updateMany({
          where: { id: { in: recipients.map((r) => r.id) } },
          data: { lastContactedAt: new Date() },
        })
      }
      return tx.message.update({
        where: { id: messageId },
        data: { status: 'SENT', sentAt: new Date() },
      })
    })

    if (recipients.length) {
      // triggerSourceId is synthesized (message.id:contactId), not a real row id — send() uses
      // createMany for the interactions above (MySQL createMany doesn't return generated ids),
      // and a bulk audience send has no single per-recipient row to point at anyway. Still
      // unique per (message, contact), which is all scheduleAutomationRuns' idempotency needs.
      await Promise.all(
        recipients.map((r) =>
          scheduleAutomationRuns(db, {
            businessId,
            trigger: 'MESSAGE_SENT',
            contactId: r.id,
            triggerSourceId: `${message.id}:${r.id}`,
            triggerEventAt: sent.sentAt ?? new Date(),
          }),
        ),
      )
    }

    // Best-effort, non-blocking, outside the transaction — same discipline as
    // scheduleAutomationRuns above. Ensures each recipient's Inbox thread exists and its
    // updatedAt reflects this send, so InboxService.list can sort/preview off persisted thread
    // metadata alone without an N+1 scan of every business's contacts on every list call. Never
    // writes message content here — InboxService reads that live from this Interaction, joined
    // back to this Message, on every request (see InboxService's own doc comment for why).
    // SOCIAL is a broadcast post, not a 1:1 conversation — no thread for it.
    if (recipients.length && message.channel !== 'SOCIAL') {
      await Promise.all(
        recipients.map((r) =>
          db.inboxThread
            .upsert({
              where: { contactId: r.id },
              update: { updatedAt: new Date() },
              create: { businessId, type: 'CONTACT', contactId: r.id, subject: r.name },
            })
            .catch((err) => console.error('Failed to ensure Inbox thread for contact', err)),
        ),
      )
    }

    return this._toDTOWithCount(sent)
  }

  async testSend(businessId: string, messageId: string, _data: { toEmailOrPhone: string }) {
    await this._find(businessId, messageId) // 404 + tenant guard
    // No email/SMS provider wired yet (plugin deferred — see CLAUDE.md Parking lot). Accepted as a no-op.
  }

  async performance(businessId: string, messageId: string) {
    await this._find(businessId, messageId)
    const [sent, replied, leads, sales, revenue] = await Promise.all([
      db.interaction.count({
        where: {
          businessId,
          sourceMessageId: messageId,
          type: { in: ['EMAIL_SENT', 'TEXT_SENT', 'SOCIAL_POST_SENT'] },
        },
      }),
      db.interaction.count({ where: { businessId, sourceMessageId: messageId, type: 'REPLY' } }),
      db.lead.count({ where: { businessId, sourceMessageId: messageId } }),
      db.sale.count({ where: { businessId, sourceMessageId: messageId, ...ACTIVE_SALE_WHERE } }),
      db.sale.aggregate({
        where: { businessId, sourceMessageId: messageId, ...ACTIVE_SALE_WHERE },
        _sum: { amount: true },
      }),
    ])
    return {
      sent,
      delivered: sent, // no delivery-webhook provider wired yet — sent count is the best available signal
      opened: 0, // requires a tracking-pixel provider not yet wired
      clicked: 0, // requires link-tracking not yet wired
      replied,
      unsubscribed: 0,
      leads,
      sales,
      revenue: Number(revenue._sum.amount ?? 0),
    }
  }

  private async _find(businessId: string, messageId: string) {
    const message = await db.message.findFirst({ where: { id: messageId, businessId } })
    if (!message) throw { statusCode: 404, message: 'Message not found' }
    return message
  }

  private async _toDTOWithCount(message: any) {
    const audience = await db.audience.findFirst({ where: { id: message.audienceId } })
    let recipientCount = 0
    if (audience) {
      const filterWhere = resolveAudienceWhere(audience)
      const where = filterWhere ?? {
        businessId: message.businessId,
        deletedAt: null,
        audienceMemberships: { some: { audienceId: audience.id } },
      }
      recipientCount = await db.contact.count({ where })
    }
    return toMessageDTO(message, recipientCount)
  }
}
