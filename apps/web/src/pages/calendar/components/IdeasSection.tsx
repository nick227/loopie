import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { useCreateGoalIdea, useDismissGoalIdea, useScheduleGoalIdea } from '@project/sdk'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { calendarConfig } from '../calendar.config'
import { formatMinutes, localInputToIso, scheduleTargetPayload } from '../calendar.dates'
import { GoalIdea, Horizon, ScheduleTarget } from '../calendar.types'
import { EstimatePicker, Section } from './CalendarPrimitives'

// The full When/Pick-date/Estimate control — not shown up front (see IdeaRow's one-click
// default), only inside an expanded idea's "choose a different time" option.
function SchedulingControls({ idea, onScheduled }: { idea: GoalIdea; onScheduled: () => void }) {
  const schedule = useScheduleGoalIdea()
  const [estimateMinutes, setEstimateMinutes] = useState<number | null>(
    idea.defaultEstimateMinutes ?? calendarConfig.scheduling.fallbackEstimateMinutes,
  )
  const [picking, setPicking] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  async function submit(when: Horizon | 'DATE') {
    try {
      await schedule.mutateAsync({
        templateId: idea.templateId,
        when,
        estimateMinutes: estimateMinutes ?? undefined,
        ...(when === 'DATE'
          ? {
              date: localInputToIso(date, time),
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
          {calendarConfig.scheduling.whenChoices.map((choice) => (
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

      <EstimatePicker value={estimateMinutes} onChange={setEstimateMinutes} />

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
    const target = scheduleTarget ?? { when: calendarConfig.scheduling.listIdeaHorizon }
    try {
      await schedule.mutateAsync({ templateId: idea.templateId, ...scheduleTargetPayload(target) })
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

// The Ideas section, shared by List view and the Calendar view's bottom panel — always visible
// (not gated on having ideas) so AddIdeaInline is always reachable. scheduleTarget makes the
// Calendar context's Schedule buttons day-aware (see ScheduleTarget's own comment).
export function IdeasSection({
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
