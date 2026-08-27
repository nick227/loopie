import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type Platform = 'META' | 'GOOGLE' | 'TIKTOK'

export function usePlatformConnection(platform: string | undefined) {
  return useQuery({
    queryKey: ['platform', platform],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/platforms/{platform}', {
        params: { path: { platform: platform as Platform } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    enabled: !!platform && platform !== 'LOOPIE',
  })
}

export function useStartPlatformOAuth(platform: string) {
  return useMutation({
    mutationFn: async (returnPath?: string) => {
      const client = getApiClient()
      const result = await client.GET('/platforms/{platform}/oauth/start', {
        params: { path: { platform: platform as Platform }, query: { returnPath } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
  })
}

export function useUpdatePlatformConnection(platform: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      adAccountId?: string
      pageId?: string
      defaultCountry?: string
    }) => {
      const client = getApiClient()
      const result = await client.PATCH('/platforms/{platform}', {
        params: { path: { platform: platform as Platform } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', platform] }),
  })
}

export function usePlatformAccounts(platform: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['platform', platform, 'accounts'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/platforms/{platform}/accounts', {
        params: { path: { platform: platform as Platform } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    enabled: !!platform && enabled,
  })
}

export function usePlatformPages(platform: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['platform', platform, 'pages'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/platforms/{platform}/pages', {
        params: { path: { platform: platform as Platform } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    enabled: !!platform && enabled,
  })
}

export function usePushDeployment(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (deploymentId: string) => {
      const client = getApiClient()
      const result = await client.POST('/deployments/{deploymentId}/push', {
        params: { path: { deploymentId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId, 'deployments'] })
    },
  })
}
