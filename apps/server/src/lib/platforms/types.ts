export type MappingField = 'adAccount' | 'page' | 'defaultCountry'

export type PlatformCapabilities = {
  oauth: boolean
  mappingFields: MappingField[]
  pushDraft: boolean
  pullSpend: boolean
  // Can fetch the pushed object's real delivery state (approved/live/paused/rejected/etc) and
  // performance metrics. Distinct from pullSpend historically being the one flag for "any
  // reporting data" — kept as its own flag since a connector could plausibly report status
  // without metrics (or vice versa) even though today's only connector, Meta, does both together.
  pullStatus: boolean
  // Can remotely activate spend — i.e. a "Resume" actually turns delivery on at the platform, not
  // just locally. Kept as its own flag rather than folded into a generic "canMutateStatus" since
  // this is the one status transition with real financial consequence; pause/end are the safe
  // direction (they can only stop spend, never start it) and get their own flags below.
  activate: boolean
  // Can remotely pause an already-active run. Safe in both directions: pausing something that was
  // never actually live is a no-op at the platform, never an error condition worth blocking on.
  pause: boolean
  // Can remotely end (archive) a run — a one-way transition, matches AdRunStatus.ENDED never being
  // reachable backward through resume.
  end: boolean
  editBudget?: boolean
  editSchedule?: boolean
  editAudience?: boolean
  // Per-field edit semantics — see EditMode/FieldEditModes below. Additive to the booleans above,
  // which stay the load-bearing flags AdRunService actually checks before attempting a mutation
  // (a field only gets a live in-place editor once both an `editX` boolean AND a real `updateX`
  // connector method exist — see updateBudget/updateSchedule). editModes is the richer, forward-
  // looking classification the UI reads to explain the *consequence* of changing a field, even for
  // fields (like targeting) that aren't wired to any mutation yet — it documents what the
  // platform's own API structurally allows, not just what LOOPIE has built so far. Where a field
  // *is* wired (budget, schedule), its mode must agree with the boolean: IN_PLACE iff the `editX`
  // flag is true.
  editModes?: Partial<FieldEditModes>
}

// Whether changing a field can happen on the SAME external object LOOPIE already created
// (IN_PLACE — a PATCH-style request against the existing ad/ad-set/campaign id), requires standing
// up a new provider execution instead (RECREATE — the existing "Create new version" relaunch flow,
// never attempted as an in-place patch), or can't be changed from LOOPIE at all yet (NONE, the
// default for anything a connector doesn't declare). This is the contract the UI consults to
// describe what an edit actually costs the business *before* they commit to it — never a
// `platform === 'META'` conditional.
export type EditMode = 'NONE' | 'IN_PLACE' | 'RECREATE'

export type FieldEditModes = {
  budget: EditMode
  schedule: EditMode
  creative: EditMode
  destination: EditMode
  targeting: EditMode
}

// Normalized provider delivery state — matches Prisma's ProviderDeliveryState enum exactly. A
// connector maps its own raw status vocabulary into this set itself, so nothing upstream ever
// branches on a platform-name conditional to interpret a status string.
export type ProviderDeliveryState =
  | 'NOT_SENT'
  | 'DRAFT_SENT'
  | 'UNDER_REVIEW'
  | 'ELIGIBLE'
  | 'LIVE'
  | 'PAUSED'
  | 'LIMITED'
  | 'REJECTED'
  | 'ENDED'
  | 'UNKNOWN'

export type SyncSnapshot = {
  providerState: ProviderDeliveryState
  providerStateRaw: string
  // Review/rejection reasons from the platform's own last read — surfaced as-is, never
  // reinterpreted. Same undefined-vs-empty convention as the rest of this type: undefined means
  // the connector didn't report anything this pull, an empty array means it reported nothing wrong.
  issues?: string[]
  spend?: number
  impressions?: number
  reach?: number
  clicks?: number
  conversions?: number
  effectiveDailyBudget?: number
  // ISO instants — undefined means "the connector didn't report one this pull," distinct from
  // null which a connector may use to mean "genuinely no end date" once one is added.
  effectiveStartAt?: string
  effectiveEndAt?: string | null
  // Provider-reported targeting, read back for drift comparison against the requested
  // country/locationNote/radiusMiles. effectiveLocationNote is a best-effort description of
  // whatever the platform resolves to — not guaranteed to echo the requested text verbatim.
  effectiveCountry?: string
  effectiveLocationNote?: string | null
  effectiveRadiusMiles?: number | null
}

