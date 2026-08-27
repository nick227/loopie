import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

const SID_TTL_SEC = 7 * 24 * 60 * 60

function secret() {
  const value = process.env.SESSION_SECRET
  if (value) return value
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required')
  return 'dev-session-secret-not-for-production'
}

function mac(sessionId: string, exp: number, scope?: string) {
  const payload = scope ? `${sessionId}.${exp}.${scope}` : `${sessionId}.${exp}`
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

// `scope` (used for a business id) is bound into the MAC itself, not just carried as a plain
// segment, so a token minted for one scope can never be replayed as valid for another — see
// CLAUDE.md's CRM integration review: the public /t/session endpoint returned another tenant's
// session state because sids were being verified with no notion of which business they belonged
// to. Callers that don't care about scoping (the pre-existing deployment/adRun/ad-unit click and
// landing-page-submission flows, which already scope by other means) keep working unchanged —
// an unscoped issueSid/verifySid call produces/accepts the original 3-segment token format.
export function issueSid(
  sessionId: string = randomUUID(),
  scope?: string,
): { sessionId: string; token: string } {
  const exp = Math.floor(Date.now() / 1000) + SID_TTL_SEC
  const digest = mac(sessionId, exp, scope)
  const token = scope ? `${sessionId}.${exp}.${scope}.${digest}` : `${sessionId}.${exp}.${digest}`
  return { sessionId, token }
}

export function verifySid(
  token: string | undefined | null,
  expectedScope?: string,
): { sessionId: string; scope?: string } | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3 && parts.length !== 4) return null
  const hasScope = parts.length === 4
  const [sessionId, expRaw, third, fourth] = parts
  const scope = hasScope ? third : undefined
  const digest = hasScope ? fourth : third
  const exp = Number(expRaw)
  if (!sessionId || !digest || !Number.isFinite(exp)) return null
  if (exp < Math.floor(Date.now() / 1000)) return null
  // A caller that requires a specific scope must get a token minted for that exact scope —
  // an unscoped token, or one scoped to something else, is rejected outright, never reused.
  if (expectedScope !== undefined && scope !== expectedScope) return null
  const expected = mac(sessionId, exp, scope)
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return { sessionId, scope }
}

export function resolveVisitorSid(
  presented?: string | null,
  scope?: string,
): { sessionId: string; token: string } {
  const existing = verifySid(presented, scope)?.sessionId
  return issueSid(existing ?? randomUUID(), scope)
}
