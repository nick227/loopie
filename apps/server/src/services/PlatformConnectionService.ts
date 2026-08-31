import { db } from '@project/db'
import { getConnector, tryGetConnector } from '../lib/platforms/registry'
import { sealToken, unsealToken } from '../lib/platforms/encrypt'
import { issueOAuthState, verifyOAuthState } from '../lib/platforms/oauthState'
import { appBaseUrl } from '../lib/stripe'
import { notifyIntegrationConnected, notifyIntegrationDisconnected } from '../lib/integrationInbox'
import type { Platform } from '@prisma/client'

const EXTERNAL: Platform[] = ['META', 'GOOGLE', 'TIKTOK']

function asPlatform(value: string): Platform {
  if (!EXTERNAL.includes(value as Platform)) {
    throw { statusCode: 400, message: 'Invalid platform' }
  }
  return value as Platform
}

function mappedStatus(row: {
  adAccountId: string | null
  pageId: string | null
  mappingFields: string[]
}) {
  const needAccount = row.mappingFields.includes('adAccount')
  const needPage = row.mappingFields.includes('page')
  if (needAccount && !row.adAccountId) return 'INCOMPLETE' as const
  if (needPage && !row.pageId) return 'INCOMPLETE' as const
  return 'CONNECTED' as const
}

function toDTO(
  platform: string,
  row: {
    status: string
    adAccountId: string | null
    accountName?: string | null
    currency?: string | null
    timezone?: string | null
    pageId: string | null
    defaultCountry: string
  } | null,
  capabilities: ReturnType<typeof getConnector>['capabilities'],
  configured: boolean,
) {
  return {
    platform,
    status: row ? row.status : 'DISCONNECTED',
    adAccountId: row?.adAccountId ?? null,
    accountName: row?.accountName ?? null,
    currency: row?.currency ?? null,
    timezone: row?.timezone ?? null,
    pageId: row?.pageId ?? null,
    defaultCountry: row?.defaultCountry ?? 'US',
    capabilities,
    configured,
  }
}

export class PlatformConnectionService {
  async get(businessId: string, platformRaw: string) {
    const platform = asPlatform(platformRaw)
    const connector = tryGetConnector(platform)
    if (!connector) {
      return toDTO(
        platform,
        null,
        {
          oauth: false,
          mappingFields: [],
          pushDraft: false,
          pullSpend: false,
          pullStatus: false,
          activate: false,
          pause: false,
          end: false,
        },
        false,
      )
    }
    return this._load(businessId, platform, connector)
  }

  async startOAuth(businessId: string, platformRaw: string, returnPath?: string) {
    const platform = asPlatform(platformRaw)
    const connector = getConnector(platform)
    if (!connector.capabilities.oauth)
      throw { statusCode: 501, message: 'This platform does not support OAuth' }
    if (!connector.configured()) throw { statusCode: 503, message: `${platform} is not configured` }
    const path = returnPath && returnPath.startsWith('/') ? returnPath : '/campaigns'
    const state = issueOAuthState({ businessId, platform, returnPath: path })
    return { url: connector.authUrl(state) }
  }

