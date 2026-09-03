import { randomBytes } from 'crypto'
import type { BusinessMemberRole } from '@prisma/client'
import { db } from '@project/db'
import { normalizeEmail } from '../lib/identityResolution'
import type { AuthUser } from '../lib/membership'
import { ensureHomeMembership, loadAuthUser } from '../lib/membership'

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000

function requireOwner(actor: AuthUser) {
  if (actor.membershipRole !== 'OWNER') {
    throw { statusCode: 403, message: 'Only company owners can manage the team' }
  }
}

function invitationToken() {
  return randomBytes(24).toString('base64url')
}

function toMemberDTO(row: {
  userId: string
  role: BusinessMemberRole
  isFounder: boolean
  jobTitle: string | null
  suspendedAt: Date | null
  createdAt: Date
  user: { email: string }
}) {
  return {
    userId: row.userId,
    email: row.user.email,
    role: row.role,
    isFounder: row.isFounder,
    jobTitle: row.jobTitle,
    suspendedAt: row.suspendedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

function toInvitationDTO(row: {
  id: string
  email: string
  role: BusinessMemberRole
  jobTitle: string | null
  token: string
  expiresAt: Date
  createdAt: Date
}) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    jobTitle: row.jobTitle,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    acceptUrl: `/invitations/${row.token}/accept`,
  }
}

export class TeamService {
  async listMyBusinesses(actor: AuthUser) {
    await ensureHomeMembership(db, actor)
    const memberships = await db.businessMembership.findMany({
      where: { userId: actor.id },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    })
    return memberships.map((m) => ({
      id: m.businessId,
      name: m.business.name,
      logoUrl: m.business.logoUrl,
      role: m.role,
      isFounder: m.isFounder,
      jobTitle: m.jobTitle,
      active: m.businessId === actor.businessId,
    }))
  }

  async setActiveBusiness(actor: AuthUser, businessId: string) {
    const membership = await db.businessMembership.findUnique({
      where: { userId_businessId: { userId: actor.id, businessId } },
    })
    if (!membership) throw { statusCode: 403, message: 'Not a member of that company' }

    if (actor.sessionId) {
      await db.session.update({
        where: { id: actor.sessionId },
        data: { activeBusinessId: businessId },
      })
      return loadAuthUser(actor.id, { id: actor.sessionId, activeBusinessId: businessId })
    }

    // Test/auth-bypass path: no real Session row — park the active company on User.businessId.
    await db.user.update({ where: { id: actor.id }, data: { businessId } })
    return loadAuthUser(actor.id, undefined)
  }

  async getTeam(actor: AuthUser) {
    const members = await db.businessMembership.findMany({
      where: { businessId: actor.businessId },
      include: { user: { select: { email: true } } },
      orderBy: [{ isFounder: 'desc' }, { createdAt: 'asc' }],
    })
    const invitations = await db.businessInvitation.findMany({
      where: {
        businessId: actor.businessId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })
    return {
      members: members.map(toMemberDTO),
      invitations: invitations.map(toInvitationDTO),
      canManage: actor.membershipRole === 'OWNER',
    }
  }

  async invite(
    actor: AuthUser,
    input: { email: string; role?: BusinessMemberRole; jobTitle?: string },
  ) {
    requireOwner(actor)
    const email = normalizeEmail(input.email)
    if (!email) throw { statusCode: 400, message: 'Email is required' }
    if (email === actor.email) throw { statusCode: 400, message: 'You are already on this team' }

    const role: BusinessMemberRole = input.role ?? 'MEMBER'
    const jobTitle = input.jobTitle?.trim() || null

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      const existingMembership = await db.businessMembership.findUnique({
        where: { userId_businessId: { userId: existingUser.id, businessId: actor.businessId } },
      })
      if (existingMembership) {
        throw { statusCode: 409, message: 'That user is already on this team' }
      }
    }

    const pending = await db.businessInvitation.findFirst({
      where: {
        businessId: actor.businessId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
    if (pending)
      throw { statusCode: 409, message: 'An invitation is already pending for that email' }

    const row = await db.businessInvitation.create({
      data: {
        businessId: actor.businessId,
        email,
        role,
        jobTitle,
        token: invitationToken(),
        invitedByUserId: actor.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    })
    return toInvitationDTO(row)
  }

  async updateMember(
    actor: AuthUser,
    userId: string,
    input: { role?: BusinessMemberRole; jobTitle?: string | null; suspended?: boolean },
  ) {
    requireOwner(actor)
    const membership = await db.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId: actor.businessId } },
      include: { user: { select: { email: true } } },
    })
    if (!membership) throw { statusCode: 404, message: 'Team member not found' }

    if (membership.isFounder) {
      if (input.suspended === true) {
        throw { statusCode: 403, message: 'The founder cannot be suspended' }
      }
      if (input.role === 'MEMBER') {
        throw { statusCode: 403, message: 'The founder cannot be demoted' }
      }
    }

    if (input.role === 'MEMBER' && membership.role === 'OWNER') {
      const ownerCount = await db.businessMembership.count({
        where: { businessId: actor.businessId, role: 'OWNER' },
      })
      if (ownerCount <= 1) {
        throw { statusCode: 400, message: 'Cannot demote the last owner' }
      }
    }

    const memberData: Record<string, unknown> = {}
    if (input.role !== undefined) memberData.role = input.role
    if (input.jobTitle !== undefined) memberData.jobTitle = input.jobTitle?.trim() || null
    if (input.suspended !== undefined) {
      memberData.suspendedAt = input.suspended ? new Date() : null
    }

    const updated = await db.$transaction(async (tx) => {
      const row = await tx.businessMembership.update({
        where: { id: membership.id },
        data: memberData,
        include: { user: { select: { email: true, suspendedAt: true } } },
      })
      // Immediately invalidate sessions pointing at this company when suspending.
      if (input.suspended) {
        await tx.session.updateMany({
          where: { userId, activeBusinessId: actor.businessId },
          data: { activeBusinessId: null },
        })
      }
      return row
    })
    return toMemberDTO(updated)
  }

