import type { AdPlatformConnector } from '../types'
import { GRAPH_VERSION } from './graph'
import { graphGet, graphPost, requireId } from './graph'
import type { PushDraftInput, PushDraftResult } from '../types'

export function metaConfigured() {
  return Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI,
  )
}

function requireConfig() {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const redirectUri = process.env.META_REDIRECT_URI
  if (!appId || !appSecret || !redirectUri)
    throw { statusCode: 503, message: 'Meta is not configured' }
  return { appId, appSecret, redirectUri }
}

function assertPaused(body: Record<string, string>) {
  if (body.status && body.status !== 'PAUSED') {
    throw { statusCode: 500, message: 'Meta push must never send ACTIVE' }
  }
}

export const metaConnector: AdPlatformConnector = {
  platform: 'META',
  capabilities: {
    oauth: true,
    mappingFields: ['adAccount', 'page', 'defaultCountry'],
    pushDraft: true,
    pullSpend: false,
    activate: false,
  },
  configured: metaConfigured,
  authUrl(state) {
    const { appId, redirectUri } = requireConfig()
    const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`)
    url.searchParams.set('client_id', appId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('state', state)
    url.searchParams.set(
      'scope',
      'ads_management,ads_read,pages_show_list,pages_read_engagement,business_management',
    )
    return url.toString()
  },
  async exchangeCode(code) {
    const { appId, appSecret, redirectUri } = requireConfig()
    const short = await graphGet('/oauth/access_token', '', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    })
    const shortToken = String(short.access_token ?? '')
    const longLived = await graphGet('/oauth/access_token', '', {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    })
    const accessToken = String(longLived.access_token ?? shortToken)
    const expiresIn = Number(longLived.expires_in ?? 0)
    const me = await graphGet('/me', accessToken, { fields: 'id' })
    return {
      accessToken,
      expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
      externalUserId: String(me.id ?? ''),
    }
  },
  async listAccounts(token) {
    const json = await graphGet('/me/adaccounts', token, { fields: 'id,name,account_id' })
    const data = (json.data as { id: string; name: string }[]) ?? []
    return data.map((row) => ({ id: row.id, name: row.name }))
  },
  async listPages(token) {
    const json = await graphGet('/me/accounts', token, { fields: 'id,name' })
    const data = (json.data as { id: string; name: string }[]) ?? []
    return data.map((row) => ({ id: row.id, name: row.name }))
  },
  async pushDraft(input) {
    return pushDraft(input)
  },
  managerUrl(result, ctx) {
    const act = ctx.adAccountId.startsWith('act_') ? ctx.adAccountId : `act_${ctx.adAccountId}`
    const url = new URL('https://www.facebook.com/adsmanager/manage/campaigns')
    url.searchParams.set('act', act.replace(/^act_/, ''))
    url.searchParams.set('selected_campaign_ids', result.externalCampaignId)
    return url.toString()
  },
}

async function pushDraft(input: PushDraftInput): Promise<PushDraftResult> {
  const act = input.adAccountId.startsWith('act_') ? input.adAccountId : `act_${input.adAccountId}`
  const image = await graphPost(`/${act}/adimages`, input.accessToken, {
    bytes: input.image.bytes.toString('base64'),
    name: input.image.filename,
  })
  const images = image.images as Record<string, { hash?: string }> | undefined
  const hash = images ? Object.values(images)[0]?.hash : undefined
  if (!hash) throw { statusCode: 502, message: 'Meta image upload returned no hash' }

  const campaignBody = {
    name: `${input.campaignName} / ${input.creativeName}`.slice(0, 200),
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: '[]',
  }
  assertPaused(campaignBody)
  const campaign = await graphPost(`/${act}/campaigns`, input.accessToken, campaignBody)

  const adSetBody = {
    name: `${input.creativeName} set`.slice(0, 200),
    campaign_id: requireId(campaign, 'campaign'),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    daily_budget: String(Math.max(100, input.dailyBudgetCents)),
    targeting: JSON.stringify({ geo_locations: { countries: [input.defaultCountry] } }),
    promoted_object: JSON.stringify({ page_id: input.pageId }),
    destination_type: 'WEBSITE',
    status: 'PAUSED',
  }
  assertPaused(adSetBody)
  const adSet = await graphPost(`/${act}/adsets`, input.accessToken, adSetBody)

  const creative = await graphPost(`/${act}/adcreatives`, input.accessToken, {
    name: input.creativeName.slice(0, 200),
    object_story_spec: JSON.stringify({
      page_id: input.pageId,
      link_data: {
        image_hash: hash,
        link: input.trackedUrl,
        message: input.message,
        name: input.creativeName,
        call_to_action: { type: 'LEARN_MORE', value: { link: input.trackedUrl } },
      },
    }),
  })

  const adBody = {
    name: input.creativeName.slice(0, 200),
    adset_id: requireId(adSet, 'ad set'),
    creative: JSON.stringify({ creative_id: requireId(creative, 'creative') }),
    status: 'PAUSED',
  }
  assertPaused(adBody)
  const ad = await graphPost(`/${act}/ads`, input.accessToken, adBody)

  return {
    externalCampaignId: requireId(campaign, 'campaign'),
    externalAdSetId: requireId(adSet, 'ad set'),
    externalAdId: requireId(ad, 'ad'),
  }
}
