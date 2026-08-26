import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type UpdateLeadInput = {
  leadId: string
  stage?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'QUOTED' | 'WON' | 'LOST'
  owner?: string | null
  estimatedValue?: number | null
}

export function useLeads(params?: { stage?: string; sourceType?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['leads', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/leads', { params: { query: { ...params, cursor: pageParam } as any } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useLead(leadId: string) {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/leads/{leadId}', { params: { path: { leadId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!leadId,
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, ...body }: UpdateLeadInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/leads/{leadId}', { params: { path: { leadId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] })
    },
  })
}
