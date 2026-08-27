import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateSaleInput = {
  contactId: string
  leadId?: string
  amount: number
  date: string
  productOrService?: string
  notes?: string
  idempotencyKey: string
}

export function useSales(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['sales', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/sales', {
        params: { query: { ...params, cursor: pageParam } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useSale(saleId: string) {
  return useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/sales/{saleId}', { params: { path: { saleId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!saleId,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateSaleInput) => {
      const client = getApiClient()
      const result = await client.POST('/sales', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['leads', 'list'] })
    },
  })
}

export function useReverseSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: string; reason?: string }) => {
      const client = getApiClient()
      const result = await client.POST('/sales/{saleId}/reverse', {
        params: { path: { saleId } },
        body: { reason },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] })
      queryClient.invalidateQueries({ queryKey: ['leads', 'list'] })
    },
  })
}
