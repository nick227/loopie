import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateCampaignInput = {
  name: string
  budget: number
  startDate: string
  endDate?: string
  destinationUrl?: string
  platforms: ('META' | 'GOOGLE' | 'TIKTOK')[]
  creativeIds: string[]
}

type UpdateCampaignInput = {
  campaignId: string
  name?: string
  budget?: number
  endDate?: string | null
  destinationUrl?: string
  creativeIds?: string[]
}

type CreateDeploymentInput = {
  campaignId: string
  creativeId: string
  platform: 'META' | 'GOOGLE' | 'TIKTOK'
  externalCampaignId?: string
  externalAdSetId?: string
  externalAdId?: string
  destinationLandingPageId?: string
}

type UpdateDeploymentInput = {
  deploymentId: string
  status?: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'ENDED'
  spend?: number
  impressions?: number
  clicks?: number
  conversions?: number
  destinationLandingPageId?: string | null
}

export function useCampaigns(params?: { status?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['campaigns', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/campaigns', { params: { query: { ...params, cursor: pageParam } as any } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/campaigns/{campaignId}', { params: { path: { campaignId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!campaignId,
  })
}

export function useCampaignPerformance(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'performance'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/campaigns/{campaignId}/performance', { params: { path: { campaignId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!campaignId,
  })
}

export function useDeployments(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'deployments'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/campaigns/{campaignId}/deployments', { params: { path: { campaignId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!campaignId,
  })
}

// KNOWN GAP: the API has no standalone GET /deployments/{deploymentId} — deployments are only
// ever listed under a campaign (useDeployments(campaignId)). UpdateDeploymentPage's route only
// carries deploymentId, not campaignId, so it can't call that hook either. This returns no data
// (never fetches) rather than throwing; the edit page renders with an empty form until either
// the route carries campaignId too or the API gains the missing GET. Add before real Phase 4
// deployment-editing UI ships.
export function useDeployment(_deploymentId: string) {
  return useQuery({
    queryKey: ['deployment', _deploymentId],
    queryFn: async () => undefined,
    enabled: false,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateCampaignInput) => {
      const client = getApiClient()
      const result = await client.POST('/campaigns', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] }),
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, ...body }: UpdateCampaignInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/campaigns/{campaignId}', { params: { path: { campaignId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.campaignId] })
    },
  })
}

export function usePauseCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const client = getApiClient()
      const result = await client.POST('/campaigns/{campaignId}/pause', { params: { path: { campaignId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
    },
  })
}

export function useResumeCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const client = getApiClient()
      const result = await client.POST('/campaigns/{campaignId}/resume', { params: { path: { campaignId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
    },
  })
}

export function useEndCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const client = getApiClient()
      const result = await client.POST('/campaigns/{campaignId}/end', { params: { path: { campaignId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
    },
  })
}

export function useDuplicateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const client = getApiClient()
      const result = await client.POST('/campaigns/{campaignId}/duplicate', { params: { path: { campaignId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] }),
  })
}

export function useCreateDeployment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, ...body }: CreateDeploymentInput) => {
      const client = getApiClient()
      const result = await client.POST('/campaigns/{campaignId}/deployments', {
        params: { path: { campaignId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.campaignId, 'deployments'] })
    },
  })
}

export function useUpdateDeployment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ deploymentId, ...body }: UpdateDeploymentInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/deployments/{deploymentId}', { params: { path: { deploymentId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => {
      // Deployment lists are cached per-campaign; without the campaignId in scope here, the
      // caller (which does have it, from useParams) should invalidate ['campaign', id,
      // 'deployments'] itself after a successful mutation.
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'list'] })
    },
  })
}
