import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useBusinessTeam, useUpdateScheduledGoal } from '@project/sdk'
import { useState } from 'react'
import { toast } from 'sonner'
import { localInputToIso, scheduleInputs } from '../calendar.dates'
import { ScheduledGoal, GoalRecurrenceRule, LinkableSubjectType } from '../calendar.types'
import { EstimatePicker } from './CalendarPrimitives'
import { LinkPicker, LinkValue } from './LinkPicker'

const RECURRENCE_OPTIONS: { value: GoalRecurrenceRule | ''; label: string }[] = [
  { value: '', label: "Doesn't repeat" },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKDAYS', label: 'Weekdays' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
]

function initialLink(goal: ScheduledGoal): LinkValue | null {
  const linkable: LinkableSubjectType[] = ['PAGE', 'ADVERTISEMENT', 'MESSAGE', 'CRM']
  if (!goal.subjectId || !linkable.includes(goal.subjectType as LinkableSubjectType)) return null
  return {
    subjectType: goal.subjectType as LinkableSubjectType,
    subjectId: goal.subjectId,
    label: goal.actionLabel ?? 'Linked record',
  }
}

// The full editor — everything that doesn't fit the task popover's "common actions" lives here:
// rename, reschedule, reassign, estimate, recurrence, notes, and the linked-object picker. One
// Save, one mutation; Dismiss/Complete/Start-Work stay in the popover, not duplicated here.
export function EditTaskRail({ goal, onDone }: { goal: ScheduledGoal; onDone: () => void }) {
  const team = useBusinessTeam()
  const members = (team.data?.data.members ?? []).filter((m) => !m.suspendedAt)
  const updateGoal = useUpdateScheduledGoal()

  const [title, setTitle] = useState(goal.title)
  const [date, setDate] = useState(() => scheduleInputs(goal.scheduledFor, goal.hasTime).date)
  const [time, setTime] = useState(() => scheduleInputs(goal.scheduledFor, goal.hasTime).time)
  const [assignedToUserId, setAssignedToUserId] = useState(goal.assignedToUserId ?? '')
  const [estimateMinutes, setEstimateMinutes] = useState<number | null>(
    goal.estimateMinutes ?? null,
  )
  const [recurrenceRule, setRecurrenceRule] = useState<GoalRecurrenceRule | ''>(
    (goal.recurrenceRule as GoalRecurrenceRule | null) ?? '',
  )
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    goal.recurrenceEndDate ? goal.recurrenceEndDate.slice(0, 10) : '',
  )
  const [notes, setNotes] = useState(goal.notes ?? '')
  const [initialLinkValue] = useState<LinkValue | null>(() => initialLink(goal))
  const [link, setLink] = useState<LinkValue | null>(initialLinkValue)

  async function submit() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !date) return
    // Only re-resolve the link when it actually changed — otherwise an unrelated edit (renaming,
    // rescheduling) on a task whose already-set link has since been deleted would needlessly 404
    // on save instead of just letting its "Open" action go stale, same as any other dead deep link.
    const linkChanged =
      link?.subjectType !== initialLinkValue?.subjectType ||
      link?.subjectId !== initialLinkValue?.subjectId
    try {
      await updateGoal.mutateAsync({
        goalId: goal.id,
        title: trimmedTitle,
        scheduledFor: localInputToIso(date, time),
        hasTime: !!time,
        assignedToUserId: assignedToUserId || null,
        estimateMinutes,
        notes: notes.trim() || null,
        recurrenceRule: recurrenceRule || null,
        recurrenceEndDate:
          recurrenceRule && recurrenceEndDate ? `${recurrenceEndDate}T23:59:59.999Z` : null,
        ...(linkChanged
          ? { subjectType: link?.subjectType ?? null, subjectId: link?.subjectId ?? null }
          : {}),
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
        <h2 className="text-sm font-semibold text-foreground">Edit task</h2>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <div className="mt-5 space-y-4 overflow-y-auto">
        <div>
          <label
            htmlFor="edit-task-title"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Title
          </label>
          <input
            id="edit-task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            className="h-8 w-full rounded border border-input-border bg-transparent px-2 text-sm"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Date &amp; time</p>
          <div className="flex items-center gap-2">
            <input
              aria-label="Date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-8 flex-1 rounded border border-input-border bg-transparent px-2 text-xs"
            />
            <input
              aria-label="Time (optional)"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="h-8 rounded border border-input-border bg-transparent px-2 text-xs"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="edit-task-assignee"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Assigned to
          </label>
          <select
            id="edit-task-assignee"
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

        <div>
          <label
            htmlFor="edit-task-repeats"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Repeats
          </label>
          <select
            id="edit-task-repeats"
            value={recurrenceRule}
            onChange={(event) => setRecurrenceRule(event.target.value as GoalRecurrenceRule | '')}
            className="h-8 w-full rounded border border-input-border bg-transparent px-2 text-xs"
          >
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {recurrenceRule ? (
            <div className="mt-2">
              <label
                htmlFor="edit-task-repeats-end"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Ends on (optional)
              </label>
              <input
                id="edit-task-repeats-end"
                type="date"
                value={recurrenceEndDate}
                onChange={(event) => setRecurrenceEndDate(event.target.value)}
                className="h-8 w-full rounded border border-input-border bg-transparent px-2 text-xs"
              />
            </div>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="edit-task-notes"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Notes
          </label>
          <Textarea
            id="edit-task-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Working notes for this task"
            className="text-sm"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Linked to</p>
          <LinkPicker value={link} onChange={setLink} />
        </div>
      </div>

      <div className="mt-4 pt-4">
        <Button
          className="w-full"
          loading={updateGoal.isPending}
          disabled={!title.trim() || !date}
          onClick={submit}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
