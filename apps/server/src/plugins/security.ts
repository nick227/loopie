import { db } from '@project/db'

// No adminAuth variant — V1 has no admin routes (see CLAUDE.md Parking lot).
export async function bearerAuth(request: any, _reply: any, _params: any) {
  // cookie-first (web); Bearer header fallback (native apps / tests)
  const token =
    request.cookies?.token ??
    request.headers.authorization?.replace('Bearer ', '')

  if (!token) throw { statusCode: 401, message: 'Unauthorized' }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { business: true } } },
  })

  if (!session || session.expiresAt < new Date()) {
    throw { statusCode: 401, message: 'Session expired' }
  }

  if (session.user.suspendedAt) {
    throw { statusCode: 403, message: 'Account suspended' }
  }

  request.user = session.user
}
