import { Button } from '@/components/ui/Button'
import { SlideoutRail } from '@/components/ui/SlideoutRail'
import { cn } from '@/lib/utils'
import { useBusinessTeam, useUpdateScheduledGoal } from '@project/sdk'
import { ArrowUpRight, Check, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { formatMinutes, formatTime, localInputToIso, scheduleInputs } from '../calendar.dates'
import { groupGoals } from '../calendar.selectors'
import { ScheduledGoal } from '../calendar.types'
import { EstimatePicker } from './CalendarPrimitives'
import { TaskOwner } from './TaskOwnership'

// The "go do this" button a *scheduled* task can carry — Calendar as a command center for
// committed work. Ideas never get one (see toGoalIdeaDTO's own comment on why): this only ever
// renders from a ScheduledGoal's actionTarget, and only inside the expanded panel, matching the
// other controls there (Mark done, Reschedule) rather than sitting always-visible on the row.
function ActionButton({ target, label }: { target: string; label: string }) {
  const navigate = useNavigate()
  return (
    <Button variant="outline" size="sm" onClick={() => navigate(target)}>
      {label} <ArrowUpRight size={13} />
    </Button>
  )
}

// The post-creation edit rail (Time Tracking & Team Activity epic, 2026-09-09) — reassign this
// task to a teammate and/or adjust its estimate. Deliberately two fields only; this is never
// labeled "Edit task" and never touches scheduling — Reschedule stays exactly where it already is,
// in GoalRow's own expanded panel.
function AssignEstimateForm({ goal, onDone }: { goal: ScheduledGoal; onDone: () => void }) {
  const team = useBusinessTeam()
  const members = (team.data?.data.members ?? []).filter((m) => !m.suspendedAt)
  const [assignedToUserId, setAssignedToUserId] = useState(goal.assignedToUserId ?? '')
  const [estimateMinutes, setEstimateMinutes] = useState<number | null>(
    goal.estimateMinutes ?? null,
  )
  const updateGoal = useUpdateScheduledGoal()

  async function submit() {
    try {
      await updateGoal.mutateAsync({
        goalId: goal.id,
        assignedToUserId: assignedToUserId || null,
        estimateMinutes,
      })
      toast.success('Saved')
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this.')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Assign & Estimate</h2>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{goal.title}</p>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Assigned to</p>
          <select
            value={assignedToUserId}
            onChange={(event) => setAssignedToUserId(event.target.value)}
            className="h-8 w-full rounded border border-input-border bg-transparent px-2 text-xs"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.email}
              </option>
            ))}
          </select>
        </div>

        <EstimatePicker value={estimateMinutes} onChange={setEstimateMinutes} />
      </div>

      <div className="mt-auto pt-4">
        <Button className="w-full" loading={updateGoal.isPending} onClick={submit}>
          Save
        </Button>
      </div>
    </div>
  )
}

// A Today/This Week/Recently Completed row — the same expand-inline treatment as IdeaRow, but for
// committed work: the action destination (if any) is always visible right under the title, since
// scheduling is what earns it. Reused for completed goals too (checkbox renders filled, done
// goals can still be reopened from the expanded panel — "keep it visible," not read-only).
export function GoalRow({
  goal,
  focusedGoalId,
}: {
  goal: ScheduledGoal
  focusedGoalId?: string | null
}) {
  const highlighted = focusedGoalId === goal.id
  const [expansion, setExpansion] = useState({ focus: focusedGoalId, expanded: highlighted })
  const expanded = expansion.focus === focusedGoalId ? expansion.expanded : highlighted
  const [rescheduling, setRescheduling] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [date, setDate] = useState(() => scheduleInputs(goal.scheduledFor, goal.hasTime).date)
  const [time, setTime] = useState(() => scheduleInputs(goal.scheduledFor, goal.hasTime).time)
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
    <div id={`goal-${goal.id}`} className={cn('py-2.5', highlighted && 'rounded bg-accent px-2')}>
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
          onClick={() => setExpansion({ focus: focusedGoalId, expanded: !expanded })}
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
        {progress ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{progress}</span>
        ) : null}
        {estimate ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{estimate}</span>
        ) : null}
        <TaskOwner userId={goal.assignedToUserId} />
      </div>

      {expanded ? (
        <div className="ml-8 mt-2 space-y-2 text-sm">
          {goal.detail ? <p className="text-muted-foreground">{goal.detail}</p> : null}
          {rescheduling ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-8 flex-1 rounded border border-input-border bg-transparent px-2 text-xs"
              />
              <input
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
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={updateGoal.isPending}
                onClick={() => toggleDone()}
              >
                <Check size={13} /> {done ? 'Mark not done' : 'Mark done'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const inputs = scheduleInputs(goal.scheduledFor, goal.hasTime)
                  setDate(inputs.date)
                  setTime(inputs.time)
                  setRescheduling(true)
                }}
              >
                Reschedule
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAssigning(true)}>
                <UserCog size={13} /> Assign
              </Button>
              {goal.actionTarget && goal.actionLabel ? (
                <ActionButton target={goal.actionTarget} label={goal.actionLabel} />
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <SlideoutRail open={assigning} onClose={() => setAssigning(false)}>
        <AssignEstimateForm goal={goal} onDone={() => setAssigning(false)} />
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
