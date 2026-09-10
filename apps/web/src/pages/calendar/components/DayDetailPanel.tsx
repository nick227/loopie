import { cn } from '@/lib/utils'
import { calendarConfig } from '../calendar.config'
import { ScheduledGoal } from '../calendar.types'
import { useQuickAddTask } from '../hooks/useQuickAddTask'
import { GoalRow } from './GoalRow'

// Fast capture straight onto a day (or, when `day` is null, the day-agnostic "this week" bucket)
// — no idea step required: typing here is already an act of scheduling, same as clicking a
// specific day cell already answers "when." Creates a plain user idea and schedules it in the
// same action, via the existing create+schedule endpoints (no new API surface).
function QuickAddToDay({ day, compact = false }: { day: Date | null; compact?: boolean }) {
  const { title, setTitle, pending, submit } = useQuickAddTask(
    day ? { when: 'DATE', date: day } : { when: calendarConfig.scheduling.listIdeaHorizon },
  )

  return (
    <input
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          submit()
        }
      }}
      disabled={pending}
      placeholder="+ Add"
      className={cn(
        'w-full rounded border border-dashed border-input-border bg-transparent px-1.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-solid focus:border-foreground/40 focus:outline-none',
        compact ? 'mt-1' : 'mt-2',
      )}
    />
  )
}

// The day detail panel — opened by clicking a day cell in Month mode. Full
// GoalRow treatment (expand for detail/reschedule/mark done, action links) plus the day's own
// quick-add: this is "ideas added at the day level," in the one place with room for it.
export function DayDetailPanel({
  day,
  goals,
  onClose,
  focusedGoalId,
}: {
  day: Date
  goals: ScheduledGoal[]
  onClose: () => void
  focusedGoalId?: string | null
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      {goals.length > 0 ? (
        <div className="divide-y divide-border border-t border-border">
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} focusedGoalId={focusedGoalId} />
          ))}
        </div>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">Nothing scheduled yet.</p>
      )}
      <div className="pt-2">
        <QuickAddToDay day={day} />
      </div>
    </div>
  )
}
