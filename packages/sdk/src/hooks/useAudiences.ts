import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateAudienceInput = {
  name: string
  type: 'SAVED_FILTER' | 'MANUAL_LIST' | 'IMPORTED_LIST'
  filter?: Record<string, unknown>
  contactIds?: string[]
}

type UpdateAudienceInput = {
  audienceId: string
  name?: string
  filter?: Record<string, unknown>
}

export function useAudiences(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['audiences', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/audiences', { params: { query: { ...params, cursor: pageParam } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useAudience(audienceId: string) {
  return useQuery({
    queryKey: ['audience', audienceId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/audiences/{audienceId}', { params: { path: { audienceId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!audienceId,
  })
}

export function useAudienceContacts(audienceId: string) {
  return useQuery({
    queryKey: ['audience', audienceId, 'contacts'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/audiences/{audienceId}/contacts', { params: { path: { audienceId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!audienceId,
  })
}

export function useCreateAudience() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateAudienceInput) => {
      const client = getApiClient()
      const result = await client.POST('/audiences', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audiences', 'list'] }),
  })
}

export function useUpdateAudience() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ audienceId, ...body }: UpdateAudienceInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/audiences/{audienceId}', { params: { path: { audienceId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audiences', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['audience', variables.audienceId] })
    },
  })
}

export function useDeleteAudience() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (audienceId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/audiences/{audienceId}', { params: { path: { audienceId } } })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audiences', 'list'] }),
  })
}
