import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

export type Channel =
  'EMAIL' | 'TEXT' | 'SOCIAL' | 'CALL' | 'MEETING' | 'WEBINAR' | 'EVENT' | 'FORM' | 'REFERRAL'

// The Channel -> Provider -> Activity taxonomy's catalog layer — real products/tools within a
// channel (Mailchimp, LinkedIn, Zoom, ...), seeded with real-world defaults per business at
// registration. Generic enough to reuse anywhere a provider needs picking, not contact-specific.
export function useChannelProviders(params?: { channel?: Channel }) {
  return useQuery({
    queryKey: ['channel-providers', params],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/channel-providers', { params: { query: params } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
  })
}

export function useCreateChannelProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { channel: Channel; name: string }) => {
      const client = getApiClient()
      const result = await client.POST('/channel-providers', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channel-providers'] }),
  })
}

export function useUpdateChannelProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ providerId, name }: { providerId: string; name: string }) => {
      const client = getApiClient()
      const result = await client.PATCH('/channel-providers/{providerId}', {
        params: { path: { providerId } },
        body: { name },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-providers'] })
      // A rename propagates implicitly to every interaction referencing it.
      queryClient.invalidateQueries({ queryKey: ['contact'] })
    },
  })
}
