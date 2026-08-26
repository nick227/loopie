import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

const SID_TTL_SEC = 7 * 24 * 60 * 60

function secret() {
  const value = process.env.SESSION_SECRET
  if (value) return value
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required')
  return 'dev-session-secret-not-for-production'
}

function mac(sessionId: string, exp: number) {
  return createHmac('sha256', secret()).update(`${sessionId}.${exp}`).digest('hex')
}

export function issueSid(sessionId: string = randomUUID()): { sessionId: string; token: string } {
  const exp = Math.floor(Date.now() / 1000) + SID_TTL_SEC
  return { sessionId, token: `${sessionId}.${exp}.${mac(sessionId, exp)}` }
}

export function verifySid(token: string | undefined | null): { sessionId: string } | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [sessionId, expRaw, digest] = parts
  const exp = Number(expRaw)
  if (!sessionId || !digest || !Number.isFinite(exp)) return null
  if (exp < Math.floor(Date.now() / 1000)) return null
  const expected = mac(sessionId, exp)
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return { sessionId }
}

export function resolveVisitorSid(presented?: string | null): { sessionId: string; token: string } {
  const existing = verifySid(presented)?.sessionId
  return issueSid(existing ?? randomUUID())
}
