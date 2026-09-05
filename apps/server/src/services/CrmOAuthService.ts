import { db } from '@project/db'
import { sealToken, unsealToken } from '../lib/platforms/encrypt'
import { issueOAuthState, verifyOAuthState } from '../lib/platforms/oauthState'
import { appBaseUrl } from '../lib/stripe'
import { getLiveConnector } from '../lib/crm/registry'
import { normalizeShop } from '../lib/crm/shopify'
import { catalogEntry } from '../lib/crm/catalog'
import { refreshAccessToken as refreshGoogleToken } from '../lib/crm/googleSheets'
import type { CrmProvider, Integration } from '@prisma/client'

export type Creds = {
  accessToken: string
  refreshToken?: string
  shop?: string
  consumerSecret?: string
  // Set only for connectors whose access tokens actually expire (today: GOOGLE_SHEETS) — see
  // ensureFreshToken. Absent for everything else, matching those connectors' existing behavior.
  expiresAt?: string
}

export function readCreds(enc: string | null): Creds | null {
  if (!enc) return null
  return JSON.parse(unsealToken(enc)) as Creds
}

export function writeCreds(creds: Creds) {
  return sealToken(JSON.stringify(creds))
}

const PROVIDERS: CrmProvider[] = [
  'HUBSPOT',
  'SALESFORCE',
  'SHOPIFY',
  'WOOCOMMERCE',
  'SQUARE',
  'PIPEDRIVE',
  'GOOGLE_SHEETS',
]

// Google access tokens expire after ~1 hour, unlike this file's other providers (HubSpot/Shopify
// tokens are long-lived in practice) — refresh here, once, before any Sheets API call, rather than
// growing a generic per-provider refresh contract nothing else needs yet. Returns a live access
// token and persists the refreshed creds so the next call doesn't refresh again unnecessarily.
export async function ensureFreshToken(integration: Integration): Promise<Creds> {
  const creds = readCreds(integration.credentialsEnc)
  if (!creds?.accessToken) throw { statusCode: 409, message: 'Connect this account first' }
  if (integration.provider !== 'GOOGLE_SHEETS') return creds
  const expiresAt = creds.expiresAt ? new Date(creds.expiresAt) : null
  const stillFresh = expiresAt && expiresAt.getTime() - Date.now() > 60_000
  if (stillFresh) return creds
  if (!creds.refreshToken) throw { statusCode: 409, message: 'Reconnect this Google account' }
  const refreshed = await refreshGoogleToken(creds.refreshToken)
  const nextCreds: Creds = {
    ...creds,
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt?.toISOString(),
  }
  await db.integration.update({
    where: { id: integration.id },
    data: { credentialsEnc: writeCreds(nextCreds) },
  })
  return nextCreds
}

function asProvider(value: string): CrmProvider {
  if (!PROVIDERS.includes(value as CrmProvider))
    throw { statusCode: 400, message: 'Unknown CRM provider' }
  return value as CrmProvider
}

export class CrmOAuthService {
  async start(
    businessId: string,
    providerRaw: string,
    opts: { shop?: string; returnPath?: string },
  ) {
    const provider = asProvider(providerRaw)
    const live = getLiveConnector(provider)
    if (!live.configured()) throw { statusCode: 503, message: `${provider} is not configured` }
    const shop = provider === 'SHOPIFY' ? normalizeShop(opts.shop ?? '') : undefined
    const entry = catalogEntry(provider)!
    const existing = await db.integration.findFirst({
      where: { businessId, provider, ...(shop ? { externalAccountId: shop } : {}) },
    })
    const row =
      existing ??
      (await db.integration.create({
        data: {
          businessId,
          provider,
          label: entry.label,
          externalAccountId: shop ?? null,
          status: 'INCOMPLETE',
          capabilities: entry.capabilities as object,
        },
      }))
    const returnPath = opts.returnPath?.startsWith('/') ? opts.returnPath : '/integrations'
    const dest = new URL(returnPath, 'http://loopie.local')
    dest.searchParams.set('iid', row.id)
    const state = issueOAuthState({
      businessId,
      platform: `crm:${provider}`,
      returnPath: `${dest.pathname}?${dest.searchParams.toString()}`,
    })
    return { url: live.authUrl(state, { shop: row.externalAccountId ?? shop }) }
  }

  async handleCallback(providerRaw: string, code: string | undefined, state: string | undefined) {
    const provider = asProvider(providerRaw)
    const parsed = verifyOAuthState(state)
    if (!parsed || parsed.platform !== `crm:${provider}`)
      throw { statusCode: 400, message: 'Invalid OAuth state' }
    if (!code) throw { statusCode: 400, message: 'Missing OAuth code' }
    const live = getLiveConnector(provider)
    if (!live.configured()) throw { statusCode: 503, message: `${provider} is not configured` }
    const iid = new URL(parsed.returnPath, 'http://loopie.local').searchParams.get('iid')
    if (!iid) throw { statusCode: 400, message: 'Missing integration id' }
    const row = await db.integration.findFirst({
      where: { id: iid, businessId: parsed.businessId, provider },
    })
    if (!row) throw { statusCode: 404, message: 'Integration not found' }
    const token = await live.exchangeCode(code, { shop: row.externalAccountId ?? undefined })
    await db.integration.update({
      where: { id: row.id },
      data: {
        status: 'CONNECTED',
        externalAccountId: token.externalAccountId || row.externalAccountId,
        credentialsEnc: writeCreds({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          shop: token.externalAccountId || row.externalAccountId || undefined,
          expiresAt: token.expiresAt?.toISOString(),
        }),
      },
    })
    const dest = new URL(parsed.returnPath.split('?')[0] || '/integrations', appBaseUrl())
    dest.searchParams.set('connected', provider)
    return dest.toString()
  }
}
