import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { components } from '../generated/types'

export type HouseAd = components['schemas']['HouseAd']

export function useAdminHouseAds() {
  return useQuery({
    queryKey: ['adminHouseAds'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/admin/house-ads')
      if ((result as any).error)
        throw new ApiError(
          (result as any).response.status,
          (result as any).error.error || 'Failed to fetch',
        )
      return result.data!
    },
  })
}

export function useSearchAdvertisements(query: string) {
  return useQuery({
    queryKey: ['searchAdvertisements', query],
    queryFn: async () => {
      if (!query || query.length < 2) return { data: [] }
      const client = getApiClient()
      const result = await client.GET('/admin/house-ads/search-advertisements', {
        params: { query: { query } as any },
      })
      if ((result as any).error)
        throw new ApiError(
          (result as any).response.status,
          (result as any).error.error || 'Failed to fetch',
        )
      return result.data!
    },
    enabled: query.length >= 2,
  })
}

export function useCreateHouseAd() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<HouseAd>) => {
      const client = getApiClient()
      const result = await client.POST('/admin/house-ads', {
        body: data as any,
      })
      if ((result as any).error)
        throw new ApiError(
          (result as any).response.status,
          (result as any).error.error || 'Failed to create',
        )
      return result.data!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminHouseAds'] })
    },
  })
}

export function useUpdateHouseAd() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HouseAd> }) => {
      const client = getApiClient()
      const result = await client.PUT('/admin/house-ads/{id}', {
        params: { path: { id } },
        body: data as any,
      })
      if ((result as any).error)
        throw new ApiError(
          (result as any).response.status,
          (result as any).error.error || 'Failed to update',
        )
      return result.data!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminHouseAds'] })
    },
  })
}

export function useDeleteHouseAd() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/admin/house-ads/{id}', {
        params: { path: { id } },
      })
      if ((result as any).error)
        throw new ApiError(
          (result as any).response.status,
          (result as any).error.error || 'Failed to delete',
        )
      return true
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminHouseAds'] })
    },
  })
}

export function useServeHouseAd(zone: string) {
  return useQuery({
    queryKey: ['serveHouseAd', zone],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/house-ads/serve', {
        params: { query: { zone } as any },
      })
      if ((result as any).error)
        throw new ApiError(
          (result as any).response.status,
          (result as any).error.error || 'Failed to serve',
        )
      return result.data!
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useTrackHouseAdMetric() {
  return useMutation({
    mutationFn: async ({
      id,
      zone,
      type,
    }: {
      id: string
      zone: string
      type: 'view' | 'click'
    }) => {
      const client = getApiClient()
      const result = await client.POST('/house-ads/{id}/track', {
        params: { path: { id } },
        body: { zone, type } as any,
      })
      if ((result as any).error)
        throw new ApiError(
          (result as any).response.status,
          (result as any).error.error || 'Failed to track',
        )
      return true
    },
  })
}
