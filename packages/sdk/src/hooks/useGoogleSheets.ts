import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { components } from '../generated/types'

type GoogleColumnMapping = components['schemas']['GoogleColumnMapping']

export function useGoogleSheetsPickerToken() {
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const client = getApiClient()
      const result = await client.GET('/integrations/{integrationId}/google-sheets/picker-token', {
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

export function useSelectGoogleSheetsSpreadsheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      integrationId: string
      spreadsheetId: string
      spreadsheetName: string
    }) => {
      const { integrationId, ...body } = input
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/google-sheets/spreadsheet', {
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

export function useGoogleSheetsTabs(integrationId: string | null) {
  return useQuery({
    queryKey: ['google-sheets', 'tabs', integrationId],
    enabled: Boolean(integrationId),
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/integrations/{integrationId}/google-sheets/tabs', {
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

export function useSelectGoogleSheetsTab() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { integrationId: string; sheetTab: string }) => {
      const { integrationId, ...body } = input
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/google-sheets/tab', {
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

export function usePreviewGoogleSheetsImport() {
  return useMutation({
    mutationFn: async (input: { integrationId: string; mapping?: GoogleColumnMapping }) => {
      const { integrationId, mapping } = input
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/google-sheets/preview', {
        params: { path: { integrationId } },
        body: mapping ? { mapping } : undefined,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}

export function useConfirmGoogleSheetsMapping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { integrationId: string; mapping: GoogleColumnMapping }) => {
      const { integrationId, mapping } = input
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/google-sheets/mapping', {
        params: { path: { integrationId } },
        body: { mapping },
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

export function useExportContactsToGoogleSheets() {
  return useMutation({
    mutationFn: async (input: { integrationId: string; title?: string }) => {
      const { integrationId, title } = input
      const client = getApiClient()
      const result = await client.POST('/integrations/{integrationId}/google-sheets/export', {
        params: { path: { integrationId } },
        body: title ? { title } : undefined,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error?: string }).error ?? 'Request failed')
      return data!
    },
  })
}