  async handleCallback(platformRaw: string, code: string | undefined, state: string | undefined) {
    const platform = asPlatform(platformRaw)
    const parsed = verifyOAuthState(state)
    if (!parsed || parsed.platform !== platform)
      throw { statusCode: 400, message: 'Invalid OAuth state' }
    if (!code) throw { statusCode: 400, message: 'Missing OAuth code' }
    const connector = getConnector(platform)
    if (!connector.configured()) throw { statusCode: 503, message: `${platform} is not configured` }
    const exchanged = await connector.exchangeCode(code)
    const existing = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId: parsed.businessId, platform } },
    })
    const mapping = {
      adAccountId: existing?.adAccountId ?? null,
      pageId: existing?.pageId ?? null,
      mappingFields: connector.capabilities.mappingFields,
    }
    const status = mappedStatus(mapping)
    await db.platformConnection.upsert({
      where: { businessId_platform: { businessId: parsed.businessId, platform } },
      create: {
        businessId: parsed.businessId,
        platform,
        accessTokenEnc: sealToken(exchanged.accessToken),
        tokenExpiresAt: exchanged.expiresAt,
        externalUserId: exchanged.externalUserId,
        status,
      },
      update: {
        accessTokenEnc: sealToken(exchanged.accessToken),
        tokenExpiresAt: exchanged.expiresAt,
        externalUserId: exchanged.externalUserId,
        status,
      },
    })
    const dest = new URL(parsed.returnPath, appBaseUrl())
    dest.searchParams.set('connected', platform)
    return dest.toString()
  }

  async update(
    businessId: string,
    platformRaw: string,
    data: { adAccountId?: string; pageId?: string; defaultCountry?: string },
  ) {
    const platform = asPlatform(platformRaw)
    const connector = getConnector(platform)
    const existing = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId, platform } },
    })
    if (!existing) throw { statusCode: 409, message: 'Connect this platform first' }
    const adAccountId = data.adAccountId ?? existing.adAccountId
    const pageId = data.pageId ?? existing.pageId
    const defaultCountry = (data.defaultCountry ?? existing.defaultCountry).toUpperCase()
    const status = mappedStatus({
      adAccountId,
      pageId,
      mappingFields: connector.capabilities.mappingFields,
    })

    // Selecting an ad account is also the one honest moment to learn what it's actually called
    // and billed in — display name, currency, account timezone. Best-effort: a lookup failure
    // (rate limit, transient network error) must not block the account selection itself, it just
    // leaves identity fields unset for this pass, same as they'd be if we never added this at all.
    let accountName = existing.accountName
    let currency = existing.currency
    let timezone = existing.timezone
    if (data.adAccountId && data.adAccountId !== existing.adAccountId) {
      try {
        const accounts = await connector.listAccounts(unsealToken(existing.accessTokenEnc))
        const match = accounts.find((account) => account.id === adAccountId)
        accountName = match?.name ?? null
        currency = match?.currency ?? null
        timezone = match?.timezone ?? null
      } catch {
        accountName = null
        currency = null
        timezone = null
      }
    }

    const row = await db.platformConnection.update({
      where: { id: existing.id },
      data: { adAccountId, accountName, currency, timezone, pageId, defaultCountry, status },
    })
    // Only a genuine transition INTO connected (not every settings tweak on an already-connected
    // account) is Inbox-worthy — see integrationInbox.ts's own doc comment on why this stays
    // narrow to real transitions only.
    if (existing.status !== 'CONNECTED' && status === 'CONNECTED') {
      await notifyIntegrationConnected(businessId, platform)
    }
    return toDTO(platform, row, connector.capabilities, connector.configured())
  }

  async disconnect(businessId: string, platformRaw: string) {
    const platform = asPlatform(platformRaw)
    const connector = tryGetConnector(platform)
    const existing = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId, platform } },
    })
    await db.platformConnection.deleteMany({ where: { businessId, platform } })
    if (existing) {
      await notifyIntegrationDisconnected(businessId, platform)
    }
    return toDTO(
      platform,
      null,
      connector?.capabilities ?? {
        oauth: false,
        mappingFields: [],
        pushDraft: false,
        pullSpend: false,
        pullStatus: false,
        activate: false,
        pause: false,
        end: false,
      },
      connector?.configured() ?? false,
    )
  }

  async listAccounts(businessId: string, platformRaw: string) {
    const { connector, token } = await this._authed(businessId, platformRaw)
    return connector.listAccounts(token)
  }

  async listPages(businessId: string, platformRaw: string) {
    const { connector, token } = await this._authed(businessId, platformRaw)
    return connector.listPages(token)
  }

  private async _load(
    businessId: string,
    platform: Platform,
    connector: ReturnType<typeof getConnector>,
  ) {
    const row = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId, platform } },
    })
    return toDTO(platform, row, connector.capabilities, connector.configured())
  }

  private async _authed(businessId: string, platformRaw: string) {
    const platform = asPlatform(platformRaw)
    const connector = getConnector(platform)
    if (!connector.configured()) throw { statusCode: 503, message: `${platform} is not configured` }
    const row = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId, platform } },
    })
    if (!row) throw { statusCode: 409, message: 'Connect this platform first' }
    return { connector, token: unsealToken(row.accessTokenEnc), row }
  }
}
