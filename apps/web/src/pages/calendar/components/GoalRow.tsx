import { Button } from '@/components/ui/Button'
import { SlideoutRail } from '@/components/ui/SlideoutRail'
import { cn } from '@/lib/utils'
import { useUpdateScheduledGoal } from '@project/sdk'
import { ArrowUpRight, Check, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { formatMinutes, formatTime, localInputToIso, scheduleInputs } from '../calendar.dates'
import { groupGoals } from '../calendar.selectors'
import { LinkableSubjectType, ScheduledGoal } from '../calendar.types'
import { InlineStartStop } from '../tracking/TimeTracker'
import { EditTaskRail } from './EditTaskRail'
import { LINK_TYPE_LABEL } from '../linkTypes'
import { TaskOwner } from './TaskOwnership'

// The "go do this" button a *scheduled* task can carry — Calendar as a command center for
// committed work. Ideas never get one (see toGoalIdeaDTO's own comment on why): this only ever
// renders from a ScheduledGoal's actionTarget, and only inside the task popover, matching the
// other quick actions there.
function ActionButton({ target, label }: { target: string; label: string }) {
  const navigate = useNavigate()
  return (
    <Button variant="outline" size="sm" onClick={() => navigate(target)}>
      {label} <ArrowUpRight size={13} />
    </Button>
  )
}

// The compact linked-object segment on the row itself (2026-09-15 Calendar connective-tissue
// pass) — "Page · Fall Launch," rendered straight from the goal's own frozen actionLabel/
// actionTarget (never a live per-row fetch — see EditTaskRail/CalendarService's own comment on
// why the link is resolved and frozen once, at link time). Clicking it navigates directly; no
// popover needed for the single most common thing you'd do with a link.
function LinkedSegment({ goal }: { goal: ScheduledGoal }) {
  const navigate = useNavigate()
  if (!goal.subjectId || !goal.actionTarget || !goal.actionLabel) return null
  const typeLabel = LINK_TYPE_LABEL[goal.subjectType as LinkableSubjectType]
  if (!typeLabel) return null
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        navigate(goal.actionTarget!)
      }}
      className="hidden shrink-0 truncate text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:inline"
    >
      {typeLabel} · {goal.actionLabel}
    </button>
  )
}

// The lightweight "click a task" detail — Complete, Start/Stop Work, Reschedule, and (if linked)
// Open, plus a "..." for the one secondary action (Dismiss) and a door into the full rail for
// everything else. Deliberately not the rail: renaming, reassigning, notes, recurrence, and
// changing the link all live one layer deeper, in EditTaskRail.
function TaskPopover({
  goal,
  open,
  onClose,
  onOpenRail,
}: {
  goal: ScheduledGoal
  open: boolean
  onClose: () => void
  onOpenRail: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [date, setDate] = useState(() => scheduleInputs(goal.scheduledFor, goal.hasTime).date)
  const [time, setTime] = useState(() => scheduleInputs(goal.scheduledFor, goal.hasTime).time)
  const updateGoal = useUpdateScheduledGoal()
  const done = goal.status === 'DONE'

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  async function toggleDone() {
    try {
      await updateGoal.mutateAsync({ goalId: goal.id, status: done ? 'SCHEDULED' : 'DONE' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this.')
    }
  }

  async function dismiss() {
    try {
      await updateGoal.mutateAsync({ goalId: goal.id, status: 'DISMISSED' })
      toast.success('Dismissed')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not dismiss this.')
    }
  }

  async function saveReschedule() {
    if (!date) return
    try {
      await updateGoal.mutateAsync({
        goalId: goal.id,
        scheduledFor: localInputToIso(date, time),
        hasTime: !!time,
      })
      toast.success('Rescheduled')
      setRescheduling(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reschedule this.')
    }
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={goal.title}
      className="absolute left-8 top-[calc(100%+0.25rem)] z-30 w-72 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-border bg-surface p-3 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'min-w-0 flex-1 text-sm font-medium text-foreground',
            done && 'text-muted-foreground line-through',
          )}
        >
          {goal.title}
        </p>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.25rem)] z-40 w-32 rounded-lg border border-border bg-surface p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={dismiss}
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {goal.detail ? <p className="text-xs text-muted-foreground">{goal.detail}</p> : null}

      {rescheduling ? (
        <div className="flex items-center gap-2">
          <input
            aria-label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-8 flex-1 rounded border border-input-border bg-transparent px-2 text-xs"
          />
          <input
            aria-label="Time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="h-8 rounded border border-input-border bg-transparent px-2 text-xs"
          />
          <Button
            size="sm"
            loading={updateGoal.isPending}
            disabled={!date}
            onClick={saveReschedule}
          >
            Save
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" loading={updateGoal.isPending} onClick={toggleDone}>
            <Check size={13} /> {done ? 'Reopen' : 'Complete'}
          </Button>
          <InlineStartStop goal={goal} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const inputs = scheduleInputs(goal.scheduledFor, goal.hasTime)
              setDate(inputs.date)
              setTime(inputs.time)
              setRescheduling(true)
            }}
          >
            Reschedule
          </Button>
          {goal.actionTarget && goal.actionLabel ? (
            <ActionButton target={goal.actionTarget} label={goal.actionLabel} />
          ) : null}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenRail}
        className="text-xs font-medium text-foreground underline underline-offset-2 hover:no-underline"
      >
        Edit task →
      </button>
    </div>
  )
}

