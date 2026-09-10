import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { toDateInput } from '../calendar.dates'
import { useCalendarNavigation } from './useCalendarNavigation'

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/calendar?date=2026-09-10&goal=one&unrelated=keep']}>
      {children}
    </MemoryRouter>
  )
}

describe('calendar navigation', () => {
  it('reacts to URL changes and browser history without remounting', () => {
    const { result } = renderHook(
      () => ({
        calendar: useCalendarNavigation(),
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper },
    )
    expect(result.current.calendar.view).toBe('calendar')
    expect(toDateInput(result.current.calendar.grid.selectedDay!)).toBe('2026-09-10')
    act(() => result.current.navigate('/calendar?date=2027-01-15&goal=two&assignee=me'))
    expect(toDateInput(result.current.calendar.grid.anchor)).toBe('2027-01-15')
    expect(result.current.calendar.focusedGoalId).toBe('two')
    expect(result.current.calendar.assignee.value).toBe('me')
    act(() => result.current.navigate(-1))
    expect(result.current.calendar.focusedGoalId).toBe('one')
    expect(toDateInput(result.current.calendar.grid.anchor)).toBe('2026-09-10')
  })

  it('opens ISO assignment links on the correct local day', () => {
    const { result } = renderHook(
      () => ({ calendar: useCalendarNavigation(), navigate: useNavigate() }),
      { wrapper },
    )
    const instant = new Date(2026, 8, 10, 9, 30)
    act(() =>
      result.current.navigate(
        `/calendar?date=${encodeURIComponent(instant.toISOString())}&goal=assigned`,
      ),
    )
    expect(result.current.calendar.view).toBe('calendar')
    expect(toDateInput(result.current.calendar.grid.selectedDay!)).toBe('2026-09-10')
    expect(result.current.calendar.focusedGoalId).toBe('assigned')
  })

  it('clears day selection on period/mode changes and preserves unrelated params', () => {
    const { result } = renderHook(
      () => ({ calendar: useCalendarNavigation(), location: useLocation() }),
      { wrapper },
    )
    act(() => result.current.calendar.grid.next())
    expect(toDateInput(result.current.calendar.grid.anchor)).toBe('2026-10-01')
    expect(result.current.calendar.grid.selectedDay).toBeNull()
    expect(result.current.location.search).toContain('unrelated=keep')
    act(() => result.current.calendar.grid.changeMode('year'))
    act(() => result.current.calendar.grid.selectMonth(1))
    expect(result.current.calendar.grid.mode).toBe('month')
    expect(toDateInput(result.current.calendar.grid.anchor)).toBe('2026-02-01')
  })
})
