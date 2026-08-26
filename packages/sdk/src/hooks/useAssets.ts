import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type AssetType = 'IMAGE' | 'TEXT' | 'VIDEO' | 'AUDIO'

type CreateAssetInput = {
  type: AssetType
  name: string
  url?: string
  textContent?: string
  mimeType?: string
  sizeBytes?: number
  widthPx?: number
  heightPx?: number
  durationMs?: number
  file?: { filename: string; mimeType: string; data: string }
}

type UpdateAssetInput = Omit<CreateAssetInput, 'type'>

export function useAssets(params?: { type?: AssetType; limit?: number; q?: string }) {
  return useInfiniteQuery({
    queryKey: ['assets', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/assets', {
        params: { query: { ...params, cursor: pageParam } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useAsset(assetId: string) {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/assets/{assetId}', { params: { path: { assetId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    enabled: !!assetId,
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateAssetInput) => {
      const client = getApiClient()
      const result = await client.POST('/assets', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', 'list'] }),
  })
}

export function useUpdateAsset(assetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateAssetInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/assets/{assetId}', {
        params: { path: { assetId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assetId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/assets/{assetId}', { params: { path: { assetId } } })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as { error: string }).error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', 'list'] }),
  })
}
