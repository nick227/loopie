import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

function unwrap<T>(result: { data?: T; error?: unknown; response: { status: number } }) {
  const err = result.error
  const data = result.data
  if (err) throw new ApiError(result.response.status, (err as { error: string }).error)
  return data!
}

export function useInboxThreads(opts: { filter?: 'all' | 'unread' } = {}) {
  return useQuery({
    queryKey: ['inbox', 'threads', opts],
    queryFn: async () => {
      const client = getApiClient()
      return unwrap(await client.GET('/inbox/threads', { params: { query: opts } }))
    },
  })
}

export function useInboxThread(threadId: string) {
  return useQuery({
    queryKey: ['inbox', 'threads', threadId],
    queryFn: async () => {
      const client = getApiClient()
      return unwrap(
        await client.GET('/inbox/threads/{threadId}', { params: { path: { threadId } } }),
      )
    },
    enabled: !!threadId,
  })
}

export function useMarkInboxThreadRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (threadId: string) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/inbox/threads/{threadId}/read', { params: { path: { threadId } } }),
      )
    },
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'threads'] })
      queryClient.invalidateQueries({ queryKey: ['inbox', 'threads', threadId] })
    },
  })
}
