import { useQuery } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

export const nextStepQueryKey = ['assistant', 'next-step']

export function useNextStep() {
  return useQuery({
    queryKey: nextStepQueryKey,
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/assistant/next-step')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
  })
}
