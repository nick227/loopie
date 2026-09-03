import { db, hashSessionToken, randomSessionToken } from '@project/db'
import bcrypt from 'bcryptjs'
import { provisionDefaultPage } from '../lib/provisionDefaultPage'
import { normalizeEmail } from '../lib/identityResolution'
import { seedChannelProviders } from '../lib/channelProviders'
import { nextUniqueBusinessSlug } from '../lib/businessSlug'
import type { AuthUser } from '../lib/membership'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function toUserDTO(
  user:
    | AuthUser
    | {
        id: string
        email: string
        businessId: string
        role: string
        createdAt: Date
        business: {
          name: string
          subscriptionStatus: string | null
          identityCompletedAt: Date | null
        }
        membershipRole?: string
        isFounder?: boolean
        jobTitle?: string | null
      },
) {
  return {
    id: user.id,
    email: user.email,
    businessId: user.businessId,
    businessName: user.business.name,
    role: user.role,
    membershipRole: ('membershipRole' in user && user.membershipRole) || 'OWNER',
    isFounder: ('isFounder' in user && user.isFounder) || false,
    jobTitle: ('jobTitle' in user ? user.jobTitle : null) ?? null,
    subscriptionStatus: user.business.subscriptionStatus,
    businessIdentityCompletedAt: user.business.identityCompletedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  }
}

export class AuthService {
  async register(data: { email: string; password: string; businessName: string }) {
    const email = normalizeEmail(data.email)
    if (!email) throw { statusCode: 400, message: 'Email is required' }
    const hash = await bcrypt.hash(data.password, 12)
    const user = await db.$transaction(async (tx) => {
      const slug = await nextUniqueBusinessSlug(tx, data.businessName)
      const created = await tx.user.create({
        data: {
          email,
          passwordHash: hash,
          role: 'ADMIN',
          business: { create: { name: data.businessName, slug } },
        },
        include: { business: true },
      })
      await tx.businessMembership.create({
        data: {
          userId: created.id,
          businessId: created.businessId,
          role: 'OWNER',
          isFounder: true,
          jobTitle: 'Founder',
        },
      })
      await provisionDefaultPage(tx, {
        businessId: created.businessId,
        businessName: created.business.name,
      })
      await seedChannelProviders(tx, created.businessId)
      return created
    })
    const session = await this._createSession(user.id, user.businessId)
    const authUser = {
      ...user,
      membershipRole: 'OWNER' as const,
      isFounder: true,
      jobTitle: 'Founder',
      sessionId: session.id,
    }
    return { user: toUserDTO(authUser), token: session.token }
  }

  async login(data: { email: string; password: string }) {
    const email = normalizeEmail(data.email)
    if (!email) throw { statusCode: 401, message: 'Invalid credentials' }
    const user = await db.user.findUnique({
      where: { email },
      include: { business: true },
    })
    if (!user || user.deletedAt) throw { statusCode: 401, message: 'Invalid credentials' }

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) throw { statusCode: 401, message: 'Invalid credentials' }

    if (user.suspendedAt) throw { statusCode: 403, message: 'Account suspended' }

    const { ensureHomeMembership } = await import('../lib/membership')
    const membership = await ensureHomeMembership(db, user)
    const session = await this._createSession(user.id, membership.businessId)
    const authUser = {
      ...user,
      businessId: membership.businessId,
      membershipRole: membership.role,
      isFounder: membership.isFounder,
      jobTitle: membership.jobTitle,
      sessionId: session.id,
    }
    return { user: toUserDTO(authUser), token: session.token }
  }

  async logout(token: string) {
    await db.session.deleteMany({ where: { token: hashSessionToken(token) } })
  }

  private async _createSession(userId: string, activeBusinessId: string) {
    const token = randomSessionToken()
    const session = await db.session.create({
      data: {
        userId,
        token: hashSessionToken(token),
        activeBusinessId,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    })
    return { token, id: session.id }
  }
}
