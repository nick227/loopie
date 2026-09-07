import { AuthService, toUserDTO } from '../services/AuthService'
import { appBaseUrl } from '../lib/stripe'
import {
  exchangeGoogleAuthCode,
  googleAuthUrl,
  googleLoginConfigured,
  verifyGoogleAuthState,
} from '../lib/googleLogin'

const authService = new AuthService()

const COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // Production: web (Vercel) and API (Railway) are on different domains — cross-site XHR
  // requires SameSite=None with Secure=true or the browser blocks the cookie.
  // Dev: both apps run on localhost, which is same-site regardless of port, so Lax works.
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
}

function safeReturnPath(raw: string | undefined, fallback: string) {
  if (raw?.startsWith('/') && !raw.startsWith('//')) return raw
  return fallback
}

/** Removes only `ref` from a path's query string, preserving every other param — the referral
 * code is a signup-time-only concern smuggled through the OAuth state's returnPath and must never
 * leak into the app, but any other deep-link param (e.g. `?tab=budget`) belongs to the caller. */
function stripRefParam(path: string): string {
  const [base, query] = path.split('?')
  if (!query) return path
  const params = new URLSearchParams(query)
  params.delete('ref')
  const rest = params.toString()
  return rest ? `${base}?${rest}` : (base ?? path)
}

export async function register(request: any, reply: any) {
  const { user, token } = await authService.register(request.body)
  reply.setCookie('token', token, COOKIE)
  return reply.status(201).send({ data: user })
}

export async function login(request: any, reply: any) {
  const { user, token } = await authService.login(request.body)
  reply.setCookie('token', token, COOKIE)
  return reply.send({ data: user })
}

export async function logout(request: any, reply: any) {
  const token = request.cookies?.token ?? request.headers.authorization?.replace('Bearer ', '')
  if (token) await authService.logout(token)
  reply.clearCookie('token', { path: '/' })
  return reply.send({ data: null })
}

export function getCurrentUser(request: any, reply: any) {
  return reply.send({ data: toUserDTO(request.user) })
}

export function startGoogleAuth(
  request: { query: { returnTo?: string } },
  reply: {
    header: (name: string, value: string) => { redirect: (code: number, url: string) => unknown }
  },
) {
  if (!googleLoginConfigured()) throw { statusCode: 503, message: 'Google login is not configured' }
  const returnPath = safeReturnPath(request.query.returnTo, '/')
  const url = googleAuthUrl(returnPath)
  return reply.header('Cache-Control', 'no-store').redirect(302, url)
}

export async function handleGoogleAuthCallback(
  request: {
    query: { code?: string; state?: string; error?: string }
    log?: { error: (obj: unknown, msg?: string) => unknown }
  },
  reply: {
    setCookie: (name: string, value: string, opts: typeof COOKIE) => unknown
    header: (name: string, value: string) => { redirect: (code: number, url: string) => unknown }
  },
) {
  const fail = (reason: string, detail?: unknown) => {
    if (detail !== undefined) {
      const log = request.log?.error?.bind(request.log) ?? console.error
      log({ reason, detail }, 'google_auth_failed')
    }
    const dest = new URL('/login', appBaseUrl())
    dest.searchParams.set('error', reason)
    return reply.header('Cache-Control', 'no-store').redirect(302, dest.toString())
  }

  try {
    if (request.query.error || !request.query.code)
      return fail('google_auth_failed', { stage: 'query', queryError: request.query.error })
    const parsed = verifyGoogleAuthState(request.query.state)
    if (!parsed) return fail('google_auth_failed', { stage: 'state' })

    const identity = await exchangeGoogleAuthCode(request.query.code)
    if (!identity.emailVerified || !identity.email)
      return fail('google_auth_failed', { stage: 'identity', identity })

    const referralCode = new URLSearchParams(parsed.returnPath.split('?')[1] ?? '').get('ref')
    const { token, isNewUser } = await authService.loginOrRegisterWithGoogle({
      email: identity.email,
      displayName: identity.name,
      referralCode,
    })
    reply.setCookie('token', token, COOKIE)

    const returnPathWithoutRef = stripRefParam(parsed.returnPath)
    const nextPath = isNewUser ? '/business/setup' : safeReturnPath(returnPathWithoutRef, '/')
    const dest = new URL(nextPath, appBaseUrl())
    return reply.header('Cache-Control', 'no-store').redirect(302, dest.toString())
  } catch (err) {
    return fail('google_auth_failed', { stage: 'exception', err: String(err) })
  }
}
