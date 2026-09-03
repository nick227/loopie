import { db, hashSessionToken } from '@project/db'
import { loadAuthUser } from '../lib/membership'

// Shared lookup, never throws — just "a live session's user, or null." bearerAuth below is the
// hard-auth wrapper every normal route uses (it keeps its own distinct 401 vs 403 messages, not
// collapsed into this); lib/riverViewer.ts#resolveOptionalViewer is the one place that calls this
// directly to get a non-throwing "who, if anyone" answer for a public (security: []) route — for
// that use, a suspended account is correctly treated the same as no session at all.
export async function resolveSessionUser(token: string | undefined) {
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token: hashSessionToken(token) },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date() || session.user.deletedAt) return null
  if (session.user.suspendedAt) return null

  return loadAuthUser(session.userId, {
    id: session.id,
    activeBusinessId: session.activeBusinessId,
  })
}

// No adminAuth variant — V1 has no admin routes (see CLAUDE.md Parking lot).
export async function bearerAuth(request: any, _reply: any, _params: any) {
  // cookie-first (web); Bearer header fallback (native apps / tests)
  const token = request.cookies?.token ?? request.headers.authorization?.replace('Bearer ', '')

  if (!token) throw { statusCode: 401, message: 'Unauthorized' }

  const session = await db.session.findUnique({
    where: { token: hashSessionToken(token) },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
    throw { statusCode: 401, message: 'Session expired' }
  }

  if (session.user.suspendedAt) {
    throw { statusCode: 403, message: 'Account suspended' }
  }

  request.user = await loadAuthUser(session.userId, {
    id: session.id,
    activeBusinessId: session.activeBusinessId,
  })
}
