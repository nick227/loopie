import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type MoneyBody = {
  amountMinor: number
  currency: string
  idempotencyKey: string
  metadata?: { [key: string]: unknown }
}

export function useFinanceAccounts(currency = 'USD') {
  return useQuery({
    queryKey: ['finance', 'accounts', currency],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/finance/accounts', { params: { query: { currency } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function useLedgerTransactions(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['finance', 'transactions', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/finance/transactions', {
        params: { query: { ...params, cursor: pageParam } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useLedgerTransaction(transactionId: string) {
  return useQuery({
    queryKey: ['finance', 'transaction', transactionId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/finance/transactions/{transactionId}', {
        params: { path: { transactionId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    enabled: !!transactionId,
  })
}

export function useCampaignFunding(campaignId: string) {
  return useQuery({
    queryKey: ['finance', 'campaign-funding', campaignId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/campaigns/{campaignId}/funding', {
        params: { path: { campaignId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    enabled: !!campaignId,
  })
}

function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['finance'] })
}

export function useRecordClientFunding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: MoneyBody & { externalRef?: string; processor?: string }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/funding', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useApplyFinanceCredit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: MoneyBody & { reason?: string }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/credits', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useIssueFinanceRefund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: MoneyBody & { paymentId?: string; reason?: string }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/refunds', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useReverseLedgerTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ transactionId, ...body }: { transactionId: string; idempotencyKey: string; reason?: string }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/transactions/{transactionId}/reverse', {
        params: { path: { transactionId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}
