import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateCreativeInput = {
  name: string
  assetIds: string[]
}

type UpdateCreativeInput = {
  creativeId: string
  name?: string
  assetIds: string[]
}

export function useCreatives(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['creatives', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/creatives', { params: { query: { ...params, cursor: pageParam } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useCreative(creativeId: string) {
  return useQuery({
    queryKey: ['creative', creativeId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/creatives/{creativeId}', { params: { path: { creativeId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!creativeId,
  })
}

export function useCreateCreative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateCreativeInput) => {
      const client = getApiClient()
      const result = await client.POST('/creatives', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creatives', 'list'] }),
  })
}

// Creative updates create a new immutable version server-side — see schema.prisma. The
// returned Creative has a new id, so this invalidates the list (which shows latest versions)
// rather than the old single-creative cache entry.
export function useUpdateCreative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ creativeId, ...body }: UpdateCreativeInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/creatives/{creativeId}', { params: { path: { creativeId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creatives', 'list'] }),
  })
}

export function useDeleteCreative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (creativeId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/creatives/{creativeId}', { params: { path: { creativeId } } })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creatives', 'list'] }),
  })
}
