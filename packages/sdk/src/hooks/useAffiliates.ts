import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

function throwIfError(result: { error?: unknown; response: { status: number }; data?: unknown }) {
  const err = result.error
  const status = result.response.status
  const data = result.data
  if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
  return data
}

type CreateAffiliateInput = {
  name: string
  classId: string
  email?: string
  referralCode?: string
  dealId?: string
  managerId?: string
  createLogin?: boolean
  destinationLandingPageId?: string
  destinationUrl?: string
}

type UpdateAffiliateInput = {
  affiliateId: string
  name?: string
  email?: string | null
  classId?: string
  dealId?: string | null
  managerId?: string | null
  affiliateRateOverrideBps?: number | null
  managerShareOverrideBps?: number | null
  destinationLandingPageId?: string | null
  destinationUrl?: string | null
}

export function useAffiliates(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['affiliates', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await getApiClient().GET('/affiliates', { params: { query: { ...params, cursor: pageParam } } })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useAffiliate(affiliateId: string) {
  return useQuery({
    queryKey: ['affiliate', affiliateId],
    queryFn: async () => {
      const result = await getApiClient().GET('/affiliates/{affiliateId}', { params: { path: { affiliateId } } })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    enabled: !!affiliateId,
  })
}

export function useMyAffiliate() {
  return useQuery({
    queryKey: ['affiliate', 'me'],
    queryFn: async () => {
      const result = await getApiClient().GET('/affiliates/me')
      return throwIfError(result) as NonNullable<typeof result.data>
    },
  })
}

export function useAffiliateEarnings(affiliateId: string) {
  return useQuery({
    queryKey: ['affiliate', affiliateId, 'earnings'],
    queryFn: async () => {
      const result = await getApiClient().GET('/affiliates/{affiliateId}/earnings', { params: { path: { affiliateId } } })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    enabled: !!affiliateId,
  })
}

export function useCreateAffiliate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateAffiliateInput) => {
      const result = await getApiClient().POST('/affiliates', { body })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliates'] }),
  })
}

export function useUpdateAffiliate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ affiliateId, ...body }: UpdateAffiliateInput) => {
      const result = await getApiClient().PATCH('/affiliates/{affiliateId}', { params: { path: { affiliateId } }, body })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['affiliate', variables.affiliateId] })
    },
  })
}

export function usePauseAffiliate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (affiliateId: string) => {
      const result = await getApiClient().POST('/affiliates/{affiliateId}/pause', { params: { path: { affiliateId } } })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: (_data, affiliateId) => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['affiliate', affiliateId] })
    },
  })
}

export function useResumeAffiliate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (affiliateId: string) => {
      const result = await getApiClient().POST('/affiliates/{affiliateId}/resume', { params: { path: { affiliateId } } })
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: (_data, affiliateId) => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['affiliate', affiliateId] })
    },
  })
}
