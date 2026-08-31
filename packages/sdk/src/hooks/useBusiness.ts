import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { components } from '../generated/types'

export type UpdateBusinessInput = components['schemas']['UpdateBusinessInput']

export function useBusiness() {
  return useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/business')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
  })
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateBusinessInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/business', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    // Awaited (not fire-and-forget): callers that navigate right after a successful save — see
    // BusinessIdentityForm.tsx's onSaved -> navigate('/home') — depend on the ['me'] cache
    // (businessIdentityCompletedAt) already reflecting the save by the time mutateAsync resolves.
    // Found live: without awaiting, InboxRoute's guard (RequireRole.tsx) could still read the
    // stale pre-save cache on the very next render and bounce straight back to /business/setup.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['business'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ])
    },
  })
}
