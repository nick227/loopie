import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

// The one Calendar board read — Today, This Week, and the Ideas pool in a single call, matching
// the minimal-UI spec's single screen. utcOffsetMinutes follows the same convention as
// useDashboardHome — pass the viewer's local offset so "today"/"this week" bucket correctly.
export function useCalendarBoard(utcOffsetMinutes = -new Date().getTimezoneOffset()) {
  return useQuery({
    queryKey: ['calendar', 'board', utcOffsetMinutes],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/calendar/board', {
        params: { query: { utcOffsetMinutes } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
  })
}

// Invalidates both the board (List view) and any goalsInRange reads (Week/Month view) — a
// mutation from either surface needs to refresh both, since they're two projections of the same
// ScheduledGoal rows.
function invalidateBoard(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['calendar'] })
}

// The Calendar (Week/Month) views' own read — an arbitrary, navigable date range, unlike
// useCalendarBoard's fixed "relative to now" buckets. `from`/`to` are ISO instants.
export function useCalendarGoalsInRange(from: string, to: string) {
  return useQuery({
    queryKey: ['calendar', 'goalsInRange', from, to],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/calendar/goals', { params: { query: { from, to } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
  })
}

export function useCreateGoalIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (title: string) => {
      const client = getApiClient()
      const result = await client.POST('/calendar/ideas', { body: { title } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => invalidateBoard(queryClient),
  })
}

export function useScheduleGoalIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      templateId,
      ...body
    }: {
      templateId: string
      when?: 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK' | 'DATE'
      date?: string
      hasTime?: boolean
      estimateMinutes?: number | null
      utcOffsetMinutes?: number
    }) => {
      const client = getApiClient()
      const result = await client.POST('/calendar/ideas/{templateId}/schedule', {
        params: { path: { templateId } },
        body: { utcOffsetMinutes: -new Date().getTimezoneOffset(), ...body },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => invalidateBoard(queryClient),
  })
}

export function useDismissGoalIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: string) => {
      const client = getApiClient()
      const result = await client.POST('/calendar/ideas/{templateId}/dismiss', {
        params: { path: { templateId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => invalidateBoard(queryClient),
  })
}

export function useUpdateScheduledGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      goalId,
      ...body
    }: {
      goalId: string
      status?: 'SCHEDULED' | 'DONE'
      scheduledFor?: string | null
      hasTime?: boolean
      estimateMinutes?: number | null
    }) => {
      const client = getApiClient()
      const result = await client.PATCH('/calendar/goals/{goalId}', {
        params: { path: { goalId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => invalidateBoard(queryClient),
  })
}
