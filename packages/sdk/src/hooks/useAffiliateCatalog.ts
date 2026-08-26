import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

function throwIfError(result: { error?: unknown; response: { status: number }; data?: unknown }) {
  const err = result.error
  const status = result.response.status
  if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
  return result.data
}

export function useAffiliateClasses(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['affiliate-classes', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await getApiClient().GET('/affiliate-classes', { params: { query: { ...params, cursor: pageParam } } })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useAffiliateDeals(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['affiliate-deals', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await getApiClient().GET('/affiliate-deals', { params: { query: { ...params, cursor: pageParam } } })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useCreateAffiliateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; maxAffiliateRateBps: number; maxManagerShareBps: number }) => {
      const result = await getApiClient().POST('/affiliate-classes', { body })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliate-classes'] }),
  })
}

export function useUpdateAffiliateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { classId: string; name?: string; maxAffiliateRateBps?: number; maxManagerShareBps?: number; defaultDealId?: string | null }) => {
      const { classId, ...payload } = body
      const result = await getApiClient().PATCH('/affiliate-classes/{classId}', { params: { path: { classId } }, body: payload })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliate-classes'] }),
  })
}

export function useCreateAffiliateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      classId?: string
      commissionRuleType?: 'PERCENTAGE' | 'FIXED'
      affiliateRateBps?: number
      fixedAmountMinor?: number
      managerShareBps?: number
      eligibilityWindowDays?: number
      payoutThresholdMinor?: number
      payoutCadence?: 'MANUAL' | 'WEEKLY' | 'MONTHLY'
    }) => {
      const result = await getApiClient().POST('/affiliate-deals', { body })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliate-deals'] }),
  })
}

export function useUpdateAffiliateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      dealId: string
      name?: string
      classId?: string | null
      affiliateRateBps?: number
      managerShareBps?: number
      isActive?: boolean
    }) => {
      const { dealId, ...payload } = body
      const result = await getApiClient().PATCH('/affiliate-deals/{dealId}', { params: { path: { dealId } }, body: payload })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliate-deals'] }),
  })
}
