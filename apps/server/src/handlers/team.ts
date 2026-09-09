import { TeamService } from '../services/TeamService'
import { toUserDTO } from '../services/AuthService'
import type { AuthUser } from '../lib/membership'
import { db } from '@project/db'
import { encodeCursor, decodeCursor, normalizeLimit } from '../lib/pagination'

const teamService = new TeamService()

export async function listMyBusinesses(request: { user: AuthUser }, reply: any) {
  const data = await teamService.listMyBusinesses(request.user)
  return reply.send({ data })
}

export async function setActiveBusiness(
  request: { user: AuthUser; body: { businessId: string } },
  reply: any,
) {
  const user = await teamService.setActiveBusiness(request.user, request.body.businessId)
  return reply.send({ data: toUserDTO(user) })
}

export async function getBusinessTeam(request: { user: AuthUser }, reply: any) {
  const data = await teamService.getTeam(request.user)
  return reply.send({ data })
}

export async function getTeamActivity(request: { user: AuthUser }, reply: any) {
  const data = await teamService.getActivity(request.user.businessId)
  return reply.send({ data })
}

export async function inviteTeamMember(
  request: {
    user: AuthUser
    body: { email: string; role?: 'OWNER' | 'MEMBER'; jobTitle?: string }
  },
  reply: any,
) {
  const data = await teamService.invite(request.user, request.body)
  return reply.status(201).send({ data })
}

export async function updateTeamMember(
  request: {
    user: AuthUser
    params: { userId: string }
    body: { role?: 'OWNER' | 'MEMBER'; jobTitle?: string | null; suspended?: boolean }
  },
  reply: any,
) {
  const data = await teamService.updateMember(request.user, request.params.userId, request.body)
  return reply.send({ data })
}

export async function removeTeamMember(
  request: { user: AuthUser; params: { userId: string } },
  reply: any,
) {
  await teamService.removeMember(request.user, request.params.userId)
  return reply.send({ data: null })
}

export async function getTeamMemberMetrics(
  request: { user: AuthUser; params: { userId: string } },
  reply: any,
) {
  const data = await teamService.getMemberMetrics(request.user, request.params.userId)
  return reply.send({ data })
}

export async function getInvitation(request: { params: { token: string } }, reply: any) {
  const data = await teamService.getInvitation(request.params.token)
  return reply.send({ data })
}

export async function acceptInvitation(
  request: { user: AuthUser; params: { token: string } },
  reply: any,
) {
  const user = await teamService.acceptInvitation(request.user, request.params.token)
  return reply.send({ data: toUserDTO(user) })
}

export async function listTeamAuditEvents(
  request: {
    user: AuthUser
    query: { limit?: number; cursor?: string }
  },
  reply: any,
) {
  const limit = normalizeLimit(request.query.limit, 100, 20)
  const { cursor } = request.query
  const decodedCursor = decodeCursor(cursor)

  const records = await db.auditEvent.findMany({
    take: limit + 1,
    ...(decodedCursor && { cursor: { id: decodedCursor.id } }),
    orderBy: { createdAt: 'desc' },
    where: { businessId: request.user.businessId },
    include: {
      actor: { select: { email: true } },
    },
  })

  const hasNextPage = records.length > limit
  const dataRecords = hasNextPage ? records.slice(0, -1) : records

  const data = dataRecords.map((evt) => ({
    id: evt.id,
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

  return reply.send({ data, nextCursor })
}
