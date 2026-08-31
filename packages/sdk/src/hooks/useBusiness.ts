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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
