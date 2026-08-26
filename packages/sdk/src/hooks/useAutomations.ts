import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateAutomationInput = {
  name: string
  trigger: 'MESSAGE_SENT' | 'CONTACT_REPLIES' | 'LEAD_CREATED' | 'LEAD_STATUS_CHANGED' | 'SALE_RECORDED' | 'DATE_REACHED'
  waitDays?: number
  condition?: 'HAS_REPLIED' | 'HAS_NOT_REPLIED' | 'LEAD_STILL_OPEN' | 'LEAD_REACHED_STAGE' | 'CUSTOMER_STATUS' | 'CHANNEL_ELIGIBILITY'
  conditionValue?: Record<string, unknown>
  action: 'SEND_EMAIL' | 'SEND_TEXT' | 'CREATE_REMINDER' | 'CHANGE_LEAD_STATUS' | 'NOTIFY_USER' | 'STOP_SEQUENCE'
  actionTemplateId?: string
  actionValue?: Record<string, unknown>
}

type UpdateAutomationInput = {
  automationId: string
  name?: string
  waitDays?: number
  actionTemplateId?: string | null
}

export function useAutomations(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['automations', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/automations', { params: { query: { ...params, cursor: pageParam } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useAutomation(automationId: string) {
  return useQuery({
    queryKey: ['automation', automationId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/automations/{automationId}', { params: { path: { automationId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!automationId,
  })
}

export function useAutomationLogs(automationId: string) {
  return useQuery({
    queryKey: ['automation', automationId, 'logs'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/automations/{automationId}/logs', { params: { path: { automationId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!automationId,
  })
}

export function useCreateAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateAutomationInput) => {
      const client = getApiClient()
      const result = await client.POST('/automations', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations', 'list'] }),
  })
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ automationId, ...body }: UpdateAutomationInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/automations/{automationId}', { params: { path: { automationId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['automation', variables.automationId] })
    },
  })
}

export function usePauseAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (automationId: string) => {
      const client = getApiClient()
      const result = await client.POST('/automations/{automationId}/pause', { params: { path: { automationId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, automationId) => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['automation', automationId] })
    },
  })
}

export function useResumeAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (automationId: string) => {
      const client = getApiClient()
      const result = await client.POST('/automations/{automationId}/resume', { params: { path: { automationId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, automationId) => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['automation', automationId] })
    },
  })
}