// A Today/This Week/Recently Completed row — checkbox and title stay a one-click quick path;
// clicking the title opens the lightweight TaskPopover instead of expanding the row in place, so
// the list stays scannable even once a task carries a link/notes/recurrence. Reused for completed
// goals too (checkbox renders filled, done goals can still be reopened from the popover).
export function GoalRow({
  goal,
  focusedGoalId,
}: {
  goal: ScheduledGoal
  focusedGoalId?: string | null
}) {
  const highlighted = focusedGoalId === goal.id
  const [popoverState, setPopoverState] = useState({ focus: focusedGoalId, open: highlighted })
  const popoverOpen = popoverState.focus === focusedGoalId ? popoverState.open : highlighted
  const [railOpen, setRailOpen] = useState(false)
  const updateGoal = useUpdateScheduledGoal()

  const done = goal.status === 'DONE'
  const estimate = formatMinutes(goal.estimateMinutes)
  const progress =
    goal.trackingType !== 'MANUAL' && goal.targetValue != null
      ? `${goal.currentValue ?? 0}/${goal.targetValue}`
      : null

  async function toggleDone(event?: React.MouseEvent) {
    event?.stopPropagation()
    try {
      await updateGoal.mutateAsync({ goalId: goal.id, status: done ? 'SCHEDULED' : 'DONE' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this.')
    }
  }

  return (
    <div
      id={`goal-${goal.id}`}
      className={cn('relative py-2.5', highlighted && 'rounded bg-accent px-2')}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleDone}
          aria-label={`Mark "${goal.title}" ${done ? 'not done' : 'done'}`}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
            done
              ? 'border-success bg-success text-success-foreground'
              : 'border-input-border text-transparent hover:border-foreground/40 hover:text-foreground/60',
          )}
        >
          <Check size={12} />
        </button>
        <button
          type="button"
          onClick={() => setPopoverState({ focus: focusedGoalId, open: !popoverOpen })}
          aria-haspopup="dialog"
          aria-expanded={popoverOpen}
          className={cn(
            'min-w-0 flex-1 truncate text-left text-sm',
            done ? 'text-muted-foreground line-through' : 'text-foreground',
          )}
        >
          {goal.hasTime && goal.scheduledFor ? (
            <span className="mr-2 tabular-nums text-muted-foreground no-underline">
              {formatTime(goal.scheduledFor)}
            </span>
          ) : null}
          {goal.title}
        </button>
        <LinkedSegment goal={goal} />
        {progress ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{progress}</span>
        ) : null}
        {estimate ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{estimate}</span>
        ) : null}
        <TaskOwner userId={goal.assignedToUserId} />
      </div>

      <TaskPopover
        goal={goal}
        open={popoverOpen}
        onClose={() => setPopoverState({ focus: focusedGoalId, open: false })}
        onOpenRail={() => {
          setPopoverState({ focus: focusedGoalId, open: false })
          setRailOpen(true)
        }}
      />

      <SlideoutRail open={railOpen} onClose={() => setRailOpen(false)}>
        <EditTaskRail goal={goal} onDone={() => setRailOpen(false)} />
      </SlideoutRail>
    </div>
  )
}

// Renders a goal list as day-labeled clusters instead of one flat run — used for This Week/
// Upcoming (by scheduledFor) and Recently Completed (by completedAt) everywhere they appear, in
// both List and Calendar view, so the two projections stay visually consistent.
export function GroupedGoalList({
  goals,
  dateField,
  direction,
  focusedGoalId,
}: {
  goals: ScheduledGoal[]
  dateField: 'scheduledFor' | 'completedAt'
  direction: 'future' | 'past'
  focusedGoalId?: string | null
}) {
  const now = new Date()
  const groups = groupGoals(goals, dateField, direction, now)
  return (
    <>
      {groups.map((group, index) => (
        <div key={`${group.label}-${index}`} className={index > 0 ? 'mt-3' : undefined}>
          <p className="pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
            {group.label}
          </p>
          <div className="divide-y divide-border border-t border-border">
            {group.items.map((goal) => (
              <GoalRow key={goal.id} goal={goal} focusedGoalId={focusedGoalId} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