  async removeMember(actor: AuthUser, userId: string) {
    requireOwner(actor)
    if (userId === actor.id) throw { statusCode: 400, message: 'You cannot remove yourself' }

    const membership = await db.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId: actor.businessId } },
    })
    if (!membership) throw { statusCode: 404, message: 'Team member not found' }
    if (membership.isFounder) {
      throw { statusCode: 403, message: 'The founder cannot be removed' }
    }
    if (membership.role === 'OWNER') {
      const ownerCount = await db.businessMembership.count({
        where: { businessId: actor.businessId, role: 'OWNER' },
      })
      if (ownerCount <= 1) {
        throw { statusCode: 400, message: 'Cannot remove the last owner' }
      }
    }

    await db.$transaction(async (tx) => {
      await tx.businessMembership.delete({ where: { id: membership.id } })
      await tx.session.updateMany({
        where: { userId, activeBusinessId: actor.businessId },
        data: { activeBusinessId: null },
      })
    })
  }

  async getMemberMetrics(actor: AuthUser, userId: string) {
    const membership = await db.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId: actor.businessId } },
      include: { user: { select: { email: true, suspendedAt: true } } },
    })
    if (!membership) throw { statusCode: 404, message: 'Team member not found' }

    const businessId = actor.businessId
    const [notesWritten, pagesPublished, adRevisionsCreated] = await Promise.all([
      db.contactNote.count({
        where: { businessId, authorUserId: userId, deletedAt: null },
      }),
      db.publishedPageVersion.count({
        where: { publishedBy: userId, landingPage: { businessId } },
      }),
      db.mediaOrderRevision.count({
        where: { businessId, createdByUserId: userId },
      }),
    ])

    return {
      userId: membership.userId,
      email: membership.user.email,
      role: membership.role,
      isFounder: membership.isFounder,
      jobTitle: membership.jobTitle,
      suspendedAt: membership.user.suspendedAt?.toISOString() ?? null,
      memberSince: membership.createdAt.toISOString(),
      metrics: {
        notesWritten,
        pagesPublished,
        adRevisionsCreated,
      },
    }
  }

  async getInvitation(token: string) {
    const invite = await db.businessInvitation.findUnique({
      where: { token },
      include: { business: { select: { name: true } } },
    })
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw { statusCode: 404, message: 'Invitation not found or expired' }
    }
    return {
      email: invite.email,
      businessName: invite.business.name,
      role: invite.role,
      jobTitle: invite.jobTitle,
      expiresAt: invite.expiresAt.toISOString(),
    }
  }

  async acceptInvitation(actor: AuthUser, token: string) {
    const invite = await db.businessInvitation.findUnique({ where: { token } })
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw { statusCode: 404, message: 'Invitation not found or expired' }
    }
    if (normalizeEmail(actor.email) !== invite.email) {
      throw { statusCode: 403, message: 'This invitation was sent to a different email address' }
    }

    const existing = await db.businessMembership.findUnique({
      where: { userId_businessId: { userId: actor.id, businessId: invite.businessId } },
    })
    if (existing) {
      await db.businessInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      })
    } else {
      await db.$transaction(async (tx) => {
        await tx.businessMembership.create({
          data: {
            userId: actor.id,
            businessId: invite.businessId,
            role: invite.role,
            jobTitle: invite.jobTitle,
            isFounder: false,
          },
        })
        await tx.businessInvitation.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        })
      })
    }

    if (actor.sessionId) {
      await db.session.update({
        where: { id: actor.sessionId },
        data: { activeBusinessId: invite.businessId },
      })
      return loadAuthUser(actor.id, {
        id: actor.sessionId,
        activeBusinessId: invite.businessId,
      })
    }
    await db.user.update({
      where: { id: actor.id },
      data: { businessId: invite.businessId },
    })
    return loadAuthUser(actor.id, undefined)
  }
}
