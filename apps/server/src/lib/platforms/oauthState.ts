import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const STATE_TTL_SEC = 10 * 60

function secret() {
  return process.env.SESSION_SECRET ?? 'dev-session-secret-not-for-production'
}

export function issueOAuthState(input: {
  businessId: string
  platform: string
  returnPath: string
}) {
  const exp = Math.floor(Date.now() / 1000) + STATE_TTL_SEC
  const nonce = randomBytes(16).toString('hex')
  const payload = `${input.businessId}.${input.platform}.${exp}.${nonce}.${Buffer.from(input.returnPath).toString('base64url')}`
  const mac = createHmac('sha256', secret()).update(payload).digest('hex')
  return `${payload}.${mac}`
}

export function verifyOAuthState(state: string | undefined) {
  if (!state) return null
  const parts = state.split('.')
  if (parts.length !== 6) return null
  const [businessId, platform, expRaw, nonce, returnPathB64, digest] = parts
  const exp = Number(expRaw)
  if (!businessId || !platform || !nonce || !digest || !Number.isFinite(exp)) return null
  if (exp < Math.floor(Date.now() / 1000)) return null
  const payload = `${businessId}.${platform}.${exp}.${nonce}.${returnPathB64}`
  const expected = createHmac('sha256', secret()).update(payload).digest('hex')
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const returnPath = Buffer.from(returnPathB64, 'base64url').toString('utf8')
  if (!returnPath.startsWith('/')) return null
  return { businessId, platform, returnPath }
}
