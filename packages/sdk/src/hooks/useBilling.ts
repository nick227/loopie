import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

function throwIfError(result: { error?: unknown; response: { status: number }; data?: unknown }) {
  const err = result.error
  const status = result.response.status
  const data = result.data
  if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
  return data
}

export function useBilling() {
  return useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const result = await getApiClient().GET('/billing')
      return throwIfError(result) as NonNullable<typeof result.data>
    },
  })
}

export function useCreateBillingCheckout() {
  return useMutation({
    mutationFn: async () => {
      const result = await getApiClient().POST('/billing/checkout')
      return throwIfError(result) as NonNullable<typeof result.data>
    },
  })
}

export function useCreateBillingPortal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const result = await getApiClient().POST('/billing/portal')
      return throwIfError(result) as NonNullable<typeof result.data>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['billing'] }),
  })
}
