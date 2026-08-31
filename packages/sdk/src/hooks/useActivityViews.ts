import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

export function useActivitySavedViews() {
  return useQuery({
    queryKey: ['activity', 'views'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/activity/views')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
  })
}

export function useCreateActivitySavedView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; filters: Record<string, any> }) => {
      const client = getApiClient()
      const result = await client.POST('/activity/views', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', 'views'] })
    },
  })
}

export function useUpdateActivitySavedView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ viewId, name }: { viewId: string; name: string }) => {
      const client = getApiClient()
      const result = await client.PATCH('/activity/views/{viewId}', {
        params: { path: { viewId } },
        body: { name },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', 'views'] })
    },
  })
}

export function useDeleteActivitySavedView() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (viewId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/activity/views/{viewId}', {
        params: { path: { viewId } },
      })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', 'views'] })
    },
  })
}
