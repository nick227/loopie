import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateTemplateInput = {
  name: string
  channel: 'EMAIL' | 'TEXT' | 'SOCIAL'
  purpose?: string
  subject?: string
  body: string
  mediaAssetId?: string
  cta?: string
  personalizationTokens?: string[]
  suggestedAudienceId?: string
}

type UpdateTemplateInput = {
  templateId: string
  name?: string
  subject?: string | null
  body?: string
  cta?: string | null
}

export function useTemplates(params?: { channel?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['templates', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/templates', { params: { query: { ...params, cursor: pageParam } as any } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  })
}

export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/templates/{templateId}', { params: { path: { templateId } } })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!templateId,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateTemplateInput) => {
      const client = getApiClient()
      const result = await client.POST('/templates', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates', 'list'] }),
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ templateId, ...body }: UpdateTemplateInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/templates/{templateId}', { params: { path: { templateId } }, body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['template', variables.templateId] })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/templates/{templateId}', { params: { path: { templateId } } })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates', 'list'] }),
  })
}
