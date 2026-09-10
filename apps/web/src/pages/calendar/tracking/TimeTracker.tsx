import { Button } from '@/components/ui/Button'
import { SlideoutRail } from '@/components/ui/SlideoutRail'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'
import {
  ApiError,
  useCalendarBoard,
  useCurrentTimeEntry,
  useCurrentUser,
  useStartTimeEntry,
  useStopCurrentTimeEntry,
} from '@project/sdk'
import { Play, Square } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { calendarConfig } from '../calendar.config'
import {
  formatElapsedMinutes,
  localInputToIso,
  splitDateTimeInput,
  toDateTimeInput,
} from '../calendar.dates'
import { trackingPicks } from '../calendar.selectors'
import { ScheduledGoal, TimeEntry } from '../calendar.types'
import { useElapsedMinutes } from './useElapsedMinutes'

// The "Start Work" rail (Time Tracking, Phase 2, 2026-09-09) — free-text description plus a few
// quick picks (my tasks today, then unassigned tasks today; never a teammate's own assigned
// work). Sourced from the board's own `today` bucket already fetched by useCalendarBoard — no new
// query. Picking one prefills the description and links scheduledGoalId; the text stays editable
// afterward either way.
function TimeTrackerForm({ onDone }: { onDone: () => void }) {
  const [description, setDescription] = useState('')
  const [scheduledGoalId, setScheduledGoalId] = useState<string | null>(null)
  const { data: board } = useCalendarBoard()
  const { data: me } = useCurrentUser()
  const start = useStartTimeEntry()

  const today = board?.data.today ?? []
  const picks = trackingPicks(today, me?.data.id)

  function pick(goal: ScheduledGoal) {
    setDescription(goal.title)
    setScheduledGoalId(goal.id)
  }

  async function submit() {
    const trimmed = description.trim()
    if (!trimmed) return
    try {
      await start.mutateAsync({
        description: trimmed,
        scheduledGoalId: scheduledGoalId ?? undefined,
      })
      toast.success('Started')
      onDone()
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ACTIVE_TIME_ENTRY_EXISTS') {
        const active = error.data as
          { businessId: string; businessName: string; description: string } | undefined
        if (active) {
          const sameBusiness = active.businessId === me?.data.businessId
          toast.error(
            sameBusiness
              ? `You're already tracking "${active.description}". Stop it first.`
              : `You're tracking "${active.description}" for ${active.businessName}. Stop it there first.`,
          )
          onDone()
          return
        }
      }
      toast.error(error instanceof Error ? error.message : 'Could not start this.')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Start Work</h2>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <div className="mt-5">
        <Textarea
          autoFocus
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="What are you working on? (visible to your team)"
          className="text-sm"
        />
      </div>

      {picks.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Today</p>
          <div className="space-y-1">
            {picks.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => pick(goal)}
                className={cn(
                  'block w-full truncate rounded border px-2.5 py-1.5 text-left text-xs',
                  scheduledGoalId === goal.id
                    ? 'border-foreground/30 bg-foreground text-background'
                    : 'border-input-border text-foreground hover:border-foreground/40 hover:bg-accent',
                )}
              >
                {goal.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <Button
          className="w-full"
          loading={start.isPending}
          disabled={!description.trim()}
          onClick={submit}
        >
          Start
        </Button>
      </div>
    </div>
  )
}

// The forgotten-timer correction rail — only ever reached when Stop Work is clicked on an entry
// that's been running 8+ hours (calendarConfig.tracking.correctionThresholdMinutes): never stop a very-long-running entry
// silently, since it's far more likely someone forgot to stop it than actually worked that long.
// "Stop now" and "Set end time" are deliberately separate actions, matching the product's own
// "never silently stop, cap, or move recorded work" rule — startedAt itself is never editable.
function StopWorkCorrectionForm({
  entry,
  elapsedMinutes,
  onDone,
}: {
  entry: TimeEntry
  elapsedMinutes: number
  onDone: () => void
}) {
  const [correctedAt, setCorrectedAt] = useState('')
  const stop = useStopCurrentTimeEntry()

  async function submit(endedAt?: string) {
    try {
      const iso = endedAt ? localInputToIso(...splitDateTimeInput(endedAt)) : undefined
      if (iso && (new Date(iso) < new Date(entry.startedAt) || new Date(iso) > new Date())) {
        throw new Error('End time must be between the start time and now.')
      }
      await stop.mutateAsync(iso ? { endedAt: iso } : {})
      toast.success('Stopped')
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not stop this.')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Still running?</h2>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        &ldquo;{entry.description}&rdquo; has been running for{' '}
        {formatElapsedMinutes(elapsedMinutes)}. If you forgot to stop it, set when it actually
        ended.
      </p>

      <div className="mt-5">
        <Button
          variant="outline"
          className="w-full"
          loading={stop.isPending}
          onClick={() => submit()}
        >
          Stop now
        </Button>
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Or set when it ended</p>
        <input
          type="datetime-local"
          value={correctedAt}
          min={toDateTimeInput(new Date(entry.startedAt))}
          max={toDateTimeInput(new Date())}
          onChange={(event) => setCorrectedAt(event.target.value)}
          className="h-8 w-full rounded border border-input-border bg-transparent px-2 text-xs"
        />
      </div>

      <div className="mt-auto pt-4">
        <Button
          className="w-full"
          loading={stop.isPending}
          disabled={!correctedAt}
          onClick={() => submit(correctedAt)}
        >
          Set end time
        </Button>
      </div>
    </div>
  )
}

// The header Start/Stop Work control — next to Add task, per the product spec. Idle: opens
// TimeTrackerForm. Running: shows the description + elapsed time (to the nearest minute) and a
// Stop Work button. Never auto-stops anything — see useStartTimeEntry's own comment.
export function StartStopWorkControl() {
  const { data } = useCurrentTimeEntry()
  const stop = useStopCurrentTimeEntry()
  const [railOpen, setRailOpen] = useState(false)
  const [correcting, setCorrecting] = useState(false)

  const entry = data?.data ?? null
  const elapsedMinutes = useElapsedMinutes(entry?.startedAt ?? null)

  if (!entry) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setRailOpen(true)} className="shrink-0">
          <Play size={13} />
          <span className="hidden sm:inline">Start Work</span>
        </Button>
        <SlideoutRail open={railOpen} onClose={() => setRailOpen(false)}>
          <TimeTrackerForm onDone={() => setRailOpen(false)} />
        </SlideoutRail>
      </>
    )
  }

  async function handleStopClick() {
    if (elapsedMinutes >= calendarConfig.tracking.correctionThresholdMinutes) {
      setCorrecting(true)
      return
    }
    try {
      await stop.mutateAsync({})
      toast.success('Stopped')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not stop this.')
    }
  }

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:inline">
        {entry.description}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatElapsedMinutes(elapsedMinutes)}
      </span>
      <Button variant="outline" size="sm" loading={stop.isPending} onClick={handleStopClick}>
        <Square size={13} />
        <span className="hidden sm:inline">Stop Work</span>
      </Button>
      <SlideoutRail open={correcting} onClose={() => setCorrecting(false)}>
        <StopWorkCorrectionForm
          entry={entry}
          elapsedMinutes={elapsedMinutes}
          onDone={() => setCorrecting(false)}
        />
      </SlideoutRail>
    </div>
  )
}
