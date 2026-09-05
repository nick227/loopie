import { formBody, jsonFetch } from './crm/http'
import { issueOAuthState, verifyOAuthState } from './platforms/oauthState'

const SCOPES = 'openid email profile'
const AUTH_PLATFORM = 'GOOGLE_LOGIN'
const AUTH_BUSINESS_ID = '_auth'

export type GoogleIdentity = {
  email: string
  emailVerified: boolean
  name: string | null
}

function requireConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.TRACKING_BASE_URL ?? 'http://localhost:3001'}/auth/google/callback`
  if (!clientId || !clientSecret)
    throw { statusCode: 503, message: 'Google login is not configured' }
  return { clientId, clientSecret, redirectUri }
}

export function googleLoginConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function googleAuthUrl(returnPath: string) {
  const { clientId, redirectUri } = requireConfig()
  const state = issueOAuthState({
    businessId: AUTH_BUSINESS_ID,
    platform: AUTH_PLATFORM,
    returnPath,
  })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('prompt', 'select_account')
  url.searchParams.set('state', state)
  return url.toString()
}

export function verifyGoogleAuthState(state: string | undefined) {
  const parsed = verifyOAuthState(state)
  if (!parsed || parsed.platform !== AUTH_PLATFORM || parsed.businessId !== AUTH_BUSINESS_ID) {
    return null
  }
  return parsed
}

export async function exchangeGoogleAuthCode(code: string): Promise<GoogleIdentity> {
  const { clientId, clientSecret, redirectUri } = requireConfig()
  const token = await jsonFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
    errorLabel: 'Google token',
  })
  const accessToken = String(token.access_token ?? '')
  if (!accessToken) throw { statusCode: 502, message: 'Google token missing access_token' }

  const userinfo = await jsonFetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    errorLabel: 'Google userinfo',
  })

  const email = String(userinfo.email ?? '')
  const emailVerified = userinfo.email_verified === true || userinfo.email_verified === 'true'
  const name = typeof userinfo.name === 'string' ? userinfo.name : null
  return { email, emailVerified, name }
}
