import { cn } from '@/lib/utils'
import { calendarConfig, WEEKDAY_LABELS_MON_FIRST } from '../calendar.config'
import { formatTime, monthInterval, sameDay, toDateInput } from '../calendar.dates'
import { goalsByDay } from '../calendar.selectors'
import { ScheduledGoal } from '../calendar.types'
import { DayDetailPanel } from '../components/DayDetailPanel'
import { TaskOwner } from '../components/TaskOwnership'

// An ultra-compact month-cell row — a month grid has 35-42 cells, so this shows only a done-dot
// and a truncated title; everything else (time, estimate, reschedule) lives in the day detail
// panel a click away.
// Plain (non-interactive) by design — it sits inside the day cell's own button, and nesting a
// button in a button is invalid HTML with unpredictable click behavior. Marking done happens in
// the day detail panel a click away, which is also where "mark done" belongs given Month cells
// have no room for it anyway.
function monthDotTone(goal: ScheduledGoal): string {
  if (goal.status === 'DONE') return 'bg-success'
  if (goal.hasTime) return 'bg-primary'
  return 'bg-muted-foreground/50'
}

function MonthDayItem({ goal }: { goal: ScheduledGoal }) {
  const done = goal.status === 'DONE'
  return (
    <div className="flex w-full items-center gap-1 px-0.5 py-0.5">
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', monthDotTone(goal))} />
      <span className={cn('truncate text-[11px]', done && 'text-muted-foreground line-through')}>
        {goal.hasTime && goal.scheduledFor ? `${formatTime(goal.scheduledFor)} ` : ''}
        {goal.title}
      </span>
      <TaskOwner userId={goal.assignedToUserId} />
    </div>
  )
}

// The primary Calendar surface on desktop — a real month grid, the way an indie developer would
// actually want to see a whole month's worth of work at a glance. Every goal renders on its real
// scheduledFor date; clicking a day opens the detail panel below (DayDetailPanel), which is also
// where you add something for that day.
export function MonthView({
  anchor,
  goals,
  selectedDay,
  onSelectDay,
  focusedGoalId,
}: {
  anchor: Date
  goals: ScheduledGoal[]
  selectedDay: Date | null
  onSelectDay: (day: Date | null) => void
  focusedGoalId?: string | null
}) {
  const { days } = monthInterval(anchor)
  const byDay = goalsByDay(goals)

  const now = new Date()

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid w-full min-w-0 grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {WEEKDAY_LABELS_MON_FIRST.map((label) => (
          <div
            key={label}
            className="bg-muted/40 px-0.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:px-2 sm:text-[11px]"
          >
            <span aria-label={label}>
              <span className="sm:hidden" aria-hidden="true">
                {label.charAt(0)}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
          </div>
        ))}
        {days.map((day) => {
          const key = toDateInput(day)
          const items = byDay.get(key) ?? []
          const inMonth = day.getMonth() === anchor.getMonth()
          const isToday = sameDay(day, now)
          const isSelected = !!selectedDay && sameDay(day, selectedDay)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(isSelected ? null : day)}
              className={cn(
                // Mobile: taller tap targets with dots only — titles don't fit in ~50px columns.
                // sm+: desktop month cell with truncated titles.
                'flex min-h-[5.25rem] flex-col items-stretch gap-0.5 bg-background p-1 text-left transition-colors hover:bg-accent sm:min-h-[6rem] sm:p-1.5',
                !inMonth && 'bg-muted/20',
                isSelected && 'ring-2 ring-inset ring-foreground/30',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center self-center rounded-full text-xs sm:h-5 sm:w-5 sm:self-start',
                  isToday
                    ? 'bg-foreground text-background'
                    : inMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                {day.getDate()}
              </span>
              {/* Mobile: presence dots only */}
              <div className="mt-auto flex flex-wrap justify-center gap-0.5 px-0.5 pb-0.5 sm:hidden">
                {items.slice(0, calendarConfig.display.monthMobileDotLimit).map((goal) => (
                  <span
                    key={goal.id}
                    className={cn('h-1.5 w-1.5 rounded-full', monthDotTone(goal))}
                  />
                ))}
                {items.length > calendarConfig.display.monthMobileDotLimit ? (
                  <span className="text-[9px] leading-none text-muted-foreground">
                    +{items.length - calendarConfig.display.monthMobileDotLimit}
                  </span>
                ) : null}
              </div>
              {/* Desktop: titled chips */}
              <div className="hidden min-h-0 flex-1 space-y-0.5 overflow-hidden sm:block">
                {items.slice(0, calendarConfig.display.monthTaskLimit).map((goal) => (
                  <MonthDayItem key={goal.id} goal={goal} />
                ))}
                {items.length > calendarConfig.display.monthTaskLimit ? (
                  <p className="px-0.5 text-[11px] text-muted-foreground">
                    +{items.length - calendarConfig.display.monthTaskLimit} more
                  </p>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {selectedDay ? (
        <DayDetailPanel
          focusedGoalId={focusedGoalId}
          day={selectedDay}
          goals={byDay.get(toDateInput(selectedDay)) ?? []}
          onClose={() => onSelectDay(null)}
        />
      ) : null}
    </div>
  )
}
