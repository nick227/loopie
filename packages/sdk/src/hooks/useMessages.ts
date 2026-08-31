import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateMessageInput = {
  channel: 'EMAIL' | 'TEXT' | 'SOCIAL'
  subject?: string
  body: string
  audienceId: string
  templateId?: string
  automationId?: string
  scheduledAt?: string
}

type UpdateMessageInput = {
  messageId: string
  subject?: string | null
  body?: string
  contactIds?: string[]
}

export function useMessages(params?: { status?: string; channel?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['messages', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/messages', {
        params: { query: { ...params, cursor: pageParam } as any },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useMessage(messageId: string) {
  return useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/messages/{messageId}', { params: { path: { messageId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!messageId,
  })
}

export function useMessagePerformance(messageId: string) {
  return useQuery({
    queryKey: ['message', messageId, 'performance'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/messages/{messageId}/performance', {
        params: { path: { messageId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!messageId,
  })
}

export function useCreateMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateMessageInput) => {
      const client = getApiClient()
      const result = await client.POST('/messages', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', 'list'] }),
  })
}

export function useUpdateMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ messageId, ...body }: UpdateMessageInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/messages/{messageId}', {
        params: { path: { messageId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['message', variables.messageId] })
    },
  })
}

export function useDeleteMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (messageId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/messages/{messageId}', {
        params: { path: { messageId } },
      })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', 'list'] }),
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (messageId: string) => {
      const client = getApiClient()
      const result = await client.POST('/messages/{messageId}/send', {
        params: { path: { messageId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, messageId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['message', messageId] })
    },
  })
}

export function useTestSendMessage() {
  return useMutation({
    mutationFn: async ({
      messageId,
      toEmailOrPhone,
    }: {
      messageId: string
      toEmailOrPhone: string
    }) => {
      const client = getApiClient()
      const result = await client.POST('/messages/{messageId}/test-send', {
        params: { path: { messageId } },
        body: { toEmailOrPhone },
      })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
  })
}
