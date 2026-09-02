import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { components } from '../generated/types'

export function useCrmCatalog() {
  return useQuery({
    queryKey: ['crm', 'catalog'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/integrations/catalog')
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function useIntegrations() {
  return useInfiniteQuery({
    queryKey: ['integrations', 'list'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/integrations', { params: { query: { cursor: pageParam } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useCreateIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: components['schemas']['CreateIntegrationInput']) => {
      const client = getApiClient()
      const result = await client.POST('/integrations', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', 'list'] }),
  })
}

export function useContactMatches(status?: 'UNMATCHED' | 'AMBIGUOUS') {
  return useInfiniteQuery({
    queryKey: ['contact-matches', status],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/contact-matches', {
        params: { query: { cursor: pageParam, status } },
      })
      const err = result.error
      const statusCode = result.response.status
      const data = result.data
      if (err) throw new ApiError(statusCode, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useStartCrmOAuth() {
  return useMutation({
    mutationFn: async (input: {
      provider: 'HUBSPOT' | 'SALESFORCE' | 'SHOPIFY' | 'WOOCOMMERCE' | 'SQUARE' | 'PIPEDRIVE'
      shop?: string
    }) => {
      const client = getApiClient()
      const result = await client.GET('/integrations/{provider}/oauth/start', {
        params: {
          path: { provider: input.provider },
          query: { shop: input.shop, returnPath: '/integrations' },
        },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function usePreviewIntegration() {
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/preview', {
        params: { path: { integrationId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function useSyncIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/sync', {
        params: { path: { integrationId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'catalog'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      integrationId: string
      status?: 'CONNECTED' | 'PAUSED' | 'NEEDS_REAUTH'
      label?: string
    }) => {
      const { integrationId, ...body } = input
      const client = getApiClient()
      const result = await client.PATCH('/integrations/{integrationId}', {
        params: { path: { integrationId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', 'list'] }),
  })
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/disconnect', {
        params: { path: { integrationId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', 'list'] }),
  })
}

export function useResolveContactMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { recordId: string; contactId: string }) => {
      const client = getApiClient()
      const result = await client.POST('/contact-matches/{recordId}/resolve', {
        params: { path: { recordId: input.recordId } },
        body: { contactId: input.contactId },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-matches'] })
      // Resolving a match links an ExternalContactRecord onto this Contact (ContactMatchService
      // #resolve) — its `records`/provenance change, which the Contacts collection's synced-
      // source badge and the Contact entity's "Linked systems" card both read. Same stale-query
      // class found and fixed on the Pages/Advertising side (usePublishLandingPage,
      // useAdvertisements.ts's run mutations).
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] })
    },
  })
}
