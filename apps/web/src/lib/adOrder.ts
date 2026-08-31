export type AdOrder = {
  dailyBudget: number
  startDate: string
  endDate: string
  country: string
  location: string
  // Radius in miles around `location`, once it's real targeting and not a LOOPIE-only note — see
  // targetingConsequenceNote below. 0/undefined means country-only.
  radiusMiles?: number
  destinationLandingPageId: string
  destinationUrl: string
  destinationLandingPageVersion: string | null
  mediaName: string
  assetIds: string[]
  goal: string
  successEvent: string
}

export type AdOrderSnapshot = AdOrder & {
  where: string
}

export type LoopieRunState = 'not_sent' | 'draft_sent' | 'failed' | 'needs_attention'
export type PlatformDelivery = 'paused' | 'active' | 'ended' | 'unknown'

export type RunActions = {
  activate: boolean
  pause: boolean
  end: boolean
  editBudget: boolean
  editSchedule: boolean
  editAudience: boolean
}

// Capability-driven, not platform-name conditionals — these booleans come straight from the
// connector's own real PlatformCapabilities (via usePlatformConnection), never a hardcoded
// per-platform guess here. A platform with no registered connector (or not yet connected) simply
// has every capability false, which is exactly what an absent `caps` argument defaults to.
export function runActionsFromCapabilities(caps?: Partial<RunActions> | null): RunActions {
  return {
    activate: caps?.activate ?? false,
    pause: caps?.pause ?? false,
    end: caps?.end ?? false,
    editBudget: caps?.editBudget ?? false,
    editSchedule: caps?.editSchedule ?? false,
    editAudience: caps?.editAudience ?? false,
  }
}

// Whether changing a field happens on the same external object (IN_PLACE — a live editor like
// Budget/Schedule's), requires a new provider execution instead (RECREATE — the "Create new
// version" relaunch flow), or can't be changed from LOOPIE yet (NONE). Mirrors the server's
// EditMode/FieldEditModes exactly (see apps/server/src/lib/platforms/types.ts) — this is the
// contract the UI reads to explain the *consequence* of an edit before the user commits to it.
export type EditMode = 'NONE' | 'IN_PLACE' | 'RECREATE'
export type EditModeField = 'budget' | 'schedule' | 'creative' | 'destination' | 'targeting'
export type FieldEditModes = Record<EditModeField, EditMode>

const EDIT_MODE_FIELDS: EditModeField[] = [
  'budget',
  'schedule',
  'creative',
  'destination',
  'targeting',
]

// Same discipline as runActionsFromCapabilities below — reads whatever editModes the connector's
// own capabilities actually declared, defaults anything undeclared to NONE. No platform-name
// branch anywhere in this function or its callers; a fake connector with a wholly different
// editModes shape drives wholly different output.
export function editModesFromCapabilities(
  caps?: { editModes?: Partial<Record<EditModeField, EditMode>> } | null,
): FieldEditModes {
  const result = {} as FieldEditModes
  for (const field of EDIT_MODE_FIELDS) {
    result[field] = caps?.editModes?.[field] ?? 'NONE'
  }
  return result
}

// What actually happens if this field is changed — surfaced *before* the user opens an editor or
// clicks relaunch, so "budget" and "creative" don't read as the same kind of action just because
// both eventually route through some button. Takes the brand name so the sentence names the real
// platform, not a generic "the platform."
export function editConsequenceLabel(mode: EditMode, brand: string): string {
  switch (mode) {
    case 'IN_PLACE':
      return `Updates the current ${brand} run directly.`
    case 'RECREATE':
      return `Creates a new ${brand} version — the current run keeps delivering until you switch.`
    case 'NONE':
    default:
      return `Can't be changed from LOOPIE yet.`
  }
}

export function loopieRunState(run: {
  status: string
  externalAdId?: string | null
}): LoopieRunState {
  if (run.status === 'VALIDATION_FAILED' || run.status === 'PROVISIONING_FAILED') return 'failed'
  if (run.externalAdId) return 'draft_sent'
  if (run.status === 'PENDING') return 'not_sent'
  return 'needs_attention'
}

export function platformDelivery(run: {
  status: string
  externalAdId?: string | null
}): PlatformDelivery {
  if (!run.externalAdId) return 'unknown'
  if (run.status === 'ENDED') return 'ended'
  if (run.status === 'ACTIVE') return 'active'
  return 'paused'
}

export const LOOPIE_STATE_LABEL: Record<LoopieRunState, string> = {
  not_sent: 'Not sent',
  draft_sent: 'Draft sent',
  failed: 'Failed',
  needs_attention: 'Needs attention',
}

export const PLATFORM_DELIVERY_LABEL: Record<PlatformDelivery, string> = {
  paused: 'Paused',
  active: 'Active',
  ended: 'Ended',
  unknown: 'Unknown / not synced',
}

// The platform's own delivery state, pulled by AdRunSyncService — a second, independent axis
// from LoopieRunState above. A run can be locally "Draft sent" while the platform itself reports
// "Rejected," and both must stay visible at once, never collapsed into one badge.
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

export type SyncHealth = 'CURRENT' | 'DELAYED' | 'FAILED' | 'DISCONNECTED' | 'NEVER_SYNCED'

export const PROVIDER_STATE_LABEL: Record<ProviderDeliveryState, string> = {
  NOT_SENT: 'Not sent',
  DRAFT_SENT: 'Draft sent',
  UNDER_REVIEW: 'Under review',
  ELIGIBLE: 'Eligible',
  LIVE: 'Live',
  PAUSED: 'Paused',
  LIMITED: 'Limited delivery',
  REJECTED: 'Rejected',
  ENDED: 'Ended',
  UNKNOWN: 'Unknown',
}

