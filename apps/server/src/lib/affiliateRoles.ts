export type AuthedUser = { id: string; businessId: string; role: string }

export function requireAdmin(user: AuthedUser) {
  if (user.role !== 'ADMIN') throw { statusCode: 403, message: 'Admin only' }
}

export function requireAdminOrAffiliate(user: AuthedUser) {
  if (user.role !== 'ADMIN' && user.role !== 'AFFILIATE') throw { statusCode: 403, message: 'Forbidden' }
}

export function requireAffiliate(user: AuthedUser) {
  if (user.role !== 'AFFILIATE') throw { statusCode: 403, message: 'Affiliate only' }
}
