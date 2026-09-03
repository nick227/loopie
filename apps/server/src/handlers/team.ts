import { TeamService } from '../services/TeamService'
import { toUserDTO } from '../services/AuthService'
import type { AuthUser } from '../lib/membership'

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
