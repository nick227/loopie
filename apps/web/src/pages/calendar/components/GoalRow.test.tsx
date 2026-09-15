import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  useBusinessTeam,
  useUpdateScheduledGoal,
  useCurrentTimeEntry,
  useCurrentUser,
  useStartTimeEntry,
  useStopCurrentTimeEntry,
  useCalendarLinkCandidates,
} from '@project/sdk'
import { GoalRow } from './GoalRow'
import type { ScheduledGoal } from '../calendar.types'

// Regression coverage for a real bug found during 2026-09-14/15 studio-operations flow
// validation (a throwaway Playwright run against the live dev server, discarded after): the
// "Assigned to" select in the Assign & Estimate rail had no real accessible label — just a
// sibling <p>, no htmlFor/aria-labelledby — so Playwright's getByLabel (which mirrors real
// assistive-tech behavior) resolved to nothing at all. A screen-reader user would have hit the
// identical wall. Found because the automated flow couldn't select an assignee, not by reading
// the code.
//
// The task popover (2026-09-15 connective-tissue pass) also renders an inline Start/Stop Work
// button and the rail's own link picker, both real query hooks — mocked here rather than wrapped
// in a QueryClientProvider, matching this file's existing narrow-mock style: the test is about one
// accessible-label regression, not a full data-fetching integration.
vi.mock('@project/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@project/sdk')>()),
  useBusinessTeam: vi.fn(),
  useUpdateScheduledGoal: vi.fn(),
  useCurrentTimeEntry: vi.fn(),
  useCurrentUser: vi.fn(),
  useStartTimeEntry: vi.fn(),
  useStopCurrentTimeEntry: vi.fn(),
  useCalendarLinkCandidates: vi.fn(),
}))

const GOAL: ScheduledGoal = {
  id: 'goal-1',
  title: 'Test task',
  status: 'SCHEDULED',
  scheduledFor: new Date().toISOString(),
  hasTime: false,
  estimateMinutes: null,
  assignedToUserId: null,
  trackingType: 'MANUAL',
  currentValue: null,
  targetValue: null,
} as unknown as ScheduledGoal

describe('GoalRow: Assign & Estimate rail', () => {
  it('associates a real accessible label with the "Assigned to" select', () => {
    vi.mocked(useBusinessTeam).mockReturnValue({
      data: {
        data: {
          members: [
            { userId: 'u-1', email: 'shop@loopie.app', suspendedAt: null },
            { userId: 'u-2', email: 'marketer@loopie.app', suspendedAt: null },
          ],
        },
      },
    } as unknown as ReturnType<typeof useBusinessTeam>)
    vi.mocked(useUpdateScheduledGoal).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateScheduledGoal>)
    vi.mocked(useCurrentTimeEntry).mockReturnValue({
      data: { data: null },
    } as unknown as ReturnType<typeof useCurrentTimeEntry>)
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { data: { id: 'u-1', businessId: 'biz-1' } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useStartTimeEntry).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useStartTimeEntry>)
    vi.mocked(useStopCurrentTimeEntry).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useStopCurrentTimeEntry>)
    vi.mocked(useCalendarLinkCandidates).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useCalendarLinkCandidates>)

    render(
      <MemoryRouter>
        <GoalRow goal={GOAL} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Test task'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit task →' }))

    const select = screen.getByLabelText('Assigned to')
    expect(select).toBeVisible()
    expect(select.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'shop@loopie.app' })).toBeInTheDocument()
  })
})
