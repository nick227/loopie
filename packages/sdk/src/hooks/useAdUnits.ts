import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateAdUnitInput = {
  campaignId: string
  creativeId: string
  format: 'DISPLAY_BANNER' | 'NATIVE' | 'EMBED'
  destinationLandingPageId?: string
  destinationUrl?: string
  servingConfig?: Record<string, unknown>
}

type UpdateAdUnitInput = {
  adUnitId: string
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED'
  destinationLandingPageId?: string | null
  destinationUrl?: string | null
  servingConfig?: Record<string, unknown>
}

export function useAdUnits(params?: { campaignId?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['adUnits', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/ad-units', { params: { query: { ...params, cursor: pageParam } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useAdUnit(adUnitId: string) {
  return useQuery({
    queryKey: ['adUnit', adUnitId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/ad-units/{adUnitId}', { params: { path: { adUnitId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!adUnitId,
  })
}

export function useCreateAdUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateAdUnitInput) => {
      const client = getApiClient()
      const result = await client.POST('/ad-units', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adUnits', 'list'] }),
  })
}

export function useUpdateAdUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ adUnitId, ...body }: UpdateAdUnitInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/ad-units/{adUnitId}', { params: { path: { adUnitId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adUnits', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['adUnit', variables.adUnitId] })
    },
  })
}