export const SYNC_HEALTH_LABEL: Record<SyncHealth, string> = {
  CURRENT: 'Synced',
  DELAYED: 'Sync delayed',
  FAILED: 'Sync failed',
  DISCONNECTED: 'Disconnected',
  NEVER_SYNCED: 'Not yet synced',
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'just now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function parseOrderSnapshot(value: unknown): AdOrderSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.dailyBudget !== 'number' || typeof row.where !== 'string') return null
  return {
    dailyBudget: row.dailyBudget,
    startDate: typeof row.startDate === 'string' ? row.startDate : '',
    endDate: typeof row.endDate === 'string' ? row.endDate : '',
    country: typeof row.country === 'string' ? row.country : '',
    location: typeof row.location === 'string' ? row.location : '',
    destinationLandingPageId:
      typeof row.destinationLandingPageId === 'string' ? row.destinationLandingPageId : '',
    destinationUrl: typeof row.destinationUrl === 'string' ? row.destinationUrl : '',
    // Older snapshots (before Phase 0's audit-trail freeze) won't have these — default rather
    // than reject, since a pre-existing sent run's snapshot is still meaningful without them.
    destinationLandingPageVersion:
      typeof row.destinationLandingPageVersion === 'string'
        ? row.destinationLandingPageVersion
        : null,
    mediaName: typeof row.mediaName === 'string' ? row.mediaName : '',
    assetIds: Array.isArray(row.assetIds)
      ? row.assetIds.filter((id): id is string => typeof id === 'string')
      : [],
    goal: typeof row.goal === 'string' ? row.goal : '',
    successEvent: typeof row.successEvent === 'string' ? row.successEvent : '',
    where: row.where,
  }
}

export function localTimezoneLabel() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'local time'
  }
}

export function dateInput(value = new Date()) {
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

// Resolves the picked calendar day in the browser's own local timezone, not blind UTC — a
// business owner in Central time picking "Sep 1" as a start date means their own local midnight,
// not `2026-09-01T00:00:00Z` (7pm Aug 31 Central), which would start the order before their own
// chosen day. `new Date(y, m, d, ...)` is interpreted in the runtime's local zone by spec.
function localDate(date: string, h: number, m: number, s: number, ms: number) {
  const parts = date.split('-').map(Number)
  const y = parts[0] ?? 0
  const mo = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(y, mo - 1, d, h, m, s, ms)
}

export function toStartIso(date: string) {
  return localDate(date, 0, 0, 0, 0).toISOString()
}

export function toEndIso(date: string) {
  return localDate(date, 23, 59, 59, 999).toISOString()
}

export function estimatedMaximum(daily: number, start: string, end: string) {
  if (!end) return null
  const days =
    Math.round(
      (new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000,
    ) + 1
  if (!Number.isFinite(days) || days < 1) return null
  return daily * days
}

export function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

export function scheduleLine(start: string, end: string) {
  if (!start && !end) return 'Until manually stopped'
  if (!end) return `${formatDay(start)} – ongoing`
  return `${formatDay(start)} – ${formatDay(end)}`
}

function formatDay(value: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// The proposal's "signature element" — one sentence generated from typed data, shown both before
// send (live preview, from in-progress form state) and after (the frozen MediaOrderRevision) —
// so the two never phrase the same commitment two different ways. Takes real ISO instants (not
// yyyy-mm-dd strings) specifically so both call sites can feed it the exact same shape: the live
// preview converts via toStartIso/toEndIso before calling this, the frozen revision already has
// real instants stored.
export function buildAuthorizationSentence(input: {
  brand: string
  where: string
  goal: string
  country: string
  location?: string | null
  dailyBudget: number
  startIso: string
  endIso: string | null
  mediaName: string
  accountName?: string | null
}) {
  const start = new Date(input.startIso)
  const end = input.endIso ? new Date(input.endIso) : null
  const days =
    end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
      ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      : null
  const budgetPhrase =
    days && days > 0
      ? `up to ${money(input.dailyBudget * days)}`
      : `${money(input.dailyBudget)}/day`
  const schedulePhrase = end
    ? `from ${formatLocalDay(start)} through ${formatLocalDay(end)}`
    : `starting ${formatLocalDay(start)}, until manually stopped`
  const audience = [input.country, input.location].filter(Boolean).join(' · ')
  const account = input.accountName ? ` · ${input.accountName}` : ''
  return `Spend ${budgetPhrase} to ${input.goal || 'run this ad'} from ${audience || 'your target audience'} on ${input.where}, ${schedulePhrase}, using ${input.mediaName}, billed to ${input.brand}${account}.`
}

function formatLocalDay(date: Date) {
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Same phrasing as scheduleLine, but for real ISO instants (AdRun.startDate/endDate,
// effectiveStartDate/effectiveEndDate) rather than yyyy-mm-dd form inputs — used wherever a
// schedule is displayed after the fact, not being actively edited.
export function scheduleLineFromIso(startIso: string | null, endIso: string | null) {
  if (!startIso) return 'Not yet synced'
  const start = new Date(startIso)
  if (!endIso) return `${formatLocalDay(start)} – until manually stopped`
  return `${formatLocalDay(start)} – ${formatLocalDay(new Date(endIso))}`
}

// One-line description of a targeting spec — country-only, or a resolved radius location. Used
// both for the requested (LOOPIE ordered) and effective (platform-reported) lines, same shared-
// formatter discipline as scheduleLineFromIso above.
export function targetingLine(
  country: string | null,
  locationNote: string | null,
  radiusMiles: number | null,
): string {
  if (!country) return 'Not yet synced'
  if (!locationNote) return country
  return `${locationNote}${radiusMiles ? ` + ${radiusMiles} mi` : ''} (${country})`
}
