import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'

type CreateLandingPageInput = {
  templateId: string
  name: string
  slug: string
  formId?: string
  content?: Record<string, unknown>
  theme?: Record<string, unknown>
}

type UpdateLandingPageInput = {
  landingPageId: string
  name?: string
  slug?: string
  customDomain?: string | null
  formId?: string | null
  templateId?: string
  content?: Record<string, unknown>
  theme?: Record<string, unknown> | null
}

export function useLandingPageTemplates(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['landingPageTemplates', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/landing-page-templates', {
        params: { query: { ...params, cursor: pageParam } },
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

export function useLandingPageTemplate(templateId: string) {
  return useQuery({
    queryKey: ['landingPageTemplate', templateId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/landing-page-templates/{templateId}', {
        params: { path: { templateId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!templateId,
  })
}

export function useLandingPages(params?: { status?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: ['landingPages', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      const result = await client.GET('/landing-pages', {
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

export function useLandingPage(landingPageId: string) {
  return useQuery({
    queryKey: ['landingPage', landingPageId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/landing-pages/{landingPageId}', {
        params: { path: { landingPageId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!landingPageId,
  })
}

export function useLandingPageVersions(landingPageId: string) {
  return useQuery({
    queryKey: ['landingPage', landingPageId, 'versions'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/landing-pages/{landingPageId}/versions', {
        params: { path: { landingPageId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!landingPageId,
  })
}

export function useExportLandingPage(landingPageId: string) {
  return useQuery({
    queryKey: ['landingPage', landingPageId, 'export'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/landing-pages/{landingPageId}/export', {
        params: { path: { landingPageId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!landingPageId,
  })
}

export function useLandingPagePerformance(landingPageId: string) {
  return useQuery({
    queryKey: ['landingPage', landingPageId, 'performance'],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/landing-pages/{landingPageId}/performance', {
        params: { path: { landingPageId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    enabled: !!landingPageId,
  })
}

export function useCreateLandingPage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateLandingPageInput) => {
      const client = getApiClient()
      const result = await client.POST('/landing-pages', { body })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['landingPages', 'list'] }),
  })
}

export function useUpdateLandingPage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ landingPageId, ...body }: UpdateLandingPageInput) => {
      const client = getApiClient()
      const result = await client.PATCH('/landing-pages/{landingPageId}', {
        params: { path: { landingPageId } },
        body,
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['landingPages', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['landingPage', variables.landingPageId] })
      if (variables.templateId) {
        queryClient.invalidateQueries({ queryKey: ['landingPageTemplate', variables.templateId] })
      }
    },
  })
}

export function useDeleteLandingPage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (landingPageId: string) => {
      const client = getApiClient()
      const result = await client.DELETE('/landing-pages/{landingPageId}', {
        params: { path: { landingPageId } },
      })
      const err = result.error
      const status = result.response.status
      if (err) throw new ApiError(status, (err as any).error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['landingPages', 'list'] }),
  })
}

export function usePublishLandingPage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (landingPageId: string) => {
      const client = getApiClient()
      const result = await client.POST('/landing-pages/{landingPageId}/publish', {
        params: { path: { landingPageId } },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as any).error)
      return data!
    },
    onSuccess: (_data, landingPageId) => {
      queryClient.invalidateQueries({ queryKey: ['landingPage', landingPageId] })
      queryClient.invalidateQueries({ queryKey: ['landingPage', landingPageId, 'versions'] })
    },
  })
}

export function useReplaceLandingPageAdSlots(landingPageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      slots: {
        placement: 'AFTER_HERO' | 'BEFORE_FORM' | 'AFTER_FORM' | 'BOTTOM'
        adUnitId: string | null
      }[],
    ) => {
      const client = getApiClient()
      const result = await client.PUT('/landing-pages/{landingPageId}/ad-slots', {
        params: { path: { landingPageId } },
        body: { slots },
      })
      const err = result.error
      const status = result.response.status
      const data = result.data
      if (err) throw new ApiError(status, (err as { error: string }).error)
      return data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPage', landingPageId] })
      queryClient.invalidateQueries({ queryKey: ['landingPages', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['landingPage', landingPageId, 'export'] })
    },
  })
}
