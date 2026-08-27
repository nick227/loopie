import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { paths, components } from '../generated/types'
import { getApiClient } from '../client'

type Advertisement = components['schemas']['Advertisement']
type AdRun = components['schemas']['AdRun']
type CreateAdvertisementInput = components['schemas']['CreateAdvertisementInput']
type UpdateAdvertisementInput = components['schemas']['UpdateAdvertisementInput']
type CreateAdRunInput = components['schemas']['CreateAdRunInput']
type UpdateAdRunInput = components['schemas']['UpdateAdRunInput']

export function useAdvertisements(opts: { status?: string; cursor?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['advertisements', opts],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET('/advertisements', {
        params: { query: opts as any },
      })
      if (error) throw error
      return data
    },
  })
}

export function useAdvertisement(id: string) {
  return useQuery({
    queryKey: ['advertisements', id],
    queryFn: async () => {
      const { data, error } = await getApiClient().GET('/advertisements/{advertisementId}', {
        params: { path: { advertisementId: id } },
      })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAdvertisementInput) => {
      const { data, error } = await getApiClient().POST('/advertisements', {
        body: input,
      })
      if (error) throw error
      return data
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
      const { data, error } = await getApiClient().PATCH('/advertisements/{advertisementId}', {
        params: { path: { advertisementId: id } },
        body: input,
      })
      if (error) throw error
      return data
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
      const { data, error } = await getApiClient().GET('/advertisements/{advertisementId}/runs', {
        params: { path: { advertisementId } },
      })
      if (error) throw error
      return data
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
      const { data, error } = await getApiClient().POST('/advertisements/{advertisementId}/runs', {
        params: { path: { advertisementId } },
        body: input,
      })
      if (error) throw error
      return data
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
      const { data, error } = await getApiClient().PATCH('/ad-runs/{adRunId}', {
        params: { path: { adRunId: runId } },
        body: input,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
    },
  })
}
