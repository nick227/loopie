import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { components } from '../generated/types'

export type ScheduleSyncTarget = components['schemas']['ScheduleSyncTarget']

function invalidate(queryClient: ReturnType<typeof useQueryClient>, integrationId: string) {
  void queryClient.invalidateQueries({ queryKey: ['schedule-sync', integrationId] })
}

export function useScheduleSyncTarget(integrationId: string | null) {
  return useQuery({
    queryKey: ['schedule-sync', integrationId],
    enabled: Boolean(integrationId),
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/integrations/{integrationId}/schedule-sync', {
        params: { path: { integrationId: integrationId! } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function useCreateScheduleSyncTarget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      integrationId: string
      spreadsheetId: string
      sheetTab: string
    }) => {
      const { integrationId, ...body } = input
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/schedule-sync', {
        params: { path: { integrationId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: (_data, input) => invalidate(queryClient, input.integrationId),
  })
}

export function useDeleteScheduleSyncTarget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/integrations/{integrationId}/schedule-sync', {
        params: { path: { integrationId } },
      })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
    },
    onSuccess: (_data, integrationId) => invalidate(queryClient, integrationId),
  })
}

export function useSyncScheduleNow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/schedule-sync/sync', {
        params: { path: { integrationId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: (_data, integrationId) => invalidate(queryClient, integrationId),
  })
}
