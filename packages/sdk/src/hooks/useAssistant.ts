import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

export const nextActionQueryKey = ['assistant', 'next-action']

export function useNextAction() {
  return useQuery({
    queryKey: nextActionQueryKey,
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/assistant/next-action')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
  })
}

// Assistant goal-cycle mutations (Learn -> Act -> Review -> Grow) — every one invalidates
// nextActionQueryKey rather than trusting its own response body, same as every existing Assistant
// flow step already does (see AssistantPanel.tsx's handleSuccess).
function invalidateNextAction(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: nextActionQueryKey })
}

export function useAnswerAssistantLearnQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { questionKey: string; value: string }) => {
      const client = getApiClient()
      const result = await client.POST('/assistant/goal-cycle/answer', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
    onSuccess: () => invalidateNextAction(queryClient),
  })
}

export function useScheduleAssistantPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { cycleId: string }) => {
      const client = getApiClient()
      const result = await client.POST('/assistant/goal-cycle/schedule-plan', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
    onSuccess: () => invalidateNextAction(queryClient),
  })
}

export function useReviewAssistantGoalCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      cycleId: string
      manualOutcome?:
        'WORKING' | 'PARTIALLY_WORKING' | 'NOT_WORKING' | 'NOT_ENOUGH_DATA' | 'NOT_EXECUTED'
    }) => {
      const client = getApiClient()
      const result = await client.POST('/assistant/goal-cycle/review', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
    onSuccess: () => invalidateNextAction(queryClient),
  })
}

export function useGrowAssistantGoalCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      cycleId: string
      direction: 'DO_MORE' | 'IMPROVE' | 'NEW_CHANNEL' | 'INCREASE_GOAL' | 'NEW_GOAL'
    }) => {
      const client = getApiClient()
      const result = await client.POST('/assistant/goal-cycle/grow', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
    onSuccess: () => invalidateNextAction(queryClient),
  })
}

export function useDismissAssistantSignal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { cycleId: string; signalKey: string }) => {
      const client = getApiClient()
      const result = await client.POST('/assistant/goal-cycle/dismiss-signal', { body })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
      return result.data!.data
    },
    onSuccess: () => invalidateNextAction(queryClient),
  })
}
