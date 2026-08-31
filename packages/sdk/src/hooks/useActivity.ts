import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

export function useActivityStream(params?: {
  source?: string
  type?: string
  personId?: string
  adId?: string
  pageId?: string
  status?: string
  needsAction?: boolean
  since?: string
  until?: string
  limit?: number
}) {
  return useInfiniteQuery({
    queryKey: ['activity', 'stream', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/activity', {
        params: { query: { ...params, cursor: pageParam } as any },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  })
}

export function useActivityCheckpoint() {
  return useQuery({
    queryKey: ['activity', 'checkpoint'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/activity/checkpoint')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    // Poll every 30 seconds by default for the checkpoint
    refetchInterval: 30000,
  })
}

export function useActivityItem(activityId: string) {
  return useQuery({
    queryKey: ['activity', activityId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/activity/{activityId}', {
        params: { path: { activityId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!activityId,
  })
}

type UpdateAttentionInput = {
  attentionId: string
  state?: 'NEEDS_ACTION' | 'IN_PROGRESS' | 'SNOOZED' | 'RESOLVED'
  assigneeId?: string | null
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  snoozedUntil?: string | null
}

export function useUpdateAttentionItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ attentionId, ...body }: UpdateAttentionInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/activity/attention/{attentionId}', {
        params: { path: { attentionId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', 'stream'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}
