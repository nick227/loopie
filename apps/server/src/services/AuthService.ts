import { randomBytes } from 'crypto'
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
        platformRole: string
        createdAt: Date
        business: {
          name: string
          subscriptionStatus: string | null
          identityCompletedAt: Date | null
        }
        membershipRole?: string
        isFounder?: boolean
        jobTitle?: string | null
        isSupportMode?: boolean
        supportSessionId?: string | null
      },
) {
  return {
    id: user.id,
    email: user.email,
    businessId: user.businessId,
    businessName: user.business.name,
    platformRole: user.platformRole,
    membershipRole: ('membershipRole' in user && user.membershipRole) || 'OWNER',
    isFounder: ('isFounder' in user && user.isFounder) || false,
    jobTitle: ('jobTitle' in user ? user.jobTitle : null) ?? null,
    subscriptionStatus: user.business.subscriptionStatus,
    businessIdentityCompletedAt: user.business.identityCompletedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    isSupportMode: ('isSupportMode' in user && user.isSupportMode) || false,
    supportSessionId: ('supportSessionId' in user ? user.supportSessionId : null) ?? null,
  }
}

export class AuthService {
  async register(data: { email: string; password: string; businessName: string }) {
    const email = normalizeEmail(data.email)
    if (!email) throw { statusCode: 400, message: 'Email is required' }
    const hash = await bcrypt.hash(data.password, 12)
    const user = await this.createAccountWithBusiness(email, hash, data.businessName)
    const session = await this._createSession(user.id, user.businessId)
    return {
      user: toUserDTO({
        ...user,
        membershipRole: 'OWNER' as const,
        isFounder: true,
        jobTitle: 'Founder',
        sessionId: session.id,
      }),
      token: session.token,
      isNewUser: true as const,
    }
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
    return {
      user: toUserDTO({
        ...user,
        businessId: membership.businessId,
        membershipRole: membership.role,
        isFounder: membership.isFounder,
        jobTitle: membership.jobTitle,
        sessionId: session.id,
      }),
      token: session.token,
      isNewUser: false as const,
    }
  }

  /**
   * Login or register from a verified Google identity (email already normalized + verified).
   * Roles are never taken from Google claims — new accounts use the same bootstrap as email register.
   */
  async loginOrRegisterWithGoogle(data: { email: string; displayName?: string | null }) {
    const email = normalizeEmail(data.email)
    if (!email) throw { statusCode: 400, message: 'Email is required' }

    const existing = await db.user.findUnique({
      where: { email },
      include: { business: true },
    })
    if (existing) {
      if (existing.deletedAt) throw { statusCode: 401, message: 'Invalid credentials' }
      if (existing.suspendedAt) throw { statusCode: 403, message: 'Account suspended' }

      const { ensureHomeMembership } = await import('../lib/membership')
      const membership = await ensureHomeMembership(db, existing)
      const session = await this._createSession(existing.id, membership.businessId)
      return {
        user: toUserDTO({
          ...existing,
          businessId: membership.businessId,
          membershipRole: membership.role,
          isFounder: membership.isFounder,
          jobTitle: membership.jobTitle,
          sessionId: session.id,
        }),
        token: session.token,
        isNewUser: false as const,
      }
    }

    const hash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12)
    const businessName = placeholderBusinessName(data.displayName, email)
    const user = await this.createAccountWithBusiness(email, hash, businessName)
    const session = await this._createSession(user.id, user.businessId)
    return {
      user: toUserDTO({
        ...user,
        membershipRole: 'OWNER' as const,
        isFounder: true,
        jobTitle: 'Founder',
        sessionId: session.id,
      }),
      token: session.token,
      isNewUser: true as const,
    }
  }

  /** Shared bootstrap: User (platformRole USER) + Business + founder OWNER membership. */
  async createAccountWithBusiness(email: string, passwordHash: string, businessName: string) {
    return db.$transaction(async (tx) => {
      const slug = await nextUniqueBusinessSlug(tx, businessName)
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          platformRole: 'USER',
          business: { create: { name: businessName, slug } },
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

function placeholderBusinessName(displayName: string | null | undefined, email: string) {
  const fromName = displayName?.trim()
  if (fromName) {
    const clipped = fromName.slice(0, 100)
    return clipped.toLowerCase().endsWith('business') ? clipped : `${clipped}'s Business`
  }
  const local = email.split('@')[0]?.trim() || 'My'
  return `${local.slice(0, 80)}'s Business`
}
