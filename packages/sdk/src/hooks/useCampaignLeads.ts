import { useInfiniteQuery } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

export function useCampaignLeads(campaignId: string, params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['campaign', campaignId, 'leads', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/campaigns/{campaignId}/leads', {
        params: { path: { campaignId }, query: { ...params, cursor: pageParam } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    enabled: !!campaignId,
  })
}
