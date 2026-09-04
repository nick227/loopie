import { useRiverPosts } from '@project/sdk'
import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { DestinationIntentRow, PageRunRow, PaidRunRow } from '@/components/ads/AdDestinationRow'
import type { AdOrder } from '@/lib/adOrder'
import {
  PAID_TARGETS,
  pageIdFromKey,
  pageKey,
  paidTargetByKey,
  runDestinationKey,
} from '@/lib/adPreview'

type AdRun = components['schemas']['AdRun'] & { orderSnapshot?: unknown }
type LandingPage = {
  id: string
  name: string
  status: string
  hostedUrl?: string | null
  slug?: string
}

export const RIVER_DESTINATION_KEY = 'river'

export type PublishTarget = {
  platform: 'META' | 'GOOGLE' | 'LOOPIE'
  placement: string
  budget: number
  startDate?: string
  endDate?: string
  destinationLandingPageId?: string
  orderSnapshot?: Record<string, unknown>
  supersedesRunId?: string
}

function runFailoverPriority(run: AdRun) {
  return run.status === 'VALIDATION_FAILED' || run.status === 'PROVISIONING_FAILED' ? 0 : 1
}

export function AdDestinations({
  mediaType,
  pages,
  runs,
  selected,
  onSelectedChange,
  onPublishSelected,
  publishPending,
  advertisementUpdatedAt,
  advertisementId,
  onPostToRiver,
  onRepublishPage,
  onPausePage,
  onRelaunch,
  onSync,
  syncingRunId,
  onPauseRun,
  onResumeRun,
  onEndRun,
  actionPendingRunId,
  onEditBudget,
  editBudgetPendingRunId,
  editBudgetErrorRunId,
  editBudgetError,
  onEditSchedule,
  editSchedulePendingRunId,
  editScheduleErrorRunId,
  editScheduleError,
  onEditTargeting,
  editTargetingPendingRunId,
  editTargetingErrorRunId,
  editTargetingError,
  onReplaceCreative,
  replaceCreativePendingRunId,
  replaceCreativeErrorRunId,
  replaceCreativeError,
  onReplaceDestination,
  replaceDestinationPendingRunId,
  replaceDestinationErrorRunId,
  replaceDestinationError,
}: {
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT' | undefined
  pages: LandingPage[]
  runs: AdRun[]
  selected: string[]
  onSelectedChange: (keys: string[]) => void
  onPublishSelected: () => void
  publishPending?: boolean
  advertisementUpdatedAt?: string
  advertisementId?: string
  onPostToRiver?: () => void
  onRepublishPage?: (key: string, supersedesRunId: string) => void
  onPausePage?: (runId: string) => void
  onRelaunch?: (run: AdRun) => void
  onSync?: (run: AdRun) => void
  syncingRunId?: string
  onPauseRun?: (run: AdRun) => void
  onResumeRun?: (run: AdRun) => void
  onEndRun?: (run: AdRun) => void
  actionPendingRunId?: string
  onEditBudget?: (run: AdRun, dailyBudget: number) => Promise<void>
  editBudgetPendingRunId?: string
  editBudgetErrorRunId?: string
  editBudgetError?: string | null
  onEditSchedule?: (run: AdRun, startIso: string, endIso: string | null) => Promise<void>
  editSchedulePendingRunId?: string
  editScheduleErrorRunId?: string
  editScheduleError?: string | null
  onEditTargeting?: (
    run: AdRun,
    country: string,
    locationNote: string | null,
    radiusMiles: number | null,
  ) => Promise<void>
  editTargetingPendingRunId?: string
  editTargetingErrorRunId?: string
  editTargetingError?: string | null
  onReplaceCreative?: (run: AdRun) => Promise<void>
  replaceCreativePendingRunId?: string
  replaceCreativeErrorRunId?: string
  replaceCreativeError?: string | null
  onReplaceDestination?: (run: AdRun, pageId: string) => Promise<void>
  replaceDestinationPendingRunId?: string
  replaceDestinationErrorRunId?: string
  replaceDestinationError?: string | null
}) {
  const riverPosts = useRiverPosts({
    advertisementId,
    limit: 100,
    enabled: Boolean(advertisementId),
  })
  const paid = PAID_TARGETS.filter((row) => !mediaType || row.types.includes(mediaType))
  const byKey = new Map<string, AdRun>()
  const historyByKey = new Map<string, AdRun[]>()
  for (const run of runs) {
    const key = runDestinationKey(run)
    if (run.status !== 'VALIDATION_FAILED' && run.status !== 'PROVISIONING_FAILED') {
      historyByKey.set(key, [...(historyByKey.get(key) ?? []), run])
    }
    if (run.status === 'ENDED') continue
    const existing = byKey.get(key)
    if (!existing || runFailoverPriority(run) >= runFailoverPriority(existing)) {
      byKey.set(key, run)
    }
  }
  for (const history of historyByKey.values()) {
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  const riverHistory = (riverPosts.data?.data ?? []).map((post) => ({
    createdAt: post.createdAt,
    href: post.permalinkUrl,
  }))

  const selectableKeys: string[] = []
  if (advertisementId && onPostToRiver) selectableKeys.push(RIVER_DESTINATION_KEY)
  for (const row of paid) {
    if (!byKey.get(row.key)) selectableKeys.push(row.key)
  }
  for (const page of pages) {
    const key = pageKey(page.id)
    if (!byKey.get(key)) selectableKeys.push(key)
  }

  const selectedCount = selected.length
  const selectableCount = selectableKeys.length

  function toggleKey(key: string) {
    if (selected.includes(key)) {
      onSelectedChange(selected.filter((k) => k !== key))
    } else {
      onSelectedChange([...selected, key])
    }
  }

  const intentRows = (
    <>
      {advertisementId ? (
        <DestinationIntentRow
          id="destination-river"
          label="River"
          format="In-app placements"
          publicationRecords={riverHistory}
          selected={selected.includes(RIVER_DESTINATION_KEY)}
          disabled={!onPostToRiver}
          onToggle={() => toggleKey(RIVER_DESTINATION_KEY)}
        />
      ) : null}
      {paid.map((row) => {
        const run = byKey.get(row.key)
        if (run) return null
        return (
          <DestinationIntentRow
            key={row.key}
            id={row.key}
            label={row.brand}
            format={
              row.key === 'META_FEED'
                ? 'Feed — reach your audience'
                : row.key === 'GOOGLE_DISPLAY'
                  ? 'Across the web'
                  : row.where
            }
            publishedAt={(historyByKey.get(row.key) ?? []).map((item) => item.createdAt)}
            selected={selected.includes(row.key)}
            onToggle={() => toggleKey(row.key)}
          />
        )
      })}
      {pages.map((page) => {
        const key = pageKey(page.id)
        const run = byKey.get(key)
        if (run) return null
        return (
          <DestinationIntentRow
            key={key}
            id={key}
            label={page.name}
            format={page.status === 'PUBLISHED' ? 'Website / page placement' : 'Draft'}
            publishedAt={(historyByKey.get(key) ?? []).map((item) => item.createdAt)}
            selected={selected.includes(key)}
            onToggle={() => toggleKey(key)}
          />
        )
      })}
    </>
  )

  const liveRuns = (
    <>
      {paid.map((row) => {
        const run = byKey.get(row.key)
        if (!run) return null
        return (
          <PaidRunRow
            key={row.key}
            brand={row.brand}
            run={run}
            advertisementUpdatedAt={advertisementUpdatedAt}
            onRelaunch={onRelaunch ? () => onRelaunch(run) : undefined}
            onSync={onSync ? () => onSync(run) : undefined}
            syncing={syncingRunId === run.id}
            onPause={onPauseRun ? () => onPauseRun(run) : undefined}
            onResume={onResumeRun ? () => onResumeRun(run) : undefined}
            onEnd={onEndRun ? () => onEndRun(run) : undefined}
            actionPending={actionPendingRunId === run.id}
            onEditBudget={
              onEditBudget ? (dailyBudget) => onEditBudget(run, dailyBudget) : undefined
            }
            editBudgetPending={editBudgetPendingRunId === run.id}
            editBudgetError={editBudgetErrorRunId === run.id ? editBudgetError : undefined}
            onEditSchedule={
              onEditSchedule
                ? (startIso, endIso) => onEditSchedule(run, startIso, endIso)
                : undefined
            }
            editSchedulePending={editSchedulePendingRunId === run.id}
            editScheduleError={editScheduleErrorRunId === run.id ? editScheduleError : undefined}
            onEditTargeting={
              onEditTargeting
                ? (country, locationNote, radiusMiles) =>
                    onEditTargeting(run, country, locationNote, radiusMiles)
                : undefined
            }
            editTargetingPending={editTargetingPendingRunId === run.id}
            editTargetingError={editTargetingErrorRunId === run.id ? editTargetingError : undefined}
            pages={pages}
            onReplaceCreative={onReplaceCreative ? () => onReplaceCreative(run) : undefined}
            replaceCreativePending={replaceCreativePendingRunId === run.id}
            replaceCreativeError={
              replaceCreativeErrorRunId === run.id ? replaceCreativeError : undefined
            }
            onReplaceDestination={
              onReplaceDestination ? (pageId) => onReplaceDestination(run, pageId) : undefined
            }
            replaceDestinationPending={replaceDestinationPendingRunId === run.id}
            replaceDestinationError={
              replaceDestinationErrorRunId === run.id ? replaceDestinationError : undefined
            }
            publicationHistory={(historyByKey.get(row.key) ?? []).map((item) => item.createdAt)}
          />
        )
      })}
      {pages.map((page) => {
        const key = pageKey(page.id)
        const run = byKey.get(key)
        if (!run) return null
        return (
          <PageRunRow
            key={key}
            label={page.name}
            onPause={run.status === 'ACTIVE' && onPausePage ? () => onPausePage(run.id) : undefined}
            publicationHistory={(historyByKey.get(key) ?? []).map((item) => item.createdAt)}
            onPublish={onRepublishPage ? () => onRepublishPage(key, run.id) : undefined}
          />
        )
      })}
    </>
  )

  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Distribution</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose where to publish this advertisement.
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {selectedCount} of {selectableCount} selected
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">{intentRows}</div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {selectedCount === 0
            ? 'Select one or more destinations.'
            : `Will publish to ${selectedCount} destination${selectedCount === 1 ? '' : 's'}.`}
        </p>
        <Button
          type="button"
          onClick={onPublishSelected}
          disabled={selectedCount === 0 || publishPending}
          loading={publishPending}
        >
          Publish selected
        </Button>
      </div>

      {runs.some((run) => run.status !== 'ENDED') || pages.some((p) => byKey.has(pageKey(p.id))) ? (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active placements
          </p>
          <div className="space-y-2">{liveRuns}</div>
        </div>
      ) : null}
    </div>
  )
}

export function selectedPageTargets(selected: string[], supersedesRunId?: string): PublishTarget[] {
  const pages: PublishTarget[] = []
  for (const key of selected) {
    const id = pageIdFromKey(key)
    if (id) {
      pages.push({
        platform: 'LOOPIE',
        placement: 'PAGE',
        budget: 0,
        destinationLandingPageId: id,
        supersedesRunId,
      })
    }
  }
  return pages
}

export function paidOrderTarget(
  key: string,
  order: AdOrder,
  supersedesRunId?: string,
): PublishTarget | null {
  const row = paidTargetByKey(key)
  if (!row) return null
  return {
    platform: row.platform,
    placement: row.placement,
    budget: order.dailyBudget,
    startDate: order.startDate,
    endDate: order.endDate || undefined,
    destinationLandingPageId: order.destinationLandingPageId || undefined,
    orderSnapshot: { ...order, where: row.where },
    supersedesRunId,
  }
}
