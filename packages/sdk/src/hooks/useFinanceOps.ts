import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['finance'] })
}

export function useAuthorizeCampaignBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      campaignId: string
      amountMinor: number
      currency: string
      idempotencyKey: string
    }) => {
      const { campaignId, ...payload } = body
      const client = getApiClient()
      const result = await client.POST('/campaigns/{campaignId}/budget-authorizations', {
        params: { path: { campaignId } },
        body: payload,
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

export function useRecordAdSpend() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      campaignId: string
      amountMinor: number
      currency: string
      platform: 'META' | 'GOOGLE' | 'TIKTOK' | 'LOOPIE'
      externalChargeId: string
      periodStart: string
      periodEnd: string
      idempotencyKey: string
      deploymentId?: string
      adUnitId?: string
    }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/ad-spend', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useSettleAdSpend() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      adSpendId: string
      settledAmountMinor: number
      idempotencyKey: string
    }) => {
      const { adSpendId, ...payload } = body
      const client = getApiClient()
      const result = await client.POST('/finance/ad-spend/{adSpendId}/settle', {
        params: { path: { adSpendId } },
        body: payload,
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

export function useRecordLoopieFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      amountMinor: number
      currency: string
      idempotencyKey: string
      campaignId: string
      description?: string
    }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/fees', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useReconcileAdSpend() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      adSpendId: string
      trackedAmountMinor: number
      platformReportedAmountMinor: number
      settledAmountMinor: number
      idempotencyKey: string
      notes?: string
    }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/reconciliations', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useCreateCommission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      amountMinor: number
      currency: string
      payeeRef: string
      idempotencyKey: string
      sourceRef?: string
    }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/commissions', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useMarkCommissionPayable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { commissionId: string; idempotencyKey: string }) => {
      const { commissionId, ...payload } = body
      const client = getApiClient()
      const result = await client.POST('/finance/commissions/{commissionId}/payable', {
        params: { path: { commissionId } },
        body: payload,
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

export function useCancelCommission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commissionId: string) => {
      const client = getApiClient()
      const result = await client.POST('/finance/commissions/{commissionId}/cancel', {
        params: { path: { commissionId } },
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

export function useCreatePayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      commissionIds: string[]
      payeeRef: string
      idempotencyKey: string
    }) => {
      const client = getApiClient()
      const result = await client.POST('/finance/payouts', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => invalidateFinance(queryClient),
  })
}
