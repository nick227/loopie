import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePlatformConnection } from '@project/sdk'
import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { AD_CHANGED_SINCE_SENT, AD_FINANCE_NOTE } from '@/lib/adCopy'
import {
  LOOPIE_STATE_LABEL,
  PLATFORM_DELIVERY_LABEL,
  PROVIDER_STATE_LABEL,
  buildAuthorizationSentence,
  compactNumber,
  dateInput,
  editConsequenceLabel,
  editModesFromCapabilities,
  loopieRunState,
  localTimezoneLabel,
  money,
  parseOrderSnapshot,
  platformDelivery,
  runActionsFromCapabilities,
  scheduleLine,
  scheduleLineFromIso,
  targetingLine,
  timeAgo,
  toEndIso,
  toStartIso,
} from '@/lib/adOrder'
import { paidTargetByKey, runDestinationKey } from '@/lib/adPreview'

type LandingPageOption = { id: string; name: string }

type AdRun = components['schemas']['AdRun'] & { orderSnapshot?: unknown }

export function DestinationIntentRow({
  id,
  label,
  format,
  selected,
  onToggle,
}: {
  id: string
  label: string
  format?: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        selected ? 'border-border bg-accent' : 'border-border bg-transparent',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-label={label}
        className="h-4 w-4 shrink-0 accent-primary"
      />
      <label htmlFor={id} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {format ? <span className="block text-xs text-muted-foreground">{format}</span> : null}
      </label>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
    </div>
  )
}

// The elevated tier — LOOPIE's own attribution outcomes (leads/sales/revenue/ROAS), not
// platform-reported metrics. Bigger and bolder than Metric on purpose: see
// docs/strategy/03-product-principles.md's Ownership Rule — attribution is LOOPIE's
// differentiator, and this row should read as the headline, not a peer of Spend/Reach/Clicks.
function OutcomeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function roas(spend: number, revenue: number): string {
  if (!spend) return '—'
  return `${(revenue / spend).toFixed(1)}x`
}

// Matches this app's established confirm pattern (see AffiliateDetailPage.tsx) — no shared
// dialog component exists, and a plain browser confirm is what every other consequential action
// in this app already uses.
function confirmAndRun(message: string, action?: () => void) {
  if (!action) return
  if (window.confirm(message)) action()
}

