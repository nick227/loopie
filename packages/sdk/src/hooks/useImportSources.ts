import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { components } from '../generated/types'

type GoogleColumnMapping = components['schemas']['GoogleColumnMapping']

function invalidateSource(
  queryClient: ReturnType<typeof useQueryClient>,
  integrationId: string,
  sourceId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['import-sources', integrationId] })
  if (sourceId)
    void queryClient.invalidateQueries({ queryKey: ['import-source', integrationId, sourceId] })
  void queryClient.invalidateQueries({ queryKey: ['integrations'] })
}

export function useImportSources(integrationId: string | null) {
  return useQuery({
    queryKey: ['import-sources', integrationId],
    enabled: Boolean(integrationId),
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/integrations/{integrationId}/import-sources', {
        params: { path: { integrationId: integrationId! } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function useImportSourceTabs(integrationId: string | null, spreadsheetId: string | null) {
  return useQuery({
    queryKey: ['import-source-tabs', integrationId, spreadsheetId],
    enabled: Boolean(integrationId && spreadsheetId),
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/integrations/{integrationId}/import-sources/tabs', {
        params: {
          path: { integrationId: integrationId! },
          query: { spreadsheetId: spreadsheetId! },
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

export function useCreateImportSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      integrationId: string
      spreadsheetId: string
      sheetTab: string
      label?: string
    }) => {
      const { integrationId, ...body } = input
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/import-sources', {
        params: { path: { integrationId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: (_data, input) => invalidateSource(queryClient, input.integrationId),
  })
}

export function useImportSource(integrationId: string | null, sourceId: string | null) {
  return useQuery({
    queryKey: ['import-source', integrationId, sourceId],
    enabled: Boolean(integrationId && sourceId),
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/integrations/{integrationId}/import-sources/{sourceId}', {
        params: { path: { integrationId: integrationId!, sourceId: sourceId! } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function usePreviewImportSource() {
  return useMutation({
    mutationFn: async (input: {
      integrationId: string
      sourceId: string
      mapping?: GoogleColumnMapping
    }) => {
      const { integrationId, sourceId, mapping } = input
      const client = getApiClient()
      const result = await client.POST(
        '/integrations/{integrationId}/import-sources/{sourceId}/preview',
        {
          params: { path: { integrationId, sourceId } },
          body: mapping ? { mapping } : undefined,
        },
      )
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function useConfirmImportSourceMapping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      integrationId: string
      sourceId: string
      mapping: GoogleColumnMapping
      schemaFingerprint: string
    }) => {
      const { integrationId, sourceId, ...body } = input
      const client = getApiClient()
      const result = await client.POST(
        '/integrations/{integrationId}/import-sources/{sourceId}/mapping',
        {
          params: { path: { integrationId, sourceId } },
          body,
        },
      )
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: (_data, input) => invalidateSource(queryClient, input.integrationId, input.sourceId),
  })
}

export function useSyncImportSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { integrationId: string; sourceId: string }) => {
      const { integrationId, sourceId } = input
      const client = getApiClient()
      const result = await client.POST(
        '/integrations/{integrationId}/import-sources/{sourceId}/sync',
        { params: { path: { integrationId, sourceId } } },
      )
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
    onSuccess: (_data, input) => invalidateSource(queryClient, input.integrationId, input.sourceId),
  })
}

export function useImportSourceRuns(
  integrationId: string | null,
  sourceId: string | null,
  before?: string,
) {
  return useQuery({
    queryKey: ['import-source-runs', integrationId, sourceId, before],
    enabled: Boolean(integrationId && sourceId),
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET(
        '/integrations/{integrationId}/import-sources/{sourceId}/runs',
        {
          params: {
            path: { integrationId: integrationId!, sourceId: sourceId! },
            query: { before },
          },
        },
      )
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}
