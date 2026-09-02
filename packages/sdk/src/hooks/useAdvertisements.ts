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

export function useDeleteAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient()
      return unwrap(
        await client.DELETE('/advertisements/{advertisementId}', {
          params: { path: { advertisementId: id } },
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function usePublishAdvertisement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      clickBehavior,
      destinationUrl,
    }: {
      id: string
      clickBehavior?: 'NONE' | 'URL' | 'HOST'
      destinationUrl?: string
    }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/advertisements/{advertisementId}/publish', {
          params: { path: { advertisementId: id } },
          body: { clickBehavior, destinationUrl },
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
          // Destination rows render their publish ledger from these immutable run records.
          // Fetch the API's maximum page so the editor does not truncate ordinary histories.
          params: { path: { advertisementId }, query: { limit: 100 } },
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
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
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
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function usePauseAdRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ advertisementId, runId }: { advertisementId: string; runId: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/pause', {
          params: { path: { adRunId: runId } },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useResumeAdRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ advertisementId, runId }: { advertisementId: string; runId: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/resume', {
          params: { path: { adRunId: runId } },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useEndAdRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ advertisementId, runId }: { advertisementId: string; runId: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/end', {
          params: { path: { adRunId: runId } },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useUpdateAdRunBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      advertisementId,
      runId,
      dailyBudget,
    }: {
      advertisementId: string
      runId: string
      dailyBudget: number
    }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/budget', {
          params: { path: { adRunId: runId } },
          body: { dailyBudget },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useUpdateAdRunSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      advertisementId,
      runId,
      startDate,
      endDate,
    }: {
      advertisementId: string
      runId: string
      startDate: string
      endDate: string | null
    }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/schedule', {
          params: { path: { adRunId: runId } },
          body: { startDate, endDate },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useUpdateAdRunTargeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      advertisementId,
      runId,
      country,
      locationNote,
      radiusMiles,
    }: {
      advertisementId: string
      runId: string
      country: string
      locationNote: string | null
      radiusMiles: number | null
    }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/targeting', {
          params: { path: { adRunId: runId } },
          body: { country, locationNote, radiusMiles },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useReplaceAdRunCreative() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      advertisementId,
      runId,
      idempotencyKey,
    }: {
      advertisementId: string
      runId: string
      idempotencyKey: string
    }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/replace-creative', {
          params: { path: { adRunId: runId } },
          body: { idempotencyKey },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useReplaceAdRunDestination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      advertisementId,
      runId,
      destinationLandingPageId,
      idempotencyKey,
    }: {
      advertisementId: string
      runId: string
      destinationLandingPageId: string
      idempotencyKey: string
    }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/replace-destination', {
          params: { path: { adRunId: runId } },
          body: { destinationLandingPageId, idempotencyKey },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}

export function useSyncAdRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ advertisementId, runId }: { advertisementId: string; runId: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/ad-runs/{adRunId}/sync', {
          params: { path: { adRunId: runId } },
        }),
      )
    },
    onSuccess: (_, { advertisementId }) => {
      queryClient.invalidateQueries({ queryKey: ['advertisements', advertisementId, 'runs'] })
      // A run mutation changes the parent Advertisement's own derived status/spend/destinations
      // aggregate too (advertisementSummary.ts, computed server-side from live runs) — without
      // this, the Advertising collection and Inbox's Running card read stale for up to the query
      // client's 30s staleTime after Back. Same bug class found and fixed on the Pages side
      // (usePublishLandingPage, packages/sdk/src/hooks/useLandingPages.ts).
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
    },
  })
}
