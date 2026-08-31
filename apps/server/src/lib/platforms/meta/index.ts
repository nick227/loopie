import type {
  AdPlatformConnector,
  ProviderDeliveryState,
  PullSyncInput,
  SyncSnapshot,
  UpdateBudgetInput,
  UpdateRemoteStatusInput,
  UpdateScheduleInput,
  UpdateTargetingInput,
} from '../types'
import { GRAPH_VERSION } from './graph'
import { graphGet, graphPost, requireId } from './graph'
import type { PushDraftInput, PushDraftResult } from '../types'

// Meta's own `effective_status` vocabulary (ad-level), mapped into LOOPIE's normalized states —
// this mapping is the one place that knows Meta's specific strings; nothing else in the app does.
const EFFECTIVE_STATUS_MAP: Record<string, ProviderDeliveryState> = {
  ACTIVE: 'LIVE',
  PAUSED: 'PAUSED',
  CAMPAIGN_PAUSED: 'PAUSED',
  ADSET_PAUSED: 'PAUSED',
  PENDING_REVIEW: 'UNDER_REVIEW',
  IN_PROCESS: 'UNDER_REVIEW',
  PREAPPROVAL: 'UNDER_REVIEW',
  PENDING_BILLING_INFO: 'UNDER_REVIEW',
  DISAPPROVED: 'REJECTED',
  WITH_ISSUES: 'LIMITED',
  ARCHIVED: 'ENDED',
  DELETED: 'ENDED',
}

function mapEffectiveStatus(raw: string): ProviderDeliveryState {
  return EFFECTIVE_STATUS_MAP[raw] ?? 'UNKNOWN'
}

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
    pullSpend: true,
    pullStatus: true,
    // Now genuinely true: updateRemoteStatus below actually calls Meta. This is the one place in
    // this connector where a LOOPIE action can start real ad spend — see AdRunService's
    // request-then-resync pattern for how "Resume" is kept from ever optimistically claiming
    // Live before Meta's own confirmed status says so.
    activate: true,
    pause: true,
    end: true,
    // Now genuinely true: updateBudget below actually calls Meta. The daily budget lives on the
    // ad set, not the ad or campaign — mirrors how pushDraft itself set it there originally.
    editBudget: true,
    // Now genuinely true: updateSchedule below actually calls Meta. Start/end also live on the
    // ad set — same object as budget. Meta itself decides whether a given change is actually
    // acceptable (e.g. moving a start time that already began delivering); this connector doesn't
    // pre-validate that, it just forwards the request and surfaces whatever Meta says.
    editSchedule: true,
    // Now genuinely true: updateTargeting below actually calls Meta, resolving locationNote via
    // Meta's own ad-geolocation search (no external geocoding provider needed) into a real
    // radius-targeted custom_locations spec, or falling back to country-only when no location is
    // set — same targeting shape pushDraft below now builds too.
    editAudience: true,
    // Field edit-mode classification, determined from Meta Graph API object structure, not
    // guessed — see EditMode's doc comment for what IN_PLACE/RECREATE mean.
    //   - budget/schedule/targeting: PATCHable directly on the ad set (daily_budget/start_time/
    //     end_time/targeting) — same object, no new id minted. IN_PLACE, and genuinely wired
    //     (updateBudget/updateSchedule/updateTargeting below). Worth noting for later, not part of
    //     this classification: Meta may reset the ad set's delivery/learning phase on a materially
    //     different targeting spec — a real operational consequence, but a separate concern from
    //     which object id changes.
    //   - creative: AdCreative objects are immutable at the Graph API — there is no PATCH for an
    //     existing creative's image/body/link, only creating a new AdCreative and repointing the
    //     Ad at it. LOOPIE treats that as a new provider execution — the existing "Create new
    //     version" relaunch flow (a fresh createAndProvision, never an in-place patch of the
    //     current run) — RECREATE.
    //   - destination: the click-through URL lives inside the creative's own object_story_spec
    //     (link_data.link), not as an independent field on the Ad/AdSet/Campaign, so changing it
    //     requires the same new-creative path as above. RECREATE for the same reason.
    editModes: {
      budget: 'IN_PLACE',
      schedule: 'IN_PLACE',
      creative: 'RECREATE',
      destination: 'RECREATE',
      targeting: 'IN_PLACE',
    },
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
    const json = await graphGet('/me/adaccounts', token, {
      fields: 'id,name,account_id,currency,timezone_name',
    })
    const data =
      (json.data as { id: string; name: string; currency?: string; timezone_name?: string }[]) ?? []
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      currency: row.currency,
      timezone: row.timezone_name,
    }))
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
  async pullSync(input) {
    return pullSync(input)
  },
  async updateRemoteStatus(input) {
    return updateRemoteStatus(input)
  },
  async updateBudget(input) {
    return updateBudget(input)
  },
  async updateSchedule(input) {
    return updateSchedule(input)
  },
  async updateTargeting(input) {
    return updateTargeting(input)
  },
}

