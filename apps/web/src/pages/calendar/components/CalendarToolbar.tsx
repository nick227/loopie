import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { calendarConfig } from '../calendar.config'
import { View } from '../calendar.types'
import type { CalendarNavigation } from '../hooks/useCalendarNavigation'
import { useQuickAddTask } from '../hooks/useQuickAddTask'
import { StartStopWorkControl } from '../tracking/TimeTracker'

// The top persistent input — a Task, not an Idea: typing here commits straight to Today, the same
// create-then-schedule composition as QuickAddToDay, using the idea's own defaults (an estimate
// isn't forced, matching what scheduling a plain idea does). Because it schedules immediately,
// the old "Add an idea" behavior (create with no schedule) moved to its own button — see
// AddIdeaInline — living next to the persistent Ideas section instead of the page header.
function QuickAddTask() {
  const { title, setTitle, pending, submit } = useQuickAddTask(
    { when: calendarConfig.scheduling.quickAddHorizon },
    'Added to today',
  )

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Input
        disabled={pending}
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

export function CalendarToolbar({
  navigation,
}: {
  navigation: Pick<CalendarNavigation, 'view' | 'changeView'>
}) {
  return (
    <PageHeader
      variant="list"
      title="Calendar"
      description="Plan the work that moves your business forward."
      className="min-w-0"
      primaryAction={<ViewSwitch view={navigation.view} onChange={navigation.changeView} />}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        <QuickAddTask />
        <StartStopWorkControl />
      </div>
    </PageHeader>
  )
}
