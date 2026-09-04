import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Check, ArrowUpRight, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import {
  useCalendarBoard,
  useCalendarGoalsInRange,
  useCreateGoalIdea,
  useScheduleGoalIdea,
  useDismissGoalIdea,
  useUpdateScheduledGoal,
  type components,
} from '@project/sdk'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/lib/headerContext'
import { CalendarCollectionInsights } from './CalendarCollectionInsights'

type ScheduledGoal = components['schemas']['ScheduledGoal']
type GoalIdea = components['schemas']['GoalIdea']
type Horizon = 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK'
type View = 'list' | 'calendar'
type CalendarMode = 'month' | 'year'

const ESTIMATE_CHOICES = [30, 60, 120]
const WHEN_CHOICES: { value: Horizon; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'THIS_WEEK', label: 'This week' },
  { value: 'NEXT_WEEK', label: 'Next week' },
]
const WEEKDAY_LABELS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatMinutes(minutes: number | null | undefined): string | null {
  if (!minutes) return null
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Local midnight of `day`, as an ISO instant — same encoding as lib/calendarWindows.ts's
// resolveHorizonDate on the server, so a day picked here buckets correctly everywhere else.
function startOfDayIso(day: Date): string {
  const d = new Date(day)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function daysBetween(a: Date, b: Date): number {
  const startA = new Date(a)
  startA.setHours(0, 0, 0, 0)
  const startB = new Date(b)
  startB.setHours(0, 0, 0, 0)
  return Math.round((startA.getTime() - startB.getTime()) / (24 * 60 * 60 * 1000))
}

// The header a day-grouped list (This Week / Upcoming looking forward, Recently Completed looking
// back) shows above the goals that land on it — this is the "grouping" a flat scheduledFor-sorted
// list was missing: Today/Tomorrow/a weekday name close in, a short date further out, so a week's
// worth of tasks reads as days at a glance instead of an undifferentiated pile.
function dayGroupLabel(date: Date, now: Date, direction: 'future' | 'past'): string {
  const diff = daysBetween(date, now)
  if (diff === 0) return 'Today'
  if (direction === 'future') {
    if (diff === 1) return 'Tomorrow'
    if (diff > 1 && diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' })
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  if (diff === -1) return 'Yesterday'
  if (diff < -1 && diff >= -6) return 'Earlier this week'
  return 'Earlier'
}

// Clusters an already-chronologically-sorted list into consecutive same-label runs — cheap and
// correct as long as the source query stays sorted (This Week ascending, Recently Completed
// descending), which it does; no re-sort needed here.
function groupConsecutive<T>(
  items: T[],
  labelFor: (item: T) => string,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = []
  for (const item of items) {
    const label = labelFor(item)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

// Renders a goal list as day-labeled clusters instead of one flat run — used for This Week/
// Upcoming (by scheduledFor) and Recently Completed (by completedAt) everywhere they appear, in
// both List and Calendar view, so the two projections stay visually consistent.
function GroupedGoalList({
  goals,
  dateField,
  direction,
}: {
  goals: ScheduledGoal[]
  dateField: 'scheduledFor' | 'completedAt'
  direction: 'future' | 'past'
}) {
  const now = new Date()
  const groups = groupConsecutive(goals, (goal) => {
    const raw = goal[dateField]
    return raw ? dayGroupLabel(new Date(raw), now, direction) : 'Unscheduled'
  })
  return (
    <>
      {groups.map((group, index) => (
        <div key={`${group.label}-${index}`} className={index > 0 ? 'mt-3' : undefined}>
          <p className="pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
            {group.label}
          </p>
          <div className="divide-y divide-border border-t border-border">
            {group.items.map((goal) => (
              <GoalRow key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

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

// The full When/Pick-date/Estimate control — not shown up front (see IdeaRow's one-click
// default), only inside an expanded idea's "choose a different time" option.
function SchedulingControls({ idea, onScheduled }: { idea: GoalIdea; onScheduled: () => void }) {
  const schedule = useScheduleGoalIdea()
  const [estimate, setEstimate] = useState<number | 'CUSTOM'>(idea.defaultEstimateMinutes ?? 30)
  const [customMinutes, setCustomMinutes] = useState('')
  const [picking, setPicking] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  function resolvedEstimate(): number | undefined {
    if (estimate === 'CUSTOM') {
      const n = Number(customMinutes)
      return Number.isFinite(n) && n > 0 ? n : undefined
    }
    return estimate
  }

  async function submit(when: Horizon | 'DATE') {
    try {
      await schedule.mutateAsync({
        templateId: idea.templateId,
        when,
        estimateMinutes: resolvedEstimate(),
        ...(when === 'DATE'
          ? {
              date: time ? new Date(`${date}T${time}`).toISOString() : new Date(date).toISOString(),
              hasTime: !!time,
            }
          : {}),
      })
      toast.success('Scheduled')
      onScheduled()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not schedule this.')
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">When?</p>
        <div className="flex flex-wrap gap-1.5">
          {WHEN_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              onClick={() => submit(choice.value)}
              className="rounded-full border border-input-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-foreground/40 hover:bg-accent"
            >
              {choice.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium',
              picking
                ? 'border-foreground/30 bg-foreground text-background'
                : 'border-input-border text-foreground hover:border-foreground/40 hover:bg-accent',
            )}
          >
            Pick date
          </button>
        </div>
        {picking ? (
          <div className="mt-2 flex items-center gap-2">
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
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Estimate</p>
        <div className="flex flex-wrap gap-1.5">
          {ESTIMATE_CHOICES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setEstimate(minutes)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium',
                estimate === minutes
                  ? 'border-foreground/30 bg-foreground text-background'
                  : 'border-input-border text-foreground hover:border-foreground/40 hover:bg-accent',
              )}
            >
              {formatMinutes(minutes)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEstimate('CUSTOM')}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium',
              estimate === 'CUSTOM'
                ? 'border-foreground/30 bg-foreground text-background'
                : 'border-input-border text-foreground hover:border-foreground/40 hover:bg-accent',
            )}
          >
            Custom
          </button>
        </div>
        {estimate === 'CUSTOM' ? (
          <input
            type="number"
            min={5}
            placeholder="Minutes"
            value={customMinutes}
            onChange={(event) => setCustomMinutes(event.target.value)}
            className="mt-2 h-8 w-full rounded border border-input-border bg-transparent px-2 text-xs"
          />
        ) : null}
      </div>

      {picking ? (
        <Button
          size="sm"
          className="w-full"
          loading={schedule.isPending}
          disabled={!date}
          onClick={() => submit('DATE')}
        >
          Schedule for that time
        </Button>
      ) : null}
    </div>
  )
}

// Where the single-click Schedule button on an idea row lands it. List view defaults to "this
// week" (unchanged); the Calendar view's bottom Ideas section passes a day-aware target instead —
// the selected day if one's open, else today — since a day is already in view there.
type ScheduleTarget = { when: 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK' } | { when: 'DATE'; date: Date }

// An idea row: still just a possibility, not committed work — Schedule/Dismiss only, never a
// direct "Open X" action (see toGoalIdeaDTO). Clicking the title expands inline (no modal) to
// show why it matters, the estimate, and — if wanted — a specific time instead of the one-click
// default.
function IdeaRow({ idea, scheduleTarget }: { idea: GoalIdea; scheduleTarget?: ScheduleTarget }) {
  const [expanded, setExpanded] = useState(false)
  const [choosingTime, setChoosingTime] = useState(false)
  const schedule = useScheduleGoalIdea()
  const dismiss = useDismissGoalIdea()

  async function handleSchedule() {
    const target = scheduleTarget ?? { when: 'THIS_WEEK' as const }
    try {
      await schedule.mutateAsync(
        target.when === 'DATE'
          ? {
              templateId: idea.templateId,
              when: 'DATE',
              date: startOfDayIso(target.date),
              hasTime: false,
            }
          : { templateId: idea.templateId, when: target.when },
      )
      toast.success('Scheduled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not schedule this.')
    }
  }

  async function handleDismiss() {
    try {
      await dismiss.mutateAsync(idea.templateId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not dismiss this.')
    }
  }

  const estimate = formatMinutes(idea.defaultEstimateMinutes)

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm text-foreground"
        >
          {expanded ? (
            <ChevronDown size={13} className="shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{idea.title}</span>
        </button>
        <Button variant="outline" size="sm" loading={schedule.isPending} onClick={handleSchedule}>
          Schedule
        </Button>
        <Button
          variant="ghost"
          size="sm"
          loading={dismiss.isPending}
          onClick={handleDismiss}
          className="text-muted-foreground"
        >
          Dismiss
        </Button>
      </div>

      {expanded ? (
        <div className="ml-5 mt-2 space-y-2 text-sm">
          {idea.detail ? (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Why it matters: </span>
              {idea.detail}
            </p>
          ) : null}
          {estimate ? <p className="text-muted-foreground">Estimate: {estimate}</p> : null}
          {choosingTime ? (
            <SchedulingControls idea={idea} onScheduled={() => setChoosingTime(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setChoosingTime(true)}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Choose a different time
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

// A Today/This Week/Recently Completed row — the same expand-inline treatment as IdeaRow, but for
// committed work: the action destination (if any) is always visible right under the title, since
// scheduling is what earns it. Reused for completed goals too (checkbox renders filled, done
// goals can still be reopened from the expanded panel — "keep it visible," not read-only).
function GoalRow({ goal }: { goal: ScheduledGoal }) {
  const [expanded, setExpanded] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [date, setDate] = useState(goal.scheduledFor ? goal.scheduledFor.slice(0, 10) : '')
  const [time, setTime] = useState(
    goal.hasTime && goal.scheduledFor ? goal.scheduledFor.slice(11, 16) : '',
  )
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
        scheduledFor: new Date(time ? `${date}T${time}` : `${date}T00:00:00`).toISOString(),
        hasTime: !!time,
      })
      toast.success('Rescheduled')
      setRescheduling(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reschedule this.')
    }
  }

  return (
    <div className="py-2.5">
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
          onClick={() => setExpanded((e) => !e)}
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
              <Button variant="outline" size="sm" onClick={() => setRescheduling(true)}>
                Reschedule
              </Button>
              {goal.actionTarget && goal.actionLabel ? (
                <ActionButton target={goal.actionTarget} label={goal.actionLabel} />
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

// The top persistent input — a Task, not an Idea: typing here commits straight to Today, the same
// create-then-schedule composition as QuickAddToDay, using the idea's own defaults (an estimate
// isn't forced, matching what scheduling a plain idea does). Because it schedules immediately,
// the old "Add an idea" behavior (create with no schedule) moved to its own button — see
// AddIdeaInline — living next to the persistent Ideas section instead of the page header.
function QuickAddTask() {
  const [title, setTitle] = useState('')
  const createIdea = useCreateGoalIdea()
  const scheduleIdea = useScheduleGoalIdea()

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      const created = await createIdea.mutateAsync(trimmed)
      await scheduleIdea.mutateAsync({ templateId: created.data!.templateId, when: 'TODAY' })
      setTitle('')
      toast.success('Added to today')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add this task.')
    }
  }

  const pending = createIdea.isPending || scheduleIdea.isPending

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
        placeholder="Add a task…"
        className="h-8 min-w-0 flex-1 text-xs sm:max-w-xs"
      />
      <Button
        variant="outline"
        size="sm"
        loading={pending}
        onClick={submit}
        aria-label="Add task"
        className="shrink-0"
      >
        <Plus size={13} />
        <span className="hidden sm:inline">Add task</span>
      </Button>
    </div>
  )
}

// A genuine idea — no schedule attached — click-to-reveal so it doesn't compete with the section
// header's usual weight. Lives next to the Ideas section (List view, and the Calendar view's own
// bottom Ideas section) now that the top persistent input commits straight to a task.
function AddIdeaInline() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const createIdea = useCreateGoalIdea()

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      await createIdea.mutateAsync(trimmed)
      setTitle('')
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add this idea.')
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
      >
        <Plus size={13} /> Add idea
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
          if (event.key === 'Escape') setOpen(false)
        }}
        onBlur={() => {
          if (!title.trim()) setOpen(false)
        }}
        placeholder="Idea title…"
        className="h-7 w-40 text-xs"
      />
      <Button size="sm" loading={createIdea.isPending} onClick={submit}>
        Add
      </Button>
    </div>
  )
}

function Section({
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

// The Ideas section, shared by List view and the Calendar view's bottom panel — always visible
// (not gated on having ideas) so AddIdeaInline is always reachable. scheduleTarget makes the
// Calendar context's Schedule buttons day-aware (see ScheduleTarget's own comment).
function IdeasSection({
  ideas,
  scheduleTarget,
}: {
  ideas: GoalIdea[]
  scheduleTarget?: ScheduleTarget
}) {
  return (
    <Section label="Ideas" action={<AddIdeaInline />}>
      {ideas.length > 0 ? (
        ideas.map((idea) => (
          <IdeaRow key={idea.templateId} idea={idea} scheduleTarget={scheduleTarget} />
        ))
      ) : (
        <p className="py-3 text-sm text-muted-foreground">No ideas right now.</p>
      )}
    </Section>
  )
}

// List view — four plain buckets, rows and hairlines, no cards/kanban/priority chrome. See
// CalendarPage's own doc comment for the full architecture.
function ListView({
  today,
  thisWeek,
  recentlyCompleted,
  ideas,
}: {
  today: ScheduledGoal[]
  thisWeek: ScheduledGoal[]
  recentlyCompleted: ScheduledGoal[]
  ideas: GoalIdea[]
}) {
  return (
    <div className="space-y-8">
      {today.length > 0 ? (
        <Section label="Today">
          {today.map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))}
        </Section>
      ) : null}

      {thisWeek.length > 0 ? (
        <Section label="This week" bare>
          <GroupedGoalList goals={thisWeek} dateField="scheduledFor" direction="future" />
        </Section>
      ) : null}

      {recentlyCompleted.length > 0 ? (
        <Section label="Recently completed" bare>
          <GroupedGoalList goals={recentlyCompleted} dateField="completedAt" direction="past" />
        </Section>
      ) : null}

      <IdeasSection ideas={ideas} />
    </div>
  )
}

// Fast capture straight onto a day (or, when `day` is null, the day-agnostic "this week" bucket)
// — no idea step required: typing here is already an act of scheduling, same as clicking a
// specific day cell already answers "when." Creates a plain user idea and schedules it in the
// same action, via the existing create+schedule endpoints (no new API surface).
function QuickAddToDay({ day, compact = false }: { day: Date | null; compact?: boolean }) {
  const [title, setTitle] = useState('')
  const createIdea = useCreateGoalIdea()
  const scheduleIdea = useScheduleGoalIdea()

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      const created = await createIdea.mutateAsync(trimmed)
      await scheduleIdea.mutateAsync({
        templateId: created.data!.templateId,
        ...(day
          ? { when: 'DATE', date: startOfDayIso(day), hasTime: false }
          : { when: 'THIS_WEEK' }),
      })
      setTitle('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add this.')
    }
  }

  const pending = createIdea.isPending || scheduleIdea.isPending

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

// ---------- Calendar (Week/Month) — a second projection over the exact same scheduled items, no
// separate calendar-event model (CLAUDE.md's Calendar entry). Both views read an arbitrary,
// navigable date range (useCalendarGoalsInRange) rather than the List view's fixed "relative to
// now" board — a real calendar has to show last month or next month, not just this week. Ideas
// live in List view only; here, "adding an idea" means typing directly onto a day (QuickAddToDay)
// — the day you pick is already the scheduling decision, so there's no separate idea step.

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

// Prev/next/Today — the minimum a real calendar needs to navigate anywhere, not just "now."
function CalendarNav({
  label,
  onPrev,
  onNext,
  onToday,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onToday}>
        Today
      </Button>
      <div className="flex items-center rounded-lg border border-border">
        <button
          type="button"
          aria-label="Previous"
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center border-l border-border text-muted-foreground hover:text-foreground"
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <p className="text-sm font-medium text-foreground">{label}</p>
    </div>
  )
}

function CalendarModeSwitch({
  mode,
  onChange,
}: {
  mode: CalendarMode
  onChange: (mode: CalendarMode) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {(['month', 'year'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-label={`${option} mode`}
          onClick={() => onChange(option)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
            mode === option
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

// The day detail panel — opened by clicking a day cell in either Week or Month mode. Full
// GoalRow treatment (expand for detail/reschedule/mark done, action links) plus the day's own
// quick-add: this is "ideas added at the day level," in the one place with room for it.
function DayDetailPanel({
  day,
  goals,
  onClose,
}: {
  day: Date
  goals: ScheduledGoal[]
  onClose: () => void
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
            <GoalRow key={goal.id} goal={goal} />
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
    </div>
  )
}

const MONTH_CELL_CAP = 3
const MONTH_MOBILE_DOT_CAP = 4

// The primary Calendar surface on desktop — a real month grid, the way an indie developer would
// actually want to see a whole month's worth of work at a glance. Every goal renders on its real
// scheduledFor date; clicking a day opens the detail panel below (DayDetailPanel), which is also
// where you add something for that day.
function MonthView({
  anchor,
  goals,
  selectedDay,
  onSelectDay,
}: {
  anchor: Date
  goals: ScheduledGoal[]
  selectedDay: Date | null
  onSelectDay: (day: Date | null) => void
}) {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
  const gridStart = startOfWeek(monthStart)
  const lastWeekStart = startOfWeek(addDays(monthEnd, -1))
  const weeks = Math.round(
    (addDays(lastWeekStart, 7).getTime() - gridStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
  )
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i))

  const byDay = new Map<string, ScheduledGoal[]>()
  for (const goal of goals) {
    if (!goal.scheduledFor) continue
    const key = new Date(goal.scheduledFor).toDateString()
    const bucket = byDay.get(key) ?? []
    bucket.push(goal)
    byDay.set(key, bucket)
  }
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? ''))
  }

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
          const key = day.toDateString()
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
                {items.slice(0, MONTH_MOBILE_DOT_CAP).map((goal) => (
                  <span
                    key={goal.id}
                    className={cn('h-1.5 w-1.5 rounded-full', monthDotTone(goal))}
                  />
                ))}
                {items.length > MONTH_MOBILE_DOT_CAP ? (
                  <span className="text-[9px] leading-none text-muted-foreground">
                    +{items.length - MONTH_MOBILE_DOT_CAP}
                  </span>
                ) : null}
              </div>
              {/* Desktop: titled chips */}
              <div className="hidden min-h-0 flex-1 space-y-0.5 overflow-hidden sm:block">
                {items.slice(0, MONTH_CELL_CAP).map((goal) => (
                  <MonthDayItem key={goal.id} goal={goal} />
                ))}
                {items.length > MONTH_CELL_CAP ? (
                  <p className="px-0.5 text-[11px] text-muted-foreground">
                    +{items.length - MONTH_CELL_CAP} more
                  </p>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {selectedDay ? (
        <DayDetailPanel
          day={selectedDay}
          goals={byDay.get(selectedDay.toDateString()) ?? []}
          onClose={() => onSelectDay(null)}
        />
      ) : null}
    </div>
  )
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const YEAR_DOT_CAP = 8

// The secondary Calendar mode — "very lightweight overview only, dots/counts, not detailed task
// rendering." Twelve month tiles; clicking one jumps into Month mode anchored there. No day
// selection or detail panel here by design — that's what Month is for.
function YearView({
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
  const byMonth = Array.from({ length: 12 }, () => ({ scheduled: 0, done: 0 }))
  for (const goal of goals) {
    if (!goal.scheduledFor) continue
    const d = new Date(goal.scheduledFor)
    if (d.getFullYear() !== year) continue
    const bucket = byMonth[d.getMonth()]!
    if (goal.status === 'DONE') bucket.done++
    else bucket.scheduled++
  }

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
                {Array.from({ length: Math.min(done, YEAR_DOT_CAP) }).map((_, idx) => (
                  <span key={`d${idx}`} className="h-1.5 w-1.5 rounded-full bg-success" />
                ))}
                {Array.from({ length: Math.min(scheduled, YEAR_DOT_CAP) }).map((_, idx) => (
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

function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {(['list', 'calendar'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-label={`${option} view`}
          onClick={() => onChange(option)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
            view === option
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

// The daily open — "what's worth doing today, what did I mean to do this week, what did I just
// finish, and what could I do next" — per the product spec's Calendar concept. List is the
// primary, default view (rows and hairlines, no dashboard/kanban chrome); Calendar is a second
// projection over the exact same ScheduledGoal rows — a real, navigable Month grid by default,
// Year as a lightweight overview mode, not a parallel event model. Calendar view also carries its
// own Upcoming/Recently Completed/Ideas lists below the grid, reusing the same board data List
// view shows — the grid is for "when," the lists are for "what," and neither duplicates data the
// other doesn't already have. See CLAUDE.md's dated Calendar entry for the full architecture
// (GoalIdeaTemplate/GoalIdeaState/ScheduledGoal/GoalEvent, lib/coachRules.ts for the
// Foundation->Attract->Capture->Convert->Grow progression).
export function CalendarPage() {
  usePageTitle('Calendar')
  const [view, setView] = useState<View>('list')
  const [mode, setMode] = useState<CalendarMode>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const { data, isLoading } = useCalendarBoard()

  const range =
    mode === 'month'
      ? {
          from: startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1)),
          to: addDays(
            startOfWeek(addDays(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1), -1)),
            7,
          ),
        }
      : { from: new Date(anchor.getFullYear(), 0, 1), to: new Date(anchor.getFullYear() + 1, 0, 1) }
  const rangeQuery = useCalendarGoalsInRange(range.from.toISOString(), range.to.toISOString())

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const board = data?.data
  const today = board?.today ?? []
  const thisWeek = board?.thisWeek ?? []
  const recentlyCompleted = board?.recentlyCompleted ?? []
  const ideas = board?.ideas ?? []
  const rangeGoals = rangeQuery.data?.data ?? []

  function step(n: number) {
    setSelectedDay(null)
    setAnchor((current) =>
      mode === 'month'
        ? new Date(current.getFullYear(), current.getMonth() + n, 1)
        : new Date(current.getFullYear() + n, current.getMonth(), 1),
    )
  }
  function jumpToday() {
    setSelectedDay(null)
    setAnchor(new Date())
  }
  function jumpToMonth(monthIndex: number) {
    setSelectedDay(null)
    setMode('month')
    setAnchor(new Date(anchor.getFullYear(), monthIndex, 1))
  }

  const navLabel =
    mode === 'month'
      ? anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : String(anchor.getFullYear())

  // Calendar's own Ideas section schedules onto whichever day is open, or today if none is —
  // "ideas are things users add at the day level," and a day is always implicitly in view here.
  const calendarScheduleTarget: ScheduleTarget = selectedDay
    ? { when: 'DATE', date: selectedDay }
    : { when: 'TODAY' }

  return (
    <div className="mx-auto w-full min-w-0 space-y-6">
      <CalendarCollectionInsights
        today={today}
        thisWeek={thisWeek}
        recentlyCompleted={recentlyCompleted}
        ideas={ideas}
      />

      <PageHeader
        variant="list"
        title="Calendar"
        className="min-w-0"
        primaryAction={<ViewSwitch view={view} onChange={setView} />}
      >
        {/* Full-width under the title row so the fixed w-48 input + Add + view switch can't
            spill past the right edge on narrow viewports. */}
        <QuickAddTask />
      </PageHeader>

      {view === 'list' ? (
        <ListView
          today={today}
          thisWeek={thisWeek}
          recentlyCompleted={recentlyCompleted}
          ideas={ideas}
        />
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CalendarNav
                label={navLabel}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
                onToday={jumpToday}
              />
              <CalendarModeSwitch mode={mode} onChange={setMode} />
            </div>
            {mode === 'month' ? (
              <MonthView
                anchor={anchor}
                goals={rangeGoals}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            ) : (
              <YearView anchor={anchor} goals={rangeGoals} onSelectMonth={jumpToMonth} />
            )}
          </div>

          {today.length > 0 || thisWeek.length > 0 ? (
            <Section label="Upcoming" bare>
              <GroupedGoalList
                goals={[...today, ...thisWeek]}
                dateField="scheduledFor"
                direction="future"
              />
            </Section>
          ) : null}

          {recentlyCompleted.length > 0 ? (
            <Section label="Recently completed" bare>
              <GroupedGoalList goals={recentlyCompleted} dateField="completedAt" direction="past" />
            </Section>
          ) : null}

          <IdeasSection ideas={ideas} scheduleTarget={calendarScheduleTarget} />
        </div>
      )}
    </div>
  )
}
