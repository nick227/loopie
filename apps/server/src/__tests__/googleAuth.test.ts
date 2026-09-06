import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, testUserId } from './helpers'
import { db, hashSessionToken } from '@project/db'
import { issueOAuthState } from '../lib/platforms/oauthState'

const app = buildTestApp()

const GOOGLE_ENV = {
  GOOGLE_CLIENT_ID: 'google-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'GOCSPX-test-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3001/auth/google/callback',
  SESSION_SECRET: 'test-session-secret-at-least-32-chars',
  PUBLIC_APP_URL: 'http://localhost:5173',
}

function mockGoogleIdentity(opts: {
  email: string
  emailVerified?: boolean
  name?: string
  /** Extra fields that must never become roles */
  extra?: Record<string, unknown>
}) {
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('oauth2.googleapis.com/token')) {
      return {
        ok: true,
        json: () => ({ access_token: 'access-token', expires_in: 3600 }),
      }
    }
    if (url.includes('openidconnect.googleapis.com/v1/userinfo')) {
      return {
        ok: true,
        json: () => ({
          email: opts.email,
          email_verified: opts.emailVerified ?? true,
          name: opts.name ?? 'Pat Example',
          ...opts.extra,
        }),
      }
    }
    return { ok: false, json: () => ({ error: 'unexpected' }) }
  })
}

function authState(returnPath = '/') {
  return issueOAuthState({
    businessId: '_auth',
    platform: 'GOOGLE_LOGIN',
    returnPath,
  })
}

describe('Google login/registration', () => {
  beforeEach(() => {
    Object.assign(process.env, GOOGLE_ENV)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const key of Object.keys(GOOGLE_ENV)) delete process.env[key]
  })

  it('logs in an existing user by verified Google email and sets the session cookie', async () => {
    mockGoogleIdentity({ email: 'alice@test.local' })
    const state = authState('/calendar')

    const res = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=ok&state=${encodeURIComponent(state)}`,
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('http://localhost:5173/calendar')

    const cookie = String(res.headers['set-cookie'] ?? '')
    const raw = cookie.match(/token=([^;]+)/)?.[1]
    expect(raw).toBeTruthy()

    const session = await db.session.findFirst({ where: { userId: testUserId } })
    expect(session).toBeTruthy()
    expect(session!.token).toBe(hashSessionToken(raw!))

    const userCount = await db.user.count({ where: { email: 'alice@test.local' } })
    expect(userCount).toBe(1)
  })

  it('registers a new USER with founder OWNER membership and sends them to business setup', async () => {
    mockGoogleIdentity({
      email: 'newbie@example.com',
      name: 'New Person',
      extra: {
        // Must never be interpreted as platform/membership roles.
        role: 'SITE_ADMIN',
        platformRole: 'SITE_ADMIN',
        hd: 'admin.google.com',
      },
    })
    const state = authState('/')

    const res = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=ok&state=${encodeURIComponent(state)}`,
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('http://localhost:5173/business/setup')

    const user = await db.user.findUniqueOrThrow({ where: { email: 'newbie@example.com' } })
    expect(user.platformRole).toBe('USER')

    const membership = await db.businessMembership.findUniqueOrThrow({
      where: { userId_businessId: { userId: user.id, businessId: user.businessId } },
    })
    expect(membership.role).toBe('OWNER')
    expect(membership.isFounder).toBe(true)

    const cookie = String(res.headers['set-cookie'] ?? '')
    const raw = cookie.match(/token=([^;]+)/)?.[1]
    expect(raw).toBeTruthy()
    const session = await db.session.findFirst({ where: { userId: user.id } })
    expect(session!.token).toBe(hashSessionToken(raw!))
  })

  it('rejects an invalid callback (bad state / missing code) without creating a session', async () => {
    mockGoogleIdentity({ email: 'attacker@example.com' })

    const badState = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=ok&state=not-a-valid-state',
    })
    expect(badState.statusCode).toBe(302)
    expect(String(badState.headers.location)).toContain('/login')
    expect(String(badState.headers.location)).toContain('error=google_auth_failed')
    expect(badState.headers['set-cookie']).toBeUndefined()

    const missingCode = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?state=${encodeURIComponent(authState())}`,
    })
    expect(missingCode.statusCode).toBe(302)
    expect(String(missingCode.headers.location)).toContain('error=google_auth_failed')
    expect(await db.user.findUnique({ where: { email: 'attacker@example.com' } })).toBeNull()
  })

  it('never elevates platformRole from Google claims; email register also creates USER + founder OWNER', async () => {
    mockGoogleIdentity({
      email: 'claims@example.com',
      extra: { role: 'ADMIN', platformRole: 'SITE_ADMIN', membershipRole: 'OWNER' },
    })

    const googleRes = await app.inject({
      method: 'GET',
      url: `/auth/google/callback?code=ok&state=${encodeURIComponent(authState())}`,
    })
    expect(googleRes.statusCode).toBe(302)

    const googleUser = await db.user.findUniqueOrThrow({ where: { email: 'claims@example.com' } })
    expect(googleUser.platformRole).toBe('USER')
    expect(googleUser.platformRole).not.toBe('SITE_ADMIN')

    const emailRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'email-reg@example.com',
        password: 'password12',
        businessName: 'Email Reg Co',
      },
    })
    expect(emailRes.statusCode).toBe(201)
    expect(emailRes.json().data.platformRole).toBe('USER')
    expect(emailRes.json().data.membershipRole).toBe('OWNER')
    expect(emailRes.json().data.isFounder).toBe(true)

    const emailUser = await db.user.findUniqueOrThrow({ where: { email: 'email-reg@example.com' } })
    expect(emailUser.platformRole).toBe('USER')
  })

  it('redirects startGoogleAuth to Google with openid email profile scopes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/google?returnTo=/profile',
    })
    expect(res.statusCode).toBe(302)
    const location = String(res.headers.location)
    expect(location).toContain('accounts.google.com')
    expect(location).toContain('client_id=google-client-id')
    expect(location).toContain('scope=openid+email+profile')
    expect(location).toContain('state=')
  })
})
