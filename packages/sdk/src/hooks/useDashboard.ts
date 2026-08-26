import { useQuery } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

export function useHomeSummary() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/home')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
  })
}

export function useResultsSummary() {
  return useQuery({
    queryKey: ['results'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/results')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
  })
}
