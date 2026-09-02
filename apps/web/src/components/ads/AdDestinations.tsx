import { useRiverPosts } from '@project/sdk'
import type { components } from '@project/sdk'
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
  advertisementUpdatedAt,
  advertisementId,
  onPostToRiver,
  riverPending,
  onToggle,
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
  advertisementUpdatedAt?: string
  advertisementId?: string
  onPostToRiver?: () => void
  riverPending?: boolean
  onToggle: (key: string, supersedesRunId?: string) => void
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
    // A replace-creative/replace-destination (or generic relaunch) attempt that fails leaves its
    // own new row non-ENDED (VALIDATION_FAILED/PROVISIONING_FAILED) alongside the prior run,
    // which explicitly stays live and running until a replacement actually succeeds — see
    // AdRunService.createAndProvision. Two non-ENDED rows can briefly share one destination key;
    // the still-delivering one must win the slot here, never the failed attempt silently hiding
    // it. Equal-priority ties (the normal case — one live run per key) keep prior last-one-wins
    // behavior.
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-medium p-2 bg-surface rounded-lg">Publish to:</h2>
      </div>

      <div className="space-y-2">
        {advertisementId ? (
          <DestinationIntentRow
            id="destination-river"
            label="River"
            format="Post organically to LOOPIE's B2B feed"
            publicationRecords={riverHistory}
            pending={riverPending}
            disabled={!onPostToRiver}
            onPublish={() => onPostToRiver?.()}
          />
        ) : null}
        {paid.map((row) => {
          const run = byKey.get(row.key)
          if (run)
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
                editScheduleError={
                  editScheduleErrorRunId === run.id ? editScheduleError : undefined
                }
                onEditTargeting={
                  onEditTargeting
                    ? (country, locationNote, radiusMiles) =>
                        onEditTargeting(run, country, locationNote, radiusMiles)
                    : undefined
                }
                editTargetingPending={editTargetingPendingRunId === run.id}
                editTargetingError={
                  editTargetingErrorRunId === run.id ? editTargetingError : undefined
                }
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
          return (
            <DestinationIntentRow
              key={row.key}
              id={row.key}
              label={row.brand}
              format={row.format}
              publishedAt={(historyByKey.get(row.key) ?? []).map((item) => item.createdAt)}
              pending={selected.includes(row.key)}
              onPublish={() => onToggle(row.key)}
            />
          )
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pages</p>
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pages yet.</p>
        ) : (
          pages.map((page) => {
            const key = pageKey(page.id)
            const run = byKey.get(key)
            if (run) {
              return (
                <PageRunRow
                  key={key}
                  label={page.name}
                  onPause={
                    run.status === 'ACTIVE' && onPausePage ? () => onPausePage(run.id) : undefined
                  }
                  publicationHistory={(historyByKey.get(key) ?? []).map((item) => item.createdAt)}
                  onPublish={() => onToggle(key, run.id)}
                />
              )
            }
            return (
              <DestinationIntentRow
                key={key}
                id={key}
                label={page.name}
                format={page.status === 'PUBLISHED' ? undefined : 'Draft'}
                publishedAt={(historyByKey.get(key) ?? []).map((item) => item.createdAt)}
                pending={selected.includes(key)}
                onPublish={() => onToggle(key)}
              />
            )
          })
        )}
      </div>
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
