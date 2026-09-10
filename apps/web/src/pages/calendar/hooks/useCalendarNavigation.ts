import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { calendarConfig } from '../calendar.config'
import { parseCalendarRouteDate, parseLocalDate, toDateInput } from '../calendar.dates'
import type { CalendarMode, View } from '../calendar.types'

// URL state is authoritative, including browser back/forward and links to this mounted page.
export function useCalendarNavigation() {
  const [params, setParams] = useSearchParams()
  const [initialToday] = useState(() => new Date())
  const requestedDate = parseCalendarRouteDate(params.get('date'))
  const anchor = requestedDate ?? initialToday
  const view: View =
    params.get('view') === 'calendar' || params.get('view') === 'list'
      ? (params.get('view') as View)
      : requestedDate
        ? 'calendar'
        : calendarConfig.defaults.view
  const mode: CalendarMode =
    params.get('mode') === 'year' || params.get('mode') === 'month'
      ? (params.get('mode') as CalendarMode)
      : calendarConfig.defaults.mode
  const selectedDay = params.has('selected')
    ? parseLocalDate(params.get('selected'))
    : requestedDate
  const assigneeFilter = params.get('assignee') || calendarConfig.defaults.assigneeFilter
  const focusedGoalId = params.get('goal')

  function update(values: Record<string, string | null>) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(values)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }
  function step(n: number) {
    const next =
      mode === 'month'
        ? new Date(anchor.getFullYear(), anchor.getMonth() + n, 1)
        : new Date(anchor.getFullYear() + n, anchor.getMonth(), 1)
    update({ date: toDateInput(next), selected: 'none', goal: null })
  }
  return {
    view,
    changeView: (value: View) => update({ view: value }),
    assignee: { value: assigneeFilter, onChange: (value: string) => update({ assignee: value }) },
    focusedGoalId,
    queryInput: { view, mode, anchor, assigneeFilter },
    grid: {
      anchor,
      mode,
      selectedDay,
      focusedGoalId,
      label:
        mode === 'month'
          ? anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
          : String(anchor.getFullYear()),
      previous: () => step(-1),
      next: () => step(1),
      today: () => update({ date: toDateInput(new Date()), selected: 'none', goal: null }),
      changeMode: (value: CalendarMode) => update({ mode: value, selected: 'none' }),
      selectDay: (day: Date | null) => update({ selected: day ? toDateInput(day) : 'none' }),
      selectMonth: (month: number) =>
        update({
          mode: 'month',
          date: toDateInput(new Date(anchor.getFullYear(), month, 1)),
          selected: 'none',
          goal: null,
        }),
    },
  }
}

export type CalendarNavigation = ReturnType<typeof useCalendarNavigation>
