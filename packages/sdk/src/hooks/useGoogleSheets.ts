import { useMutation } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

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