export type PullSyncInput = {
  accessToken: string
  externalAdId: string
  externalAdSetId?: string | null
  externalCampaignId?: string | null
}

export type UpdateRemoteStatusInput = {
  accessToken: string
  externalAdId: string
  externalAdSetId?: string | null
  externalCampaignId?: string | null
  // What LOOPIE is requesting — the connector maps this to whatever the platform's own status
  // vocabulary needs (Meta: PAUSED/ACTIVE/ARCHIVED at every object level that was created).
  status: 'ACTIVE' | 'PAUSED' | 'ENDED'
}

export type UpdateBudgetInput = {
  accessToken: string
  externalAdSetId: string
  dailyBudgetCents: number
}

export type UpdateScheduleInput = {
  accessToken: string
  externalAdSetId: string
  startAt: string // ISO instant
  endAt: string | null // null = explicitly no end date
}

export type UpdateTargetingInput = {
  accessToken: string
  externalAdSetId: string
  country: string
  // A free-text location to resolve into a real radius-targeted spot — null/empty means
  // country-only targeting, same as today's default.
  locationNote: string | null
  radiusMiles: number | null
}

export type PlatformAccount = { id: string; name: string; currency?: string; timezone?: string }

export type PushDraftInput = {
  accessToken: string
  adAccountId: string
  pageId: string
  defaultCountry: string
  campaignName: string
  creativeName: string
  trackedUrl: string
  dailyBudgetCents: number
  image: { bytes: Buffer; filename: string; mimeType: string }
  message: string
  // Same targeting shape as UpdateTargetingInput minus accessToken/externalAdSetId (this connector
  // doesn't have an ad set id yet at push time) — optional so a caller with no targeting captured
  // yet still gets the pre-existing country-only behavior.
  locationNote?: string | null
  radiusMiles?: number | null
}

export type PushDraftResult = {
  externalCampaignId: string
  externalAdSetId: string
  externalAdId: string
}

export type AdPlatformConnector = {
  platform: string
  capabilities: PlatformCapabilities
  configured: () => boolean
  authUrl: (state: string) => string
  exchangeCode: (
    code: string,
  ) => Promise<{ accessToken: string; expiresAt: Date | null; externalUserId: string }>
  listAccounts: (token: string) => Promise<PlatformAccount[]>
  listPages: (token: string) => Promise<PlatformAccount[]>
  pushDraft: (input: PushDraftInput) => Promise<PushDraftResult>
  // Optional: a human-clickable link into the platform's own ad manager for the object pushDraft
  // just created, scoped to the connected ad account.
  managerUrl?: (result: PushDraftResult, ctx: { adAccountId: string }) => string
  // Optional: a live preview link to see the ad "in the wild"
  previewUrl?: (result: PushDraftResult, ctx: { adAccountId: string }) => string
  // Optional: pull the pushed object's real status/metrics back from the platform. Present only
  // when capabilities.pullStatus is true.
  pullSync?: (input: PullSyncInput) => Promise<SyncSnapshot>
  // Optional: request a real remote status change (pause/resume/end). Present only when the
  // corresponding capability (pause/activate/end) is true. Throwing means the request itself
  // failed — the caller must not assume anything changed at the platform. A successful return
  // means the request was accepted; the caller still re-syncs afterward rather than trusting this
  // call's success as proof of the platform's own confirmed state.
  updateRemoteStatus?: (input: UpdateRemoteStatusInput) => Promise<void>
  // Optional: request a real remote budget change. Present only when capabilities.editBudget is
  // true. Same contract as updateRemoteStatus — throwing means the request failed and nothing at
  // the platform changed; a successful return is not itself proof of the new effective value, the
  // caller re-syncs afterward to read that back.
  updateBudget?: (input: UpdateBudgetInput) => Promise<void>
  // Optional: request a real remote schedule change. Present only when capabilities.editSchedule
  // is true. Same contract as updateBudget/updateRemoteStatus — a rejected request (e.g. the
  // platform refuses to move a start time that already began delivering) throws and changes
  // nothing at the platform; success is not itself proof of the new effective schedule.
  updateSchedule?: (input: UpdateScheduleInput) => Promise<void>
  // Optional: request a real remote targeting change. Present only when capabilities.editAudience
  // is true. Same contract as updateBudget/updateSchedule — a rejected request (e.g. the location
  // can't be resolved to a real targetable spot) throws and changes nothing at the platform.
  updateTargeting?: (input: UpdateTargetingInput) => Promise<void>
}
