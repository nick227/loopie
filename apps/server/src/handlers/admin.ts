import type { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@project/db'
import { requireSiteAdmin } from '../lib/membership'
import { encodeCursor, decodeCursor, normalizeLimit } from '../lib/pagination'
import { getBusinessLicenseState } from '../lib/licensing'
import { emitAuditEvent, AuditActions, AuditResourceTypes } from '../lib/audit'
import type { BusinessLicenseStatus, BusinessLicenseSource } from '@project/db'

export async function adminListBusinesses(
  request: FastifyRequest<{
    Querystring: { limit?: number; cursor?: string; q?: string }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)

  const limit = normalizeLimit(request.query.limit, 100, 20)
  const { q, cursor } = request.query

  const decodedCursor = decodeCursor(cursor)

  const where = q
    ? {
        name: { contains: q, mode: 'insensitive' as const },
      }
    : {}

  const records = await db.business.findMany({
    take: limit + 1,
    ...(decodedCursor && { cursor: { id: decodedCursor.id } }),
    orderBy: { id: 'asc' },
    where,
    include: {
      memberships: {
        include: { user: true },
      },
    },
  })

  const hasNextPage = records.length > limit
  const dataRecords = hasNextPage ? records.slice(0, -1) : records

  const data = (dataRecords as any[]).map((biz) => {
    const owner = biz.memberships?.find((m: any) => m.role === 'OWNER')
    return {
      id: biz.id,
      name: biz.name,
      slug: biz.slug,
      createdAt: biz.createdAt.toISOString(),
      memberCount: biz.memberships?.length ?? 0,
      ownerName: owner?.user?.email ?? null,
      ownerEmail: owner?.user?.email ?? null,
      subscriptionStatus: biz.subscriptionStatus,
    }
  })

  const nextCursor =
    hasNextPage && dataRecords.length > 0
      ? encodeCursor({
          id: dataRecords[dataRecords.length - 1]!.id,
          createdAt: dataRecords[dataRecords.length - 1]!.createdAt.toISOString(),
        })
      : null

  return reply.send({
    data,
    nextCursor,
  })
}

export async function adminListUsers(
  request: FastifyRequest<{
    Querystring: { limit?: number; cursor?: string; q?: string }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)

  const limit = normalizeLimit(request.query.limit, 100, 20)
  const { q, cursor } = request.query

  const decodedCursor = decodeCursor(cursor)

  const where = q
    ? {
        email: { contains: q, mode: 'insensitive' as const },
      }
    : {}

  const records = await db.user.findMany({
    take: limit + 1,
    ...(decodedCursor && { cursor: { id: decodedCursor.id } }),
    orderBy: { id: 'asc' },
    where,
    include: {
      memberships: {
        include: { business: true },
      },
    },
  })

  const hasNextPage = records.length > limit
  const dataRecords = hasNextPage ? records.slice(0, -1) : records

  const data = (dataRecords as any[]).map((u) => {
    return {
      id: u.id,
      email: u.email,
      platformRole: u.platformRole,
      isVerified: u.isVerified,
      createdAt: u.createdAt.toISOString(),
      lastActiveAt: u.updatedAt.toISOString(),
      businesses: u.memberships.map((m: any) => ({
        id: m.businessId,
        name: m.business.name,
        role: m.role,
      })),
    }
  })

  const nextCursor =
    hasNextPage && dataRecords.length > 0
      ? encodeCursor({
          id: dataRecords[dataRecords.length - 1]!.id,
          createdAt: dataRecords[dataRecords.length - 1]!.createdAt.toISOString(),
        })
      : null

  return reply.send({
    data,
    nextCursor,
  })
}

export async function adminGetBusiness(
  request: FastifyRequest<{
    Params: { businessId: string }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)

  const biz = await db.business.findUnique({
    where: { id: request.params.businessId },
    include: {
      memberships: {
        include: { user: true },
      },
    },
  })

  if (!biz) {
    return reply.status(404).send({ message: 'Business not found' })
  }

  const owner = biz.memberships?.find((m: any) => m.role === 'OWNER')
  const licenseState = await getBusinessLicenseState(biz.id)

  return reply.send({
    data: {
      id: biz.id,
      name: biz.name,
      slug: biz.slug,
      createdAt: biz.createdAt.toISOString(),
      memberCount: biz.memberships?.length ?? 0,
      ownerName: owner?.user?.email ?? null,
      ownerEmail: owner?.user?.email ?? null,
      subscriptionStatus: biz.subscriptionStatus,
      license: {
        isEntitled: licenseState.isEntitled,
        status: licenseState.status,
        startsAt: licenseState.startsAt.toISOString(),
        endsAt: licenseState.endsAt?.toISOString() ?? null,
        source: licenseState.source,
      },
    },
  })
}

export async function adminUpdateBusinessLicense(
  request: FastifyRequest<{
    Params: { businessId: string }
    Body: {
      status: BusinessLicenseStatus
      endsAt: string | null
      source: BusinessLicenseSource
      note?: string | null
    }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)

  const { businessId } = request.params
  const { status, endsAt, source, note } = request.body

  const parsedEndsAt = endsAt ? new Date(endsAt) : null

  const existingLicense = await db.businessLicense.findUnique({
    where: { businessId },
  })

  await db.businessLicense.upsert({
    where: { businessId },
    update: {
      status,
      endsAt: parsedEndsAt,
      source,
      note,
      grantedByUserId: (request as any).user.id,
    },
    create: {
      businessId,
      status,
      endsAt: parsedEndsAt,
      source,
      note,
      grantedByUserId: (request as any).user.id,
    },
  })

  let action: string = AuditActions.LICENSE_UPDATED
  if (!existingLicense) {
    action = AuditActions.LICENSE_GRANTED
  } else if (existingLicense.status === 'ACTIVE' && status === 'SUSPENDED') {
    action = AuditActions.LICENSE_SUSPENDED
  } else if (existingLicense.status === 'SUSPENDED' && status === 'ACTIVE') {
    action = AuditActions.LICENSE_REACTIVATED
  }

  await emitAuditEvent({
    actor: (request as any).user,
    action,
    resourceType: AuditResourceTypes.BUSINESS_LICENSE,
    businessId,
    metadata: {
      previousStatus: existingLicense?.status,
      newStatus: status,
      source,
      endsAt: parsedEndsAt?.toISOString(),
      note,
    },
  })

  const updatedState = await getBusinessLicenseState(businessId)

  return reply.send({
    data: {
      isEntitled: updatedState.isEntitled,
      status: updatedState.status,
      startsAt: updatedState.startsAt.toISOString(),
      endsAt: updatedState.endsAt?.toISOString() ?? null,
      source: updatedState.source,
    },
  })
}

export async function adminListAuditEvents(
  request: FastifyRequest<{
    Querystring: { limit?: number; cursor?: string; businessId?: string }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)

  const limit = normalizeLimit(request.query.limit, 100, 20)
  const { cursor, businessId } = request.query

  const decodedCursor = decodeCursor(cursor)

  const where = businessId ? { businessId } : {}

  const records = await db.auditEvent.findMany({
    take: limit + 1,
    ...(decodedCursor && { cursor: { id: decodedCursor.id } }),
    orderBy: { createdAt: 'desc' },
    where,
    include: {
      actor: { select: { email: true } },
      business: { select: { name: true } },
    },
  })

  const hasNextPage = records.length > limit
  const dataRecords = hasNextPage ? records.slice(0, -1) : records

  const data = dataRecords.map((evt) => ({
    id: evt.id,
    businessId: evt.businessId,
    businessName: evt.business?.name ?? null,
    actorUserId: evt.actorUserId,
    actorEmail: evt.actor.email,
    actorPlatformRole: evt.actorPlatformRole,
    action: evt.action,
    resourceType: evt.resourceType,
    resourceId: evt.resourceId,
    metadata: evt.metadata,
    createdAt: evt.createdAt.toISOString(),
  }))

  const nextCursor =
    hasNextPage && dataRecords.length > 0
      ? encodeCursor({
          id: dataRecords[dataRecords.length - 1]!.id,
          createdAt: dataRecords[dataRecords.length - 1]!.createdAt.toISOString(),
        })
      : null

  return reply.send({
    data,
    nextCursor,
  })
}

export async function adminStartSupportSession(
  request: FastifyRequest<{
    Body: { businessId: string; reason: string }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)

  const { businessId, reason } = request.body
  const user = (request as any).user

  const business = await db.business.findUnique({
    where: { id: businessId },
  })
  if (!business) {
    throw { statusCode: 404, message: 'Business not found' }
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

  const supportSession = await db.adminSupportSession.create({
    data: {
      siteAdminUserId: user.id,
      businessId,
      reason,
      expiresAt,
    },
  })

  if (user.sessionId) {
    await db.session.update({
      where: { id: user.sessionId },
      data: { supportSessionId: supportSession.id },
    })
  }

  await emitAuditEvent({
    actor: user,
    action: 'SUPPORT_SESSION_STARTED',
    resourceType: 'ADMIN_SUPPORT_SESSION',
    resourceId: supportSession.id,
    businessId,
    metadata: { reason, expiresAt: expiresAt.toISOString() },
  })

  return reply.send({ data: { supportSessionId: supportSession.id } })
}

export async function adminEndSupportSession(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user
  if (!user.supportSessionId) {
    throw { statusCode: 400, message: 'Not in a support session' }
  }

  await db.adminSupportSession.update({
    where: { id: user.supportSessionId },
    data: { endedAt: new Date() },
  })

  if (user.sessionId) {
    await db.session.update({
      where: { id: user.sessionId },
      data: { supportSessionId: null },
    })
  }

  await emitAuditEvent({
    actor: user,
    action: 'SUPPORT_SESSION_ENDED',
    resourceType: 'ADMIN_SUPPORT_SESSION',
    resourceId: user.supportSessionId,
    businessId: user.businessId,
  })

  return reply.send({ success: true })
}
