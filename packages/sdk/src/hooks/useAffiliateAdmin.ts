import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { operations } from '../generated/types'

export function useAdminListPlatformAffiliates(options?: any) {
  return useQuery({
    queryKey: ['admin', 'platformAffiliates'],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET('/admin/platform-affiliates')
      if (error) throw error
      return data
    },
    ...options,
  })
}

export function useAdminUpdatePlatformAffiliate(options?: any) {
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, any>) => {
      const { data, error } = await getApiClient().PATCH('/admin/platform-affiliates/{id}', {
        params: { path: { id } },
        body: body as any,
      })
      if (error) throw error
      return data
    },
    ...options,
  })
}

export function useAdminListPlatformClasses(options?: any) {
  return useQuery({
    queryKey: ['admin', 'platformClasses'],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET('/admin/platform-affiliate-classes')
      if (error) throw error
      return data
    },
    ...options,
  })
}

export function useAdminListPlatformDeals(options?: any) {
  return useQuery({
    queryKey: ['admin', 'platformDeals'],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET('/admin/platform-affiliate-deals')
      if (error) throw error
      return data
    },
    ...options,
  })
}

export function useGetPlatformAffiliateOverview(options?: any) {
  return useQuery({
    queryKey: ['affiliates', 'me', 'overview'],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET('/affiliates/me/overview')
      if (error) throw error
      return data
    },
    ...options,
  })
}

export function useGetPlatformAffiliateClients(query: any = {}, options?: any) {
  return useInfiniteQuery({
    queryKey: ['affiliates', 'me', 'clients', query],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const result = await getApiClient().GET('/affiliates/me/clients', {
        params: {
          query: {
            ...query,
            cursor: pageParam,
          } as any,
        },
      })
      const err: any = result.error
      if (err) throw new ApiError(result.response.status, err.error)
      return result.data!
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    ...options,
  })
}

export function useGetMyPlatformAffiliate(options?: any) {
  return useQuery({
    queryKey: ['affiliates', 'me'],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET('/affiliates/me')
      if (error) throw error
      return data
    },
    ...options,
  })
}

export function useAdminGetPayableEarningsSummary(options?: any) {
  return useQuery({
    queryKey: ['adminGetPayableEarningsSummary'],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET(
        '/admin/platform-affiliate-earnings/payable-summary',
      )
      if (error) throw error
      return data
    },
    ...options,
  })
}

export function useAdminGetMoneyFlowLedger(query: any = {}, options?: any) {
  return useInfiniteQuery({
    queryKey: ['adminGetMoneyFlowLedger', query],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await getApiClient().GET('/admin/platform-affiliate-earnings/money-flow', {
        params: {
          query: {
            ...query,
            cursor: pageParam,
          } as any,
        },
      })
      const err: any = result.error
      if (err) throw new ApiError(result.response.status, err.error)
      return result.data!
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    ...options,
  })
}

export function useAdminListPlatformAffiliatePayouts(query: any = {}, options?: any) {
  return useInfiniteQuery({
    queryKey: ['adminListPlatformAffiliatePayouts', query],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await getApiClient().GET('/admin/platform-affiliate-payouts', {
        params: {
          query: {
            ...query,
            cursor: pageParam,
          } as any,
        },
      })
      const err: any = result.error
      if (err) throw new ApiError(result.response.status, err.error)
      return result.data!
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    ...options,
  })
}

export function useAdminCreatePlatformAffiliatePayout(options?: any) {
  return useMutation({
    mutationFn: async (
      body: operations['adminCreatePlatformAffiliatePayout']['requestBody']['content']['application/json'],
    ) => {
      const { data, error } = await getApiClient().POST('/admin/platform-affiliate-payouts', {
        body,
      })
      if (error) throw error
      return data
    },
    ...options,
  })
}

export function useAdminSettlePlatformAffiliatePayout(options?: any) {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await getApiClient().PATCH(
        '/admin/platform-affiliate-payouts/{id}/settle',
        {
          params: { path: { id } },
        },
      )
      if (error) throw error
      return data
    },
    ...options,
  })
}
