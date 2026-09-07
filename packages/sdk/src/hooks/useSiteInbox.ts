import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, getApiClient } from '../client'

export function useCreateSiteInquiry() {
  return useMutation({
    mutationFn: async (body: {
      name: string
      email: string
      message: string
      submissionKey: string
    }) => {
      const result = await getApiClient().POST('/site-inquiries', { body })
      const error = result.error
      const status = result.response.status
      const data = result.data
      if (error || !data?.received)
        throw new ApiError(status, 'We couldn’t send your message. Please try again.')
      return data
    },
  })
}

export function useSiteInbox() {
  return useInfiniteQuery({
    queryKey: ['siteInbox'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await getApiClient().GET('/admin/site-inbox', {
        params: { query: { cursor: pageParam } },
      })
      const error = result.error
      const status = result.response.status
      const data = result.data
      if (error) throw new ApiError(status, 'Couldn’t load the site inbox.')
      return data!
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

export function useSetSiteInboxSubscription() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const result = await getApiClient().PUT('/admin/site-inbox/subscription', {
        body: { enabled },
      })
      const error = result.error
      const status = result.response.status
      const data = result.data
      if (error) throw new ApiError(status, 'Couldn’t save your email preference.')
      return data!
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['siteInbox'] })
    },
  })
}