async function pullSync(input: PullSyncInput): Promise<SyncSnapshot> {
  const ad = await graphGet(`/${input.externalAdId}`, input.accessToken, {
    fields: 'effective_status,issues_info',
  })
  const providerStateRaw = String(ad.effective_status ?? 'UNKNOWN')
  const issuesInfo = ad.issues_info as { error_message?: string }[] | undefined
  const issues = issuesInfo?.map((row) => row.error_message).filter((v): v is string => Boolean(v))

  let effectiveDailyBudget: number | undefined
  let effectiveStartAt: string | undefined
  let effectiveEndAt: string | null | undefined
  let effectiveCountry: string | undefined
  let effectiveLocationNote: string | null | undefined
  let effectiveRadiusMiles: number | null | undefined
  if (input.externalAdSetId) {
    try {
      const adSet = await graphGet(`/${input.externalAdSetId}`, input.accessToken, {
        fields: 'daily_budget,start_time,end_time,targeting',
      })
      const cents = Number(adSet.daily_budget)
      if (Number.isFinite(cents)) effectiveDailyBudget = cents / 100
      if (typeof adSet.start_time === 'string') effectiveStartAt = adSet.start_time
      // Meta omits end_time entirely on the ad set once it's unset — a genuinely open-ended
      // schedule, not "we don't know." Distinguished from effectiveStartAt (always required by
      // Meta, so its absence really would mean "couldn't determine this").
      effectiveEndAt = typeof adSet.end_time === 'string' ? adSet.end_time : null

      const targeting = adSet.targeting as { geo_locations?: GeoLocations } | undefined
      const geo = targeting?.geo_locations
      if (geo?.countries?.length) {
        effectiveCountry = geo.countries[0]
        effectiveLocationNote = null
        effectiveRadiusMiles = null
      } else if (geo?.custom_locations?.length) {
        const loc = geo.custom_locations[0]
        // Meta's custom_locations read-back doesn't reliably include a country — best-effort,
        // undefined here just means "didn't come back," not "not synced at all" (the connector
        // still reports effectiveCountry undefined rather than guessing).
        effectiveLocationNote = loc?.name ?? null
        effectiveRadiusMiles = typeof loc?.radius === 'number' ? loc.radius : null
      }
    } catch {
      // Ad set may have been deleted/archived independently — status/spend are still worth
      // reporting even if the budget/schedule/targeting comparison can't be resolved this sync.
    }
  }

  // Meta's Insights API has no plain "conversions" field — real conversion counts only exist
  // inside `actions`, keyed by whatever event types the connected ad account actually tracks.
  // This connector never configured a conversion objective (see pushDraft's OUTCOME_TRAFFIC), so
  // treat any lead-shaped action as a best-effort signal, not an authoritative count.
  const insights = await graphGet(`/${input.externalAdId}/insights`, input.accessToken, {
    fields: 'spend,impressions,reach,clicks,actions',
    date_preset: 'maximum',
  })
  const row = (insights.data as Record<string, unknown>[] | undefined)?.[0]
  const actions = row?.actions as { action_type?: string; value?: string }[] | undefined
  const conversions = actions
    ?.filter((a) => a.action_type?.toLowerCase().includes('lead'))
    .reduce((sum, a) => sum + Number(a.value ?? 0), 0)

  return {
    providerState: mapEffectiveStatus(providerStateRaw),
    providerStateRaw,
    issues: issues?.length ? issues : undefined,
    spend: row?.spend !== undefined ? Number(row.spend) : 0,
    impressions: row?.impressions !== undefined ? Number(row.impressions) : 0,
    reach: row?.reach !== undefined ? Number(row.reach) : 0,
    clicks: row?.clicks !== undefined ? Number(row.clicks) : 0,
    conversions: conversions ?? 0,
    effectiveDailyBudget,
    effectiveStartAt,
    effectiveEndAt,
    effectiveCountry,
    effectiveLocationNote,
    effectiveRadiusMiles,
  }
}

// Meta's own status vocabulary for a remote mutation, distinct from mapEffectiveStatus's *read*
// direction above — this is what LOOPIE writes, not what Meta reports back.
const REMOTE_STATUS: Record<UpdateRemoteStatusInput['status'], string> = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  // Meta has no direct "archive an ad" concept distinct from its campaign/adset — archiving the
  // campaign (the top of the object graph pushDraft created) is the one-way "this is over" action
  // that actually stops delivery for good, matching AdRunStatus.ENDED never going backward.
  ENDED: 'ARCHIVED',
}

