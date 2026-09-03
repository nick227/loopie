import { useQuery } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

export const nextActionQueryKey = ['assistant', 'next-action']

export function useNextAction() {
  return useQuery({
    queryKey: nextActionQueryKey,
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/assistant/next-action')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!.data
    },
  })
}
