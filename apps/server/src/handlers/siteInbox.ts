import type { FastifyReply, FastifyRequest } from 'fastify'
import { db } from '@project/db'
import { Prisma } from '@prisma/client'
import { requireSiteAdmin, type AuthUser } from '../lib/membership'
import { EmailDeliveryService } from '../services/EmailDeliveryService'

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  )
}

export async function createSiteInquiry(
  request: FastifyRequest<{
    Body: { name: string; email: string; message: string; submissionKey: string }
  }>,
  reply: FastifyReply,
) {
  const { submissionKey } = request.body
  const name = request.body.name.trim()
  const email = request.body.email.trim()
  const message = request.body.message.trim()
  if (!name || !message) return reply.code(400).send({ error: 'Name and message are required.' })

  try {
    await db.siteInquiry.create({ data: { submissionKey, name, email, message } })
  } catch (error) {
    // A lost response can be retried without creating another inquiry or notifying staff twice.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
      throw error
    const existing = await db.siteInquiry.findUnique({ where: { submissionKey } })
    if (
      !existing ||
      existing.name !== name ||
      existing.email !== email ||
      existing.message !== message
    ) {
      return reply.code(409).send({ error: 'This submission key has already been used.' })
    }
    return reply.code(201).send({ received: true })
  }

  // Receipt means persisted in the inbox. Notification failure must not invite duplicate sends.
  try {
    if (process.env.RESEND_API_KEY) {
      const staff = await db.user.findMany({
        where: {
          platformRole: 'SITE_ADMIN',
          suspendedAt: null,
          deletedAt: null,
          siteInboxEmailNotifications: true,
        },
        select: { email: true },
      })
      const result = await new EmailDeliveryService().publishBatch(
        'New advertising inquiry',
        `<p>From: ${escapeHtml(name)} (${escapeHtml(email)})</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p><p>View this inquiry in Platform Admin → Site inbox.</p>`,
        staff.map((user) => user.email),
      )
      if (!result.success)
        request.log.warn(
          { errors: result.errors },
          'Site inquiry saved; staff email notification failed',
        )
    } else {
      request.log.warn(
        'Site inquiry saved; RESEND_API_KEY is not configured for staff notifications',
      )
    }
  } catch (error) {
    request.log.error({ err: error }, 'Site inquiry saved; staff email notification failed')
  }
  return reply.code(201).send({ received: true })
}

export async function adminListSiteInquiries(
  request: FastifyRequest<{ Querystring: { cursor?: string } }>,
  reply: FastifyReply,
) {
  const user = (request as FastifyRequest & { user: AuthUser }).user
  requireSiteAdmin(user)
  const records = await db.siteInquiry.findMany({
    take: 51,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
    select: { id: true, name: true, email: true, message: true, createdAt: true },
  })
  const data = records.slice(0, 50)
  return reply.send({
    data: data.map((record) => ({ ...record, createdAt: record.createdAt.toISOString() })),
    nextCursor: records.length > 50 ? data.at(-1)!.id : null,
    emailNotifications: user.siteInboxEmailNotifications,
  })
}

export async function adminSetSiteInboxSubscription(
  request: FastifyRequest<{ Body: { enabled: boolean } }>,
  reply: FastifyReply,
) {
  const user = (request as FastifyRequest & { user: AuthUser }).user
  requireSiteAdmin(user)
  await db.user.update({
    where: { id: user.id },
    data: { siteInboxEmailNotifications: request.body.enabled },
  })
  return reply.send({ enabled: request.body.enabled })
}