// Two-step, matching the proposal's own mockup: pick a new value, then a distinct confirm step
// that states the commitment in plain language before anything is sent. Real money, so this
// never collapses into a single click the way a plain text-field blur would.
function BudgetEditor({
  brand,
  currentDaily,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  brand: string
  currentDaily: number
  pending?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (dailyBudget: number) => void | Promise<void>
}) {
  const [step, setStep] = useState<'edit' | 'confirm'>('edit')
  const [value, setValue] = useState(currentDaily || 1)
  const valid = Number.isFinite(value) && value > 0
  const unchanged = valid && Math.abs(value - currentDaily) < 0.01

  return (
    <Modal
      title={step === 'edit' ? 'Edit budget' : `Change ${brand} budget`}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          {step === 'edit' ? (
            <Button type="button" disabled={!valid || unchanged} onClick={() => setStep('confirm')}>
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={pending} onClick={() => onConfirm(value)}>
              Change to {money(value)}/day
            </Button>
          )}
        </div>
      }
    >
      {step === 'edit' ? (
        <label className="block space-y-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Daily budget
          </span>
          <div className="flex items-center gap-1">
            <span>$</span>
            <Input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-10 w-24"
              autoFocus
            />
          </div>
        </label>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-base font-medium">
            {money(currentDaily)}/day → {money(value)}/day
          </p>
          <p className="text-muted-foreground">This changes real advertising spend.</p>
          <p className="text-muted-foreground">{brand} controls actual delivery and charges.</p>
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

// Same two-step shape as BudgetEditor, its closest cousin — pick a schedule, then a distinct
// confirm step naming the real commitment before anything is sent.
function ScheduleEditor({
  brand,
  currentStartIso,
  currentEndIso,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  brand: string
  currentStartIso: string | null
  currentEndIso: string | null
  pending?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (startIso: string, endIso: string | null) => void | Promise<void>
}) {
  const [step, setStep] = useState<'edit' | 'confirm'>('edit')
  const initialStartDay = currentStartIso ? dateInput(new Date(currentStartIso)) : dateInput()
  const initialEndDay = currentEndIso ? dateInput(new Date(currentEndIso)) : ''
  const [startDate, setStartDate] = useState(initialStartDay)
  const [noEnd, setNoEnd] = useState(!currentEndIso)
  const [endDate, setEndDate] = useState(initialEndDay)
  const timezoneLabel = localTimezoneLabel()

  const startValid = !Number.isNaN(new Date(`${startDate}T00:00:00`).getTime())
  const endValid =
    noEnd ||
    (Boolean(endDate) && new Date(`${endDate}T00:00:00`) > new Date(`${startDate}T00:00:00`))
  const valid = startValid && endValid
  const unchanged =
    startDate === initialStartDay && (noEnd ? !currentEndIso : endDate === initialEndDay)

  const nextStartIso = toStartIso(startDate)
  const nextEndIso = noEnd ? null : endDate ? toEndIso(endDate) : null

  return (
    <Modal
      title={step === 'edit' ? 'Edit schedule' : `Change ${brand} schedule`}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          {step === 'edit' ? (
            <Button type="button" disabled={!valid || unchanged} onClick={() => setStep('confirm')}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending}
              onClick={() => onConfirm(nextStartIso, nextEndIso)}
            >
              Change schedule
            </Button>
          )}
        </div>
      }
    >
      {step === 'edit' ? (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Starts
              </span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                autoFocus
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ends
              </span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={noEnd}
                aria-label="End date"
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={noEnd}
              onChange={(e) => setNoEnd(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span>No end date — run until manually stopped</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Times are resolved in your local timezone ({timezoneLabel}).
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-base font-medium">
            {scheduleLineFromIso(currentStartIso, currentEndIso)} →{' '}
            {scheduleLineFromIso(nextStartIso, nextEndIso)}
          </p>
          <p className="text-muted-foreground">This changes when {brand} actually delivers.</p>
          <p className="text-muted-foreground">{brand} controls exact timing within the day.</p>
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

// Same two-step shape as Budget/ScheduleEditor — pick new targeting, then a distinct confirm step
// naming the real commitment (an in-place edit, same as budget/schedule — unlike creative/
// destination replacement below, which are RECREATE and get their own confirm copy).
function TargetingEditor({
  brand,
  currentCountry,
  currentLocationNote,
  currentRadiusMiles,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  brand: string
  currentCountry: string
  currentLocationNote: string | null
  currentRadiusMiles: number | null
  pending?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (
    country: string,
    locationNote: string | null,
    radiusMiles: number | null,
  ) => void | Promise<void>
}) {
  const [step, setStep] = useState<'edit' | 'confirm'>('edit')
  const [country, setCountry] = useState(currentCountry)
  const [locationNote, setLocationNote] = useState(currentLocationNote ?? '')
  const [radiusMiles, setRadiusMiles] = useState(currentRadiusMiles ?? 10)

  const nextLocationNote = locationNote.trim() || null
  const nextRadiusMiles = nextLocationNote ? radiusMiles : null
  const valid = Boolean(country.trim())
  const unchanged =
    country.trim() === currentCountry &&
    nextLocationNote === (currentLocationNote ?? null) &&
    nextRadiusMiles === currentRadiusMiles

  return (
    <Modal
      title={step === 'edit' ? 'Edit targeting' : `Change ${brand} targeting`}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          {step === 'edit' ? (
            <Button type="button" disabled={!valid || unchanged} onClick={() => setStep('confirm')}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending}
              onClick={() => onConfirm(country.trim(), nextLocationNote, nextRadiusMiles)}
            >
              Change targeting
            </Button>
          )}
        </div>
      }
    >
      {step === 'edit' ? (
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Country
            </span>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} autoFocus />
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Location
              </span>
              <Input
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                placeholder="Austin, TX"
              />
            </label>
            {locationNote.trim() ? (
              <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Input
                  type="number"
                  min={1}
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value))}
                  className="h-10 w-16"
                  aria-label="Radius in miles"
                />
                mi
              </label>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {brand} resolves this into a real targeted location. Leave blank for country-only
            targeting.
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-base font-medium">
            {targetingLine(currentCountry, currentLocationNote, currentRadiusMiles)} →{' '}
            {targetingLine(country.trim(), nextLocationNote, nextRadiusMiles)}
          </p>
          <p className="text-muted-foreground">This changes who {brand} shows this ad to.</p>
          <p className="text-muted-foreground">
            {brand} may reset delivery learning after a targeting change.
          </p>
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

// Purpose-built RECREATE trigger for destination — picks a new page, then a distinct confirm step
// naming the real consequence (a new provider execution, not an in-place edit — unlike budget/
// schedule/targeting above). Mirrors the two-step shape but with a select instead of free inputs.
function ReplaceDestinationPicker({
  brand,
  pages,
  currentPageId,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  brand: string
  pages: LandingPageOption[]
  currentPageId: string | null
  pending?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (pageId: string) => void | Promise<void>
}) {
  const [step, setStep] = useState<'edit' | 'confirm'>('edit')
  const [pageId, setPageId] = useState(currentPageId || pages[0]?.id || '')
  const currentPage = pages.find((p) => p.id === currentPageId)
  const nextPage = pages.find((p) => p.id === pageId)
  const valid = Boolean(pageId)
  const unchanged = pageId === currentPageId

  return (
    <Modal
      title={step === 'edit' ? 'Change destination' : `Replace ${brand} destination`}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          {step === 'edit' ? (
            <Button type="button" disabled={!valid || unchanged} onClick={() => setStep('confirm')}>
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={pending} onClick={() => onConfirm(pageId)}>
              Replace destination
            </Button>
          )}
        </div>
      }
    >
      {step === 'edit' ? (
        <label className="block space-y-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            New destination
          </span>
          <select
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input-border bg-surface/30 px-3 text-sm"
            autoFocus
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-base font-medium">
            {currentPage?.name ?? 'Current destination'} → {nextPage?.name ?? 'New destination'}
          </p>
          <p className="text-muted-foreground">
            {brand}&apos;s click-through destination lives inside the ad&apos;s creative, which
            can&apos;t be edited in place — this creates a new {brand} version with the new
            destination.
          </p>
          <p className="text-muted-foreground">
            The current version keeps running until this one is ready.
          </p>
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

function syncLine(run: AdRun, brand: string) {
  switch (run.syncHealth) {
    case 'NEVER_SYNCED':
      return 'Not yet synced'
    case 'DISCONNECTED':
      return `Disconnected — reconnect ${brand} to resume syncing`
    case 'FAILED':
      return run.syncError ? `Sync failed: ${run.syncError}` : 'Sync failed'
    case 'DELAYED':
      return `Last synced ${timeAgo(run.lastSyncedAt) ?? 'a while ago'} · delayed`
    case 'CURRENT':
    default:
      return `Last synced ${timeAgo(run.lastSyncedAt) ?? 'just now'}`
  }
}

export function PaidRunRow({
  brand,
  run,
  advertisementUpdatedAt,
  onRelaunch,
  onSync,
  syncing,
  onPause,
  onResume,
  onEnd,
  actionPending,
  onEditBudget,
  editBudgetPending,
  editBudgetError,
  onEditSchedule,
  editSchedulePending,
  editScheduleError,
  onEditTargeting,
  editTargetingPending,
  editTargetingError,
  pages,
  onReplaceCreative,
  replaceCreativePending,
  replaceCreativeError,
  onReplaceDestination,
  replaceDestinationPending,
  replaceDestinationError,
}: {
  brand: string
  run: AdRun
  advertisementUpdatedAt?: string
  onRelaunch?: () => void
  onSync?: () => void
  syncing?: boolean
  onPause?: () => void
  onResume?: () => void
  onEnd?: () => void
  actionPending?: boolean
  onEditBudget?: (dailyBudget: number) => Promise<void>
  editBudgetPending?: boolean
  editBudgetError?: string | null
  onEditSchedule?: (startIso: string, endIso: string | null) => Promise<void>
  editSchedulePending?: boolean
  editScheduleError?: string | null
  onEditTargeting?: (
    country: string,
    locationNote: string | null,
    radiusMiles: number | null,
  ) => Promise<void>
  editTargetingPending?: boolean
  editTargetingError?: string | null
  pages?: LandingPageOption[]
  onReplaceCreative?: () => Promise<void>
  replaceCreativePending?: boolean
  replaceCreativeError?: string | null
  onReplaceDestination?: (pageId: string) => Promise<void>
  replaceDestinationPending?: boolean
  replaceDestinationError?: string | null
}) {
  const [manageOpen, setManageOpen] = useState(false)
  const [showBudgetEditor, setShowBudgetEditor] = useState(false)
  const [showScheduleEditor, setShowScheduleEditor] = useState(false)
  const [showTargetingEditor, setShowTargetingEditor] = useState(false)
  const [showDestinationPicker, setShowDestinationPicker] = useState(false)
  const loopie = loopieRunState(run)
  // Prefer the real, pulled provider state once one exists — the old heuristic (derived only
  // from LOOPIE's own local status + whether externalAdId is set) is a fallback for a run that
  // has never been synced yet, not a substitute for the truth once it's known.
  const delivery = platformDelivery(run)
  const providerLabel =
    run.syncHealth !== 'NEVER_SYNCED' && run.providerState
      ? PROVIDER_STATE_LABEL[run.providerState]
      : PLATFORM_DELIVERY_LABEL[delivery]
  const snapshot = parseOrderSnapshot(run.orderSnapshot)
  const connection = usePlatformConnection(run.platform)
  const actions = runActionsFromCapabilities(connection.data?.data?.capabilities)
  const editModes = editModesFromCapabilities(connection.data?.data?.capabilities)
  // run.budget is the always-current requested value (a budget edit updates it directly) —
  // orderSnapshot is frozen from the *original* send and goes stale the moment a budget edit
  // happens, so it's only a fallback for a run with no budget field set at all.
  const daily = Number(run.budget ?? snapshot?.dailyBudget ?? 0)
  const budgetDrifted = run.effectiveBudget != null && Math.abs(run.effectiveBudget - daily) > 0.01
  const scheduleDrifted = Boolean(
    run.effectiveStartDate &&
    (run.effectiveStartDate !== run.startDate ||
      (run.effectiveEndDate ?? null) !== (run.endDate ?? null)),
  )
  const targetingDrifted = Boolean(
    run.effectiveCountry &&
    (run.effectiveCountry !== run.country ||
      (run.effectiveLocationNote ?? null) !== (run.locationNote ?? null) ||
      (run.effectiveRadiusMiles ?? null) !== (run.radiusMiles ?? null)),
  )
  // Coarse but safe: any save touches the Advertisement's updatedAt, even a no-op one — this
  // errs toward showing the banner rather than hiding a real change. See CLAUDE.md's Ad
  // setup/media-order pass for why a precise diff isn't built yet.
  const sentAt = run.lastSyncedAt ?? run.createdAt
  const stale =
    Boolean(run.externalAdId) &&
    Boolean(advertisementUpdatedAt) &&
    new Date(advertisementUpdatedAt!).getTime() > new Date(sentAt).getTime()

  // Whether there's anything actionable at all — gates the Manage trigger itself, not just what's
  // inside it. A platform with no real capability (no connector, or one that only declares
  // monitoring) collapses straight to the view-only line instead of offering an empty sheet.
  const canManage =
    actions.pause ||
    actions.activate ||
    actions.end ||
    editModes.budget === 'IN_PLACE' ||
    editModes.schedule === 'IN_PLACE' ||
    editModes.targeting === 'IN_PLACE' ||
    Boolean(onReplaceCreative) ||
    Boolean(onReplaceDestination) ||
    stale

  const revision = run.mediaOrderRevision
  const where = paidTargetByKey(runDestinationKey(run))?.where ?? brand
  const authorizationSentence = revision
    ? buildAuthorizationSentence({
        brand,
        where,
        goal: revision.goal,
        country: revision.country,
        location: revision.locationNote,
        dailyBudget: revision.dailyBudgetMinor / 100,
        startIso: revision.startAt,
        endIso: revision.endAt ?? null,
        mediaName: 'this creative',
        accountName: revision.accountName,
      })
    : null

  return (
    <div className="space-y-3 rounded-lg border border-border bg-accent px-3 py-3">
      {authorizationSentence ? (
        <div>
          <p className="text-sm leading-snug">{authorizationSentence}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Advertisement · media order revision {revision!.revision}
          </p>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{brand}</p>
          <p className="text-xs text-muted-foreground">{LOOPIE_STATE_LABEL[loopie]}</p>
          <p className="text-xs text-muted-foreground">
            {brand} status: {providerLabel}
          </p>
          {run.externalAdId ? (
            <p
              className={cn(
                'text-xs',
                run.syncHealth === 'FAILED' || run.syncHealth === 'DISCONNECTED'
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {syncLine(run, brand)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {run.externalAdId && onSync ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSync}
              disabled={syncing}
              aria-label={`Sync ${brand} now`}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : undefined} />
              Sync now
            </Button>
          ) : null}
          {run.previewUrl ? (
            <a
              href={run.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium hover:bg-background"
            >
              Preview
            </a>
          ) : null}
          {run.managerUrl ? (
            <a
              href={run.managerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium hover:bg-background"
            >
              Open Ads Manager
            </a>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {[
          snapshot?.location || snapshot?.country,
          snapshot ? scheduleLine(snapshot.startDate, snapshot.endDate) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {run.destinationLandingPageId ? (
        <p className="text-xs text-muted-foreground">
          Destination:{' '}
          {pages?.find((p) => p.id === run.destinationLandingPageId)?.name ??
            run.destinationLandingPageId}
        </p>
      ) : null}

      {/* Elevated outcomes tier — LOOPIE's own attribution, not platform-reported. Reads first
          and boldest: see docs/strategy/03-product-principles.md's Ownership Rule. */}
      {run.externalAdId ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 sm:grid-cols-4">
          <OutcomeMetric label="Leads" value={compactNumber(run.leads)} />
          <OutcomeMetric label="Sales" value={compactNumber(run.sales)} />
          <OutcomeMetric label="Revenue" value={money(run.revenue)} />
          <OutcomeMetric label="ROAS" value={roas(run.spend, run.revenue)} />
        </dl>
      ) : null}

      {/* Platform-reported metrics — read-only monitoring, secondary tier to the outcomes above. */}
      <dl className="grid grid-cols-3 gap-x-3 gap-y-2 border-t border-border pt-3 sm:grid-cols-4">
        <Metric
          label="Budget"
          value={
            run.effectiveBudget != null
              ? `${money(run.effectiveBudget)}/day`
              : daily
                ? `${money(daily)}/day (pending sync)`
                : '—'
          }
        />
        <Metric label="Spend" value={money(run.spend)} />
        <Metric label="Reach" value={compactNumber(run.reach ?? run.impressions)} />
        <Metric label="Clicks" value={compactNumber(run.clicks)} />
      </dl>
      <p className="text-xs text-muted-foreground">{AD_FINANCE_NOTE}</p>

      {/* Requested-vs-effective — only surfaced when LOOPIE actually initiated a change that
          hasn't reconciled (or was rejected). Not shown just because a value exists — showing it
          unconditionally was the "co-authority" framing this replaces. */}
      {budgetDrifted ? (
        <div className="space-y-0.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">Budget drifted</p>
          <p>
            LOOPIE requested {money(daily)}/day · {brand} reports{' '}
            {run.effectiveBudget != null ? `${money(run.effectiveBudget)}/day` : 'not yet synced'}
          </p>
        </div>
      ) : null}
      {scheduleDrifted ? (
        <div className="space-y-0.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">Schedule drifted</p>
          <p>
            LOOPIE requested {scheduleLineFromIso(run.startDate ?? null, run.endDate ?? null)} ·{' '}
            {brand} reports{' '}
            {scheduleLineFromIso(run.effectiveStartDate ?? null, run.effectiveEndDate ?? null)}
          </p>
        </div>
      ) : null}
      {targetingDrifted ? (
        <div className="space-y-0.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">Targeting drifted</p>
          <p>
            LOOPIE requested{' '}
            {targetingLine(run.country ?? null, run.locationNote ?? null, run.radiusMiles ?? null)}{' '}
            · {brand} reports{' '}
            {targetingLine(
              run.effectiveCountry ?? null,
              run.effectiveLocationNote ?? null,
              run.effectiveRadiusMiles ?? null,
            )}
          </p>
        </div>
      ) : null}

      {/* Provider issues — read-only monitoring (review/rejection reasons, as reported). */}
      {run.providerIssues && run.providerIssues.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">{brand} review</p>
          {run.providerIssues.map((issue, i) => (
            <p key={i}>{issue}</p>
          ))}
        </div>
      ) : null}

      {/* Everything below is mutation/control — secondary, reached only through Manage, and only
          shown at all when something is actually capability-gated actionable. Meta declares full
          capability; a platform with no real connector (Google/TikTok today) reports none, so
          this collapses to the view-only line automatically rather than implying parity. */}
      {canManage ? (
        <div className="border-t border-border pt-3">
          <Button type="button" size="sm" variant="outline" onClick={() => setManageOpen(true)}>
            Manage
          </Button>
        </div>
      ) : (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          View only until {brand} can be updated from LOOPIE.
        </p>
      )}

      {manageOpen ? (
        <Modal title={`Manage ${brand}`} onClose={() => setManageOpen(false)}>
          <div className="space-y-4">
            {run.externalAdId && (editModes.budget === 'IN_PLACE' || run.budget != null) ? (
              <div className="space-y-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">Budget</p>
                  {editModes.budget === 'IN_PLACE' && onEditBudget ? (
                    <button
                      type="button"
                      onClick={() => setShowBudgetEditor(true)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                <p>LOOPIE requested: {money(daily)}/day</p>
                <p className="text-[11px]">{editConsequenceLabel(editModes.budget, brand)}</p>
              </div>
            ) : null}

            {run.externalAdId && (editModes.schedule === 'IN_PLACE' || run.startDate) ? (
              <div className="space-y-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">Schedule</p>
                  {editModes.schedule === 'IN_PLACE' && onEditSchedule ? (
                    <button
                      type="button"
                      onClick={() => setShowScheduleEditor(true)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                <p>
                  LOOPIE requested:{' '}
                  {scheduleLineFromIso(run.startDate ?? null, run.endDate ?? null)}
                </p>
                <p className="text-[11px]">{editConsequenceLabel(editModes.schedule, brand)}</p>
              </div>
            ) : null}

            {run.externalAdId && (editModes.targeting === 'IN_PLACE' || run.country) ? (
              <div className="space-y-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">Targeting</p>
                  {editModes.targeting === 'IN_PLACE' && onEditTargeting ? (
                    <button
                      type="button"
                      onClick={() => setShowTargetingEditor(true)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                <p>
                  LOOPIE requested:{' '}
                  {targetingLine(
                    run.country ?? null,
                    run.locationNote ?? null,
                    run.radiusMiles ?? null,
                  )}
                </p>
                <p className="text-[11px]">{editConsequenceLabel(editModes.targeting, brand)}</p>
              </div>
            ) : null}

            {actions.pause || actions.activate || actions.end ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {run.status === 'ACTIVE' && actions.pause ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={actionPending}
                    onClick={() =>
                      confirmAndRun(
                        `Pause ${brand}? ${brand} may continue reporting delayed impressions and spend for a short time after this is accepted.`,
                        onPause,
                      )
                    }
                  >
                    Pause
                  </Button>
                ) : null}
                {(run.status === 'PENDING' || run.status === 'PAUSED') && actions.activate ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={actionPending}
                    onClick={() =>
                      confirmAndRun(
                        `Resume ${brand}? This activates real ad spend on ${brand} — LOOPIE does not control the rate, only ${brand} does.`,
                        onResume,
                      )
                    }
                  >
                    Resume
                  </Button>
                ) : null}
                {run.status !== 'ENDED' && actions.end ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={actionPending}
                    onClick={() =>
                      confirmAndRun(`End ${brand}? This cannot be undone from LOOPIE.`, onEnd)
                    }
                  >
                    End
                  </Button>
                ) : null}
              </div>
            ) : null}

            {stale ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
                <div>
                  <p className="text-xs text-warning">{AD_CHANGED_SINCE_SENT(brand)}</p>
                  <p className="text-[11px] text-warning/80">
                    {editConsequenceLabel(editModes.creative, brand)}
                  </p>
                </div>
                {onRelaunch ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setManageOpen(false)
                      onRelaunch()
                    }}
                  >
                    Create new {brand} version
                  </Button>
                ) : null}
              </div>
            ) : null}

            {run.externalAdId && (onReplaceCreative || onReplaceDestination) ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {onReplaceCreative ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={replaceCreativePending}
                    onClick={() =>
                      confirmAndRun(
                        `Replace ${brand}'s creative with the media currently attached to this ad? ${brand} creatives can't be edited in place — this submits a new version, and the current one keeps running until it's ready.`,
                        onReplaceCreative,
                      )
                    }
                  >
                    Replace creative
                  </Button>
                ) : null}
                {onReplaceDestination ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={replaceDestinationPending}
                    onClick={() => setShowDestinationPicker(true)}
                  >
                    Change destination
                  </Button>
                ) : null}
              </div>
            ) : null}
            {replaceCreativeError ? (
              <p role="alert" className="text-xs text-destructive">
                {replaceCreativeError}
              </p>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {showBudgetEditor ? (
        <BudgetEditor
          brand={brand}
          currentDaily={daily}
          pending={editBudgetPending}
          error={editBudgetError}
          onCancel={() => setShowBudgetEditor(false)}
          onConfirm={async (next) => {
            if (!onEditBudget) return
            try {
              await onEditBudget(next)
              setShowBudgetEditor(false)
            } catch {
              // Stays open — editBudgetError (surfaced by the caller) renders in the confirm step
              // so the failure is visible right where the commitment was just being made.
            }
          }}
        />
      ) : null}

      {showScheduleEditor ? (
        <ScheduleEditor
          brand={brand}
          currentStartIso={run.startDate ?? null}
          currentEndIso={run.endDate ?? null}
          pending={editSchedulePending}
          error={editScheduleError}
          onCancel={() => setShowScheduleEditor(false)}
          onConfirm={async (startIso, endIso) => {
            if (!onEditSchedule) return
            try {
              await onEditSchedule(startIso, endIso)
              setShowScheduleEditor(false)
            } catch {
              // Stays open — editScheduleError (surfaced by the caller) renders in the confirm
              // step so the failure is visible right where the commitment was just being made.
            }
          }}
        />
      ) : null}

      {showTargetingEditor ? (
        <TargetingEditor
          brand={brand}
          currentCountry={run.country ?? ''}
          currentLocationNote={run.locationNote ?? null}
          currentRadiusMiles={run.radiusMiles ?? null}
          pending={editTargetingPending}
          error={editTargetingError}
          onCancel={() => setShowTargetingEditor(false)}
          onConfirm={async (country, locationNote, radiusMiles) => {
            if (!onEditTargeting) return
            try {
              await onEditTargeting(country, locationNote, radiusMiles)
              setShowTargetingEditor(false)
            } catch {
              // Stays open — editTargetingError (surfaced by the caller) renders in the confirm
              // step so the failure is visible right where the commitment was just being made.
            }
          }}
        />
      ) : null}

      {showDestinationPicker && pages ? (
        <ReplaceDestinationPicker
          brand={brand}
          pages={pages}
          currentPageId={run.destinationLandingPageId ?? null}
          pending={replaceDestinationPending}
          error={replaceDestinationError}
          onCancel={() => setShowDestinationPicker(false)}
          onConfirm={async (pageId) => {
            if (!onReplaceDestination) return
            try {
              await onReplaceDestination(pageId)
              setShowDestinationPicker(false)
            } catch {
              // Stays open — replaceDestinationError (surfaced by the caller) renders in the
              // confirm step so the failure is visible right where the commitment was just made.
            }
          }}
        />
      ) : null}
    </div>
  )
}

export function PageRunRow({ label, onPause }: { label: string; onPause?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-accent px-3 py-2.5">
      <input type="checkbox" checked disabled className="h-4 w-4 shrink-0 accent-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">On this page</p>
      </div>
      {onPause ? (
        <Button type="button" size="sm" variant="outline" onClick={onPause}>
          Pause
        </Button>
      ) : null}
    </div>
  )
}
