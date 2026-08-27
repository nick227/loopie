import type { components } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { DestinationRow } from '@/components/ads/AdDestinationRow'
import { PAID_TARGETS, pageIdFromKey, pageKey, runDestinationKey } from '@/lib/adPreview'

type AdRun = components['schemas']['AdRun']
type LandingPage = { id: string; name: string; status: string }

export type PublishTarget = {
  platform: 'META' | 'TIKTOK' | 'LOOPIE'
  placement: string
  budget: number
  destinationLandingPageId?: string
}

function canStart(status: string) {
  return status === 'PENDING' || status === 'PAUSED'
}

export function AdDestinations({
  mediaType,
  pages,
  runs,
  selected,
  budgets,
  onToggle,
  onBudget,
  onStart,
  onPause,
  onStartAll,
  onPauseAll,
}: {
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT' | undefined
  pages: LandingPage[]
  runs: AdRun[]
  selected: string[]
  budgets: Record<string, number>
  onToggle: (key: string) => void
  onBudget: (key: string, value: number) => void
  onStart?: (runId: string) => void
  onPause?: (runId: string) => void
  onStartAll?: () => void
  onPauseAll?: () => void
}) {
  const paid = PAID_TARGETS.filter((row) => !mediaType || row.types.includes(mediaType))
  const byKey = new Map<string, AdRun>()
  for (const run of runs) {
    if (run.status === 'ENDED') continue
    byKey.set(runDestinationKey(run), run)
  }
  const anyOn = runs.some((run) => run.status === 'ACTIVE')
  const anyOff = runs.some((run) => canStart(run.status))

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Where it runs</p>
          <p className="text-sm text-muted-foreground">
            Amounts are per day. A running buy stays checked until you pause it.
          </p>
        </div>
        {runs.length > 0 ? (
          <div className="flex gap-2">
            {anyOn && onPauseAll ? (
              <Button type="button" size="sm" variant="outline" onClick={onPauseAll}>
                Pause all
              </Button>
            ) : null}
            {anyOff && onStartAll ? (
              <Button type="button" size="sm" onClick={onStartAll}>
                Start all
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {paid.length > 0 ? (
        <div className="space-y-2">
          {paid.map((row) => {
            const run = byKey.get(row.key)
            return (
              <DestinationRow
                key={row.key}
                id={row.key}
                label={row.label}
                run={run}
                selected={selected.includes(row.key)}
                budget={budgets[row.key] ?? 10}
                paid
                onToggle={() => onToggle(row.key)}
                onBudget={(value) => onBudget(row.key, value)}
                onStart={run && onStart && canStart(run.status) ? () => onStart(run.id) : undefined}
                onPause={run?.status === 'ACTIVE' && onPause ? () => onPause(run.id) : undefined}
              />
            )
          })}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pages</p>
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pages yet.</p>
        ) : (
          pages.map((page) => {
            const key = pageKey(page.id)
            const run = byKey.get(key)
            return (
              <DestinationRow
                key={key}
                id={key}
                label={page.name}
                hint={page.status === 'PUBLISHED' ? undefined : 'Draft'}
                run={run}
                selected={selected.includes(key)}
                budget={0}
                paid={false}
                onToggle={() => onToggle(key)}
                onStart={run && onStart && canStart(run.status) ? () => onStart(run.id) : undefined}
                onPause={run?.status === 'ACTIVE' && onPause ? () => onPause(run.id) : undefined}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

export function selectedToPublishTargets(
  selected: string[],
  budgets: Record<string, number>,
): PublishTarget[] {
  const paid = PAID_TARGETS.filter((row) => selected.includes(row.key)).map((row) => ({
    platform: row.platform,
    placement: row.placement,
    budget: budgets[row.key] ?? 10,
  }))
  const pages: PublishTarget[] = []
  for (const key of selected) {
    const id = pageIdFromKey(key)
    if (id) {
      pages.push({
        platform: 'LOOPIE',
        placement: 'PAGE',
        budget: 0,
        destinationLandingPageId: id,
      })
    }
  }
  return [...paid, ...pages]
}
