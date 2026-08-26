import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

function throwIfError(result: { error?: unknown; response: { status: number }; data?: unknown }) {
  const err = result.error
  const status = result.response.status
  const data = result.data
  if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
  return data
}

function invalidateAffiliate(queryClient: ReturnType<typeof useQueryClient>, affiliateId: string) {
  queryClient.invalidateQueries({ queryKey: ['affiliates'] })
  queryClient.invalidateQueries({ queryKey: ['affiliate', affiliateId] })
  queryClient.invalidateQueries({ queryKey: ['affiliate', 'me'] })
}

export function useCreateAffiliateConnectOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (affiliateId: string) => {
      const result = await getApiClient().POST('/affiliates/{affiliateId}/connect/onboarding', {
        params: { path: { affiliateId } },
      })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: (_data, affiliateId) => invalidateAffiliate(queryClient, affiliateId),
  })
}

export function useSyncAffiliateConnect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (affiliateId: string) => {
      const result = await getApiClient().POST('/affiliates/{affiliateId}/connect/sync', {
        params: { path: { affiliateId } },
      })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: (_data, affiliateId) => invalidateAffiliate(queryClient, affiliateId),
  })
}
