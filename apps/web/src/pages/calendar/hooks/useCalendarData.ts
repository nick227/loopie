import { useCalendarBoard, useCalendarGoalsInRange, useCurrentUser } from '@project/sdk'
import { calendarRange } from '../calendar.dates'
import { filterGoals } from '../calendar.selectors'
import type { CalendarNavigation } from './useCalendarNavigation'

export function useCalendarData(input: CalendarNavigation['queryInput']) {
  const me = useCurrentUser()
  const boardQuery = useCalendarBoard()
  const interval = calendarRange(input.anchor, input.mode)
  const rangeQuery = useCalendarGoalsInRange(
    interval.from.toISOString(),
    interval.to.toISOString(),
    {
      enabled: input.view === 'calendar',
    },
  )
  const board = boardQuery.data?.data
  const filter = (goals: Parameters<typeof filterGoals>[0]) =>
    filterGoals(goals, input.assigneeFilter, me.data?.data.id)
  return {
    board: {
      today: filter(board?.today ?? []),
      thisWeek: filter(board?.thisWeek ?? []),
      recentlyCompleted: filter(board?.recentlyCompleted ?? []),
      ideas: board?.ideas ?? [],
      isLoading: boardQuery.isLoading,
      isError: boardQuery.isError,
      retry: boardQuery.refetch,
    },
    range: {
      goals: filter(rangeQuery.data?.data ?? []),
      isLoading: rangeQuery.isLoading,
      isError: rangeQuery.isError,
      retry: rangeQuery.refetch,
    },
  }
}

export type CalendarData = ReturnType<typeof useCalendarData>