async function updateRemoteStatus(input: UpdateRemoteStatusInput): Promise<void> {
  const status = REMOTE_STATUS[input.status]
  // Mutate every level pushDraft created, not just the ad — Meta's effective_status reflects the
  // most restrictive of ad/adset/campaign status, so pausing only the ad while its parents stay
  // ACTIVE would not actually stop delivery (see CAMPAIGN_PAUSED/ADSET_PAUSED in the read-side
  // mapping above, which exist precisely because this can otherwise diverge).
  const targets = [input.externalCampaignId, input.externalAdSetId, input.externalAdId].filter(
    (id): id is string => Boolean(id),
  )
  for (const id of targets) {
    await graphPost(`/${id}`, input.accessToken, { status })
  }
}

async function updateBudget(input: UpdateBudgetInput): Promise<void> {
  // The daily budget lives on the ad set — same object pushDraft originally set it on. Same
  // 100-cent floor pushDraft itself already enforces, so a rejected-by-Meta-minimum budget fails
  // the same way here as it would on first send, not a new, inconsistent failure mode.
  await graphPost(`/${input.externalAdSetId}`, input.accessToken, {
    daily_budget: String(Math.max(100, input.dailyBudgetCents)),
  })
}

async function updateSchedule(input: UpdateScheduleInput): Promise<void> {
  // Start/end also live on the ad set. Meta clears end_time when sent as an empty string — that
  // is the API's own "no end date" — never omitted, since omitting a field in a POST leaves it
  // unchanged rather than clearing it.
  await graphPost(`/${input.externalAdSetId}`, input.accessToken, {
    start_time: input.startAt,
    end_time: input.endAt ?? '',
  })
}

type GeoLocations = {
  countries?: string[]
  custom_locations?: { key?: string; name?: string; radius?: number; distance_unit?: string }[]
}

// Meta's own ad-geolocation search — resolves a free-text place name into a real targetable
// location key, no external geocoding provider needed. Returns null on no match rather than
// throwing, so the caller decides whether "couldn't resolve" is fatal.
async function resolveCityKey(
  accessToken: string,
  query: string,
): Promise<{ key: string; name: string } | null> {
  const result = await graphGet('/search', accessToken, {
    type: 'adgeolocation',
    q: query,
    location_types: '["city"]',
    limit: '1',
  })
  const rows = result.data as { key?: string; name?: string }[] | undefined
  const first = rows?.[0]
  if (!first?.key) return null
  return { key: first.key, name: first.name ?? query }
}

// Shared by pushDraft and updateTargeting so initial sends and later edits build the exact same
// spec shape from the exact same inputs — no country-only-at-push, real-targeting-only-on-edit
// inconsistency. No locationNote means country-only, exactly like this connector's original
// pushDraft behavior; a locationNote that can't be resolved to a real location is a hard failure,
// never a silent fallback to country-only (that would authorize a narrower audience than
// requested without saying so).
async function buildTargetingSpec(
  accessToken: string,
  country: string,
  locationNote: string | null | undefined,
  radiusMiles: number | null | undefined,
): Promise<{ geo_locations: GeoLocations }> {
  if (!locationNote) return { geo_locations: { countries: [country] } }
  const resolved = await resolveCityKey(accessToken, locationNote)
  if (!resolved) {
    throw {
      statusCode: 502,
      message: `Meta could not resolve "${locationNote}" to a real targetable location`,
    }
  }
  return {
    geo_locations: {
      custom_locations: [
        {
          key: resolved.key,
          radius: radiusMiles && radiusMiles > 0 ? radiusMiles : 10,
          distance_unit: 'mile',
        },
      ],
    },
  }
}

async function updateTargeting(input: UpdateTargetingInput): Promise<void> {
  // Targeting lives on the ad set too — same object as budget/schedule.
  const spec = await buildTargetingSpec(
    input.accessToken,
    input.country,
    input.locationNote,
    input.radiusMiles,
  )
  await graphPost(`/${input.externalAdSetId}`, input.accessToken, {
    targeting: JSON.stringify(spec),
  })
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

  // Same spec-building path updateTargeting uses later — real radius targeting from the very
  // first send, not just on a subsequent edit.
  const targetingSpec = await buildTargetingSpec(
    input.accessToken,
    input.defaultCountry,
    input.locationNote,
    input.radiusMiles,
  )

  const adSetBody = {
    name: `${input.creativeName} set`.slice(0, 200),
    campaign_id: requireId(campaign, 'campaign'),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    daily_budget: String(Math.max(100, input.dailyBudgetCents)),
    targeting: JSON.stringify(targetingSpec),
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
