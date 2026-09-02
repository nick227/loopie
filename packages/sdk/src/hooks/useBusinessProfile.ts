import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '../generated/types'
import { getApiClient, ApiError } from '../client'

// GET /b/{slug} is content-negotiated (see the "Business profiles: redesign + fold into the app
// shell" plan doc) — text/html by default (the standalone rendered page, untouched), JSON when
// this hook's Accept header is sent. openapi-fetch types the response as a union of both content
// types since it can't know statically which one a given request will get back; this hook always
// sends the JSON header, so the cast below is safe.
type BusinessProfileResponse = {
  data?: {
    business: components['schemas']['Business']
    followerCount: number
    viewerIsFollowing: boolean | null
    isOwnProfile: boolean
    featured?: components['schemas']['RiverFeedItem'] | null
  }
}

function unwrap<T>(result: { data?: T; error?: unknown; response: { status: number } }) {
  const err = result.error
  const data = result.data
  if (err) throw new ApiError(result.response.status, (err as { error: string }).error)
  return data!
}

export function useBusinessProfile(slug: string | undefined) {
  return useQuery({
    queryKey: ['businessProfile', slug],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/b/{slug}', {
        params: { path: { slug: slug! } },
        headers: { Accept: 'application/json' },
      })
      return unwrap(
        result as unknown as {
          data?: BusinessProfileResponse
          error?: unknown
          response: { status: number }
        },
      )
    },
    enabled: Boolean(slug),
  })
}

export function useSendBusinessProfileMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ slug, body }: { slug: string; body: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/b/{slug}/messages', {
          params: { path: { slug } },
          body: { body },
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox', 'threads'] })
    },
  })
}

export function usePinRiverPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (riverPostId: string) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/river/posts/{riverPostId}/pin', {
          params: { path: { riverPostId } },
          headers: { Accept: 'application/json' },
        }),
      )
    },
    onSuccess: () => {
      // The pinned post changes which post is `featured` (and, since it's excluded from the
      // regular "Latest" list while pinned, that list's own membership) — simplest correct
      // response is to refetch both rather than hand-patch two different query shapes for
      // something this infrequent.
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] })
      queryClient.invalidateQueries({ queryKey: ['riverFeed'] })
    },
  })
}

export function useUnpinRiverPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (riverPostId: string) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/river/posts/{riverPostId}/unpin', {
          params: { path: { riverPostId } },
          headers: { Accept: 'application/json' },
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] })
      queryClient.invalidateQueries({ queryKey: ['riverFeed'] })
    },
  })
}
