import { db } from '@project/db'
import { sealToken, unsealToken } from '../lib/platforms/encrypt'
import { issueOAuthState, verifyOAuthState } from '../lib/platforms/oauthState'
import { appBaseUrl } from '../lib/stripe'
import { getLiveConnector } from '../lib/crm/registry'
import { normalizeShop } from '../lib/crm/shopify'
import { catalogEntry } from '../lib/crm/catalog'
import type { CrmProvider } from '@prisma/client'

type Creds = { accessToken: string; refreshToken?: string; shop?: string }

export function readCreds(enc: string | null): Creds | null {
  if (!enc) return null
  return JSON.parse(unsealToken(enc)) as Creds
}

export function writeCreds(creds: Creds) {
  return sealToken(JSON.stringify(creds))
}

const PROVIDERS: CrmProvider[] = ['HUBSPOT', 'SALESFORCE', 'SHOPIFY', 'SQUARE', 'PIPEDRIVE']

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
        }),
      },
    })
    const dest = new URL(parsed.returnPath.split('?')[0] || '/integrations', appBaseUrl())
    dest.searchParams.set('connected', provider)
    return dest.toString()
  }
}
