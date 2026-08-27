import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

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
    mutationFn: async (body: {
      provider: 'HUBSPOT' | 'SALESFORCE' | 'SHOPIFY' | 'SQUARE' | 'PIPEDRIVE'
      label?: string
      externalAccountId?: string
    }) => {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-matches'] }),
  })
}
