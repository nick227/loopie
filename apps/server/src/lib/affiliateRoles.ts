import { AuthUser } from './membership'

export function requireAdmin(user: AuthUser) {
  if (user.membershipRole !== 'OWNER') throw { statusCode: 403, message: 'Admin only' }
}

export function requireAdminOrAffiliate(user: AuthUser) {
  if (user.membershipRole !== 'OWNER' && user.platformRole !== 'AFFILIATE')
    throw { statusCode: 403, message: 'Forbidden' }
}

export function requireAffiliate(user: AuthUser) {
  if (user.platformRole !== 'AFFILIATE') throw { statusCode: 403, message: 'Affiliate only' }
}
