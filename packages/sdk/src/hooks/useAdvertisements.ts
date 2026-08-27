import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '../generated/types'
import { getApiClient, ApiError } from '../client'

type CreateAdvertisementInput = components['schemas']['CreateAdvertisementInput']
type UpdateAdvertisementInput = components['schemas']['UpdateAdvertisementInput']
type CreateAdRunInput = components['schemas']['CreateAdRunInput']
type UpdateAdRunInput = components['schemas']['UpdateAdRunInput']

function unwrap<T>(result: { data?: T; error?: unknown; response: { status: number } }) {
  const err = result.error
  const data = result.data
  if (err) throw new ApiError(result.response.status, (err as { error: string }).error)
  return data!
}

export function useAdvertisements(opts: { cursor?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['advertisements', opts],
    queryFn: async () => {
      const client = getApiClient()
      return unwrap(
        await client.GET('/advertisements', {
          params: { query: opts },
        }),
      )
    },
  })
}

export function useAdvertisement(id: string) {
  return useQuery({
    queryKey: ['advertisements', id],
    queryFn: async () => {
      const client = getApiClient()
      return unwrap(
        await client.GET('/advertisements/{advertisementId}', {
          params: { path: { advertisementId: id } },
        }),
      )
    },
    enabled: !!id,
  })
}

export function useCreateAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAdvertisementInput) => {
      const client = getApiClient()
      return unwrap(await client.POST('/advertisements', { body: input }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useUpdateAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAdvertisementInput & { id: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.PATCH('/advertisements/{advertisementId}', {
          params: { path: { advertisementId: id } },
          body: input,
        }),
      )
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['advertisements', id] })
    },
  })
}

export function useAdRuns(advertisementId: string) {
  return useQuery({
    queryKey: ['advertisements', advertisementId, 'runs'],
    queryFn: async () => {
      const client = getApiClient()
      return unwrap(
        await client.GET('/advertisements/{advertisementId}/runs', {
          params: { path: { advertisementId } },
        }),
      )
    },
    enabled: !!advertisementId,
  })
}

export function useCreateAdRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      advertisementId,
      ...input
    }: CreateAdRunInput & { advertisementId: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/advertisements/{advertisementId}/runs', {
          params: { path: { advertisementId } },
          body: input,
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
    },
  })
}

export function useUpdateAdRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      advertisementId,
      runId,
      ...input
    }: UpdateAdRunInput & { advertisementId: string; runId: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.PATCH('/ad-runs/{adRunId}', {
          params: { path: { adRunId: runId } },
          body: input,
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
    },
  })
}
