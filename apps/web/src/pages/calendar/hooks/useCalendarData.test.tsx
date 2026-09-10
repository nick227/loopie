import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CalendarGridView } from '../views/CalendarGridView'
import { useCalendarData } from './useCalendarData'

const { rangeQuery, retry } = vi.hoisted(() => ({ rangeQuery: vi.fn(), retry: vi.fn() }))
vi.mock('@project/sdk', () => ({
  useCurrentUser: () => ({ data: { data: { id: 'me' } } }),
  useCalendarBoard: () => ({
    data: { data: { today: [], thisWeek: [], recentlyCompleted: [], ideas: [] } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCalendarGoalsInRange: rangeQuery,
}))
vi.mock('../components/IdeasSection', () => ({
  IdeasSection: () => <div>Ideas remain available</div>,
}))

const input = {
  view: 'calendar' as const,
  mode: 'month' as const,
  anchor: new Date(2026, 8, 1),
  assigneeFilter: 'everyone',
}
const navigation = {
  ...input,
  selectedDay: null,
  focusedGoalId: null,
  label: 'September 2026',
  previous: vi.fn(),
  next: vi.fn(),
  today: vi.fn(),
  changeMode: vi.fn(),
  selectDay: vi.fn(),
  selectMonth: vi.fn(),
}

describe('calendar query orchestration', () => {
  it('disables the range query in List view', () => {
    rangeQuery.mockReturnValue({ isLoading: false, isError: false, refetch: retry })
    renderHook(() => useCalendarData({ ...input, view: 'list' }))
    expect(rangeQuery).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), {
      enabled: false,
    })
  })

  it('shows range errors and retry while keeping board content available', () => {
    rangeQuery.mockReturnValue({ isLoading: false, isError: true, refetch: retry })
    const { result } = renderHook(() => useCalendarData(input))
    render(<CalendarGridView navigation={navigation} data={result.current} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load calendar tasks')
    expect(screen.getByText('Ideas remain available')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()
  })

  it('shows a loading state for a pending range rather than an empty month', () => {
    rangeQuery.mockReturnValue({ isLoading: true, isError: false, refetch: retry })
    const { result } = renderHook(() => useCalendarData(input))
    render(<CalendarGridView navigation={navigation} data={result.current} />)
    expect(screen.getByLabelText('Loading calendar')).toBeVisible()
    expect(screen.getByText('Ideas remain available')).toBeVisible()
  })
})
