import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { calendarConfig } from '../calendar.config'
import { CalendarMode } from '../calendar.types'
import { QueryFeedback, Section } from '../components/CalendarPrimitives'
import { GroupedGoalList } from '../components/GoalRow'
import { IdeasSection } from '../components/IdeasSection'
import type { CalendarData } from '../hooks/useCalendarData'
import type { CalendarNavigation } from '../hooks/useCalendarNavigation'
import { MonthView } from './MonthView'
import { YearView } from './YearView'

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

export function CalendarGridView({
  navigation,
  data,
}: {
  navigation: CalendarNavigation['grid']
  data: CalendarData
}) {
  const { board, range } = data
  const focusedGoalId = navigation.focusedGoalId
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CalendarNav
            label={navigation.label}
            onPrev={navigation.previous}
            onNext={navigation.next}
            onToday={navigation.today}
          />
          <CalendarModeSwitch mode={navigation.mode} onChange={navigation.changeMode} />
        </div>
        {range.isLoading || range.isError ? (
          <QueryFeedback query={range} />
        ) : navigation.mode === 'month' ? (
          <MonthView
            anchor={navigation.anchor}
            goals={range.goals}
            selectedDay={navigation.selectedDay}
            onSelectDay={navigation.selectDay}
            focusedGoalId={focusedGoalId}
          />
        ) : (
          <YearView
            anchor={navigation.anchor}
            goals={range.goals}
            onSelectMonth={navigation.selectMonth}
          />
        )}
      </div>
      {board.isLoading || board.isError ? (
        <QueryFeedback query={board} />
      ) : (
        <>
          {board.today.length > 0 || board.thisWeek.length > 0 ? (
            <Section label="Upcoming" bare>
              <GroupedGoalList
                goals={[...board.today, ...board.thisWeek]}
                dateField="scheduledFor"
                direction="future"
                focusedGoalId={focusedGoalId}
              />
            </Section>
          ) : null}
          {board.recentlyCompleted.length > 0 ? (
            <Section label="Recently completed" bare>
              <GroupedGoalList
                goals={board.recentlyCompleted}
                dateField="completedAt"
                direction="past"
                focusedGoalId={focusedGoalId}
              />
            </Section>
          ) : null}
          <IdeasSection
            ideas={board.ideas}
            scheduleTarget={
              navigation.selectedDay
                ? { when: 'DATE', date: navigation.selectedDay }
                : { when: calendarConfig.scheduling.calendarIdeaFallbackHorizon }
            }
          />
        </>
      )}
    </div>
  )
}
