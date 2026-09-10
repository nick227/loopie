import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { calendarConfig } from '../calendar.config'
import { formatMinutes } from '../calendar.dates'

// The estimate pill row (30m/1h/2h/Custom) — extracted so the idea-scheduling flow
// (SchedulingControls) and the post-creation edit rail (AssignEstimateForm) render the identical
// control instead of diverging copies. Self-contained: owns its own preset-vs-custom toggle,
// exposes only the resolved minutes (or null) to the caller.
export function EstimatePicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (minutes: number | null) => void
}) {
  const isPreset =
    value != null &&
    (calendarConfig.scheduling.estimatePresetsMinutes as readonly number[]).includes(value)
  const [custom, setCustom] = useState(value != null && !isPreset)
  const [customMinutes, setCustomMinutes] = useState(
    value != null && !isPreset ? String(value) : '',
  )

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Estimate</p>
      <div className="flex flex-wrap gap-1.5">
        {calendarConfig.scheduling.estimatePresetsMinutes.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => {
              setCustom(false)
              onChange(minutes)
            }}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium',
              !custom && value === minutes
                ? 'border-foreground/30 bg-foreground text-background'
                : 'border-input-border text-foreground hover:border-foreground/40 hover:bg-accent',
            )}
          >
            {formatMinutes(minutes)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs font-medium',
            custom
              ? 'border-foreground/30 bg-foreground text-background'
              : 'border-input-border text-foreground hover:border-foreground/40 hover:bg-accent',
          )}
        >
          Custom
        </button>
      </div>
      {custom ? (
        <input
          type="number"
          min={5}
          placeholder="Minutes"
          value={customMinutes}
          onChange={(event) => {
            setCustomMinutes(event.target.value)
            const n = Number(event.target.value)
            onChange(Number.isFinite(n) && n > 0 ? n : null)
          }}
          className="mt-2 h-8 w-full rounded border border-input-border bg-transparent px-2 text-xs"
        />
      ) : null}
    </div>
  )
}

export function Section({
  label,
  action,
  bare = false,
  children,
}: {
  label: string
  action?: React.ReactNode
  // Skips the section's own divide-y/border wrapper — for content (GroupedGoalList) that already
  // supplies its own hairlines per day-cluster, so they don't nest into a double border.
  bare?: boolean
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </h2>
        {action}
      </div>
      {bare ? (
        children
      ) : (
        <div className="divide-y divide-border border-t border-border">{children}</div>
      )}
    </section>
  )
}

export function QueryFeedback({
  query,
}: {
  query: { isLoading: boolean; isError: boolean; retry: () => unknown }
}) {
  if (query.isLoading)
    return (
      <div aria-label="Loading calendar">
        <Skeleton className="h-24 w-full" />
      </div>
    )
  if (query.isError)
    return (
      <div role="alert" className="space-y-2">
        <p>Could not load calendar tasks.</p>
        <Button variant="outline" size="sm" onClick={() => void query.retry()}>
          Try again
        </Button>
      </div>
    )
  return null
}
