import { cn } from '@/lib/utils'
import { MONTH_NAMES, calendarConfig } from '../calendar.config'
import { goalsByMonth } from '../calendar.selectors'
import { ScheduledGoal } from '../calendar.types'

// The secondary Calendar mode — "very lightweight overview only, dots/counts, not detailed task
// rendering." Twelve month tiles; clicking one jumps into Month mode anchored there. No day
// selection or detail panel here by design — that's what Month is for.
export function YearView({
  anchor,
  goals,
  onSelectMonth,
}: {
  anchor: Date
  goals: ScheduledGoal[]
  onSelectMonth: (monthIndex: number) => void
}) {
  const year = anchor.getFullYear()
  const now = new Date()
  const byMonth = goalsByMonth(goals, year)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {MONTH_NAMES.map((name, i) => {
        const isCurrentMonth = year === now.getFullYear() && i === now.getMonth()
        const { scheduled, done } = byMonth[i]!
        const total = scheduled + done
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelectMonth(i)}
            className={cn(
              'rounded-lg border border-border p-3 text-left transition-colors hover:border-foreground/30',
              isCurrentMonth && 'bg-muted/40',
            )}
          >
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {total === 0 ? 'Nothing planned' : `${scheduled} scheduled · ${done} done`}
            </p>
            {total > 0 ? (
              <div className="mt-2 flex flex-wrap gap-0.5">
                {Array.from({
                  length: Math.min(done, calendarConfig.display.yearDotLimitPerStatus),
                }).map((_, idx) => (
                  <span key={`d${idx}`} className="h-1.5 w-1.5 rounded-full bg-success" />
                ))}
                {Array.from({
                  length: Math.min(scheduled, calendarConfig.display.yearDotLimitPerStatus),
                }).map((_, idx) => (
                  <span key={`s${idx}`} className="h-1.5 w-1.5 rounded-full bg-primary" />
                ))}
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
