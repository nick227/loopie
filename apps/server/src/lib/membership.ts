import type { Business, BusinessMemberRole, BusinessMembership, Prisma, User } from '@prisma/client'
import { db } from '@project/db'

export type AuthUser = User & {
  business: Business
  membershipRole: BusinessMemberRole
  isFounder: boolean
  jobTitle: string | null
  /** Session id when resolved via bearerAuth — used to switch active company. */
  sessionId?: string
}

type Tx = Prisma.TransactionClient | typeof db

/**
 * Ensure the user has a membership for their legacy User.businessId.
 * Backfills OWNER (+ founder when no founder exists yet) so pre-Teams accounts keep working.
 */
export async function ensureHomeMembership(tx: Tx, user: User): Promise<BusinessMembership> {
  const existing = await tx.businessMembership.findUnique({
    where: { userId_businessId: { userId: user.id, businessId: user.businessId } },
  })
  if (existing) return existing

  const founderExists = await tx.businessMembership.findFirst({
    where: { businessId: user.businessId, isFounder: true },
    select: { id: true },
  })
  // First membership for a company without a founder becomes founder+OWNER.
  // Otherwise map legacy User.role: ADMIN/AFFILIATE → OWNER, USER → MEMBER.
  const isFounder = !founderExists
  const role: BusinessMemberRole =
    isFounder || user.role === 'ADMIN' || user.role === 'AFFILIATE' ? 'OWNER' : 'MEMBER'

  return tx.businessMembership.create({
    data: {
      userId: user.id,
      businessId: user.businessId,
      role,
      isFounder,
    },
  })
}

export async function resolveActiveBusinessId(
  tx: Tx,
  user: User,
  sessionActiveBusinessId: string | null | undefined,
): Promise<{ businessId: string; membership: BusinessMembership }> {
  await ensureHomeMembership(tx, user)

  const preferred = sessionActiveBusinessId ?? user.businessId
  let membership = await tx.businessMembership.findUnique({
    where: { userId_businessId: { userId: user.id, businessId: preferred } },
  })

  // Skip membership if it's suspended (per-company suspension).
  if (membership?.suspendedAt) membership = null

  if (!membership) {
    // Revoked, suspended, or stale session — fall back to home, then any active membership.
    membership = await tx.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: user.businessId } },
    })
    if (membership?.suspendedAt) membership = null
    if (!membership) {
      membership = await tx.businessMembership.findFirst({
        where: { userId: user.id, suspendedAt: null },
      })
    }
  }

  if (!membership) {
    throw { statusCode: 403, message: 'No company membership' }
  }

  return { businessId: membership.businessId, membership }
}

export async function loadAuthUser(
  userId: string,
  session?: { id: string; activeBusinessId: string | null },
): Promise<AuthUser> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { business: true },
  })

  const { businessId, membership } = await resolveActiveBusinessId(
    db,
    user,
    session?.activeBusinessId,
  )

  const business =
    businessId === user.businessId
      ? user.business
      : await db.business.findUniqueOrThrow({ where: { id: businessId } })

  return {
    ...user,
    businessId,
    business,
    membershipRole: membership.role,
    isFounder: membership.isFounder,
    jobTitle: membership.jobTitle,
    sessionId: session?.id,
  }
}
