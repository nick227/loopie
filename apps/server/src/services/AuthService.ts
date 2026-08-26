import { db, hashSessionToken, randomSessionToken } from '@project/db'
import bcrypt from 'bcryptjs'
import { normalizeEmail } from '../lib/identityResolution'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

type UserWithBusiness = {
  id: string
  email: string
  businessId: string
  role: string
  createdAt: Date
  business: { name: string }
}

export function toUserDTO(user: UserWithBusiness) {
  return {
    id: user.id,
    email: user.email,
    businessId: user.businessId,
    businessName: user.business.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }
}

export class AuthService {
  async register(data: { email: string; password: string; businessName: string }) {
    const email = normalizeEmail(data.email)
    if (!email) throw { statusCode: 400, message: 'Email is required' }
    const hash = await bcrypt.hash(data.password, 12)
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hash,
        business: { create: { name: data.businessName } },
      },
      include: { business: true },
    })
    const session = await this._createSession(user.id)
    return { user: toUserDTO(user), token: session.token }
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

    const session = await this._createSession(user.id)
    return { user: toUserDTO(user), token: session.token }
  }

  async logout(token: string) {
    await db.session.deleteMany({ where: { token: hashSessionToken(token) } })
  }

  private async _createSession(userId: string) {
    const token = randomSessionToken()
    await db.session.create({
      data: {
        userId,
        token: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    })
    return { token }
  }
}
