import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { components } from '../generated/types'
import { getApiClient, ApiError } from '../client'

type CreateRiverPostInput = components['schemas']['CreateRiverPostInput']
type RiverFeedItem = components['schemas']['RiverFeedItem']
type RiverFeedResponse = components['schemas']['RiverFeedResponse']

function unwrap<T>(result: { data?: T; error?: unknown; response: { status: number } }) {
  const err = result.error
  const data = result.data
  if (err) throw new ApiError(result.response.status, (err as { error: string }).error)
  return data!
}

export function useRiverPosts(
  opts: { cursor?: string; limit?: number; advertisementId?: string; enabled?: boolean } = {},
) {
  const { enabled, ...query } = opts
  return useQuery({
    queryKey: ['riverPosts', query],
    queryFn: async () => {
      const client = getApiClient()
      return unwrap(
        await client.GET('/river/posts', {
          params: { query },
        }),
      )
    },
    enabled,
  })
}

export function useCreateRiverPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateRiverPostInput) => {
      const client = getApiClient()
      return unwrap(await client.POST('/river/posts', { body: input }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riverPosts'] })
    },
  })
}

export function useDeleteRiverPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient()
      return unwrap(
        await client.DELETE('/river/posts/{riverPostId}', {
          params: { path: { riverPostId: id } },
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riverPosts'] })
    },
  })
}

// ---------- Move River into the main Loopie app shell ----------
// The SPA's own consumer of the canonical GET /river/feed JSON API (already public/anonymous-
// capable, built in an earlier slice for exactly this — see RiverFeedService). The hand-rolled
// server-rendered /river page keeps using it too, unchanged, via its own vanilla-JS poll/scroll
// script — this is a second consumer of the same endpoint, not a duplicate of its assembly logic.

export function useRiverFeed(
  opts: { following?: boolean; business?: string; exclude?: string; enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: ['riverFeed', opts],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      return unwrap(
        await client.GET('/river/feed', {
          params: {
            query: {
              cursor: pageParam,
              following: opts.following ? '1' : undefined,
              business: opts.business,
              exclude: opts.exclude,
            },
          },
        }),
      )
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Global feed callers (RiverPage) never pass `enabled` and get the useInfiniteQuery default
    // (true). A business-scoped caller (the profile page's "Latest from this business") passes
    // `enabled: Boolean(profile?.id)` explicitly — this hook has no way to tell "not scoping" and
    // "scoping but the id isn't ready yet" apart from the `business` value alone.
    enabled: opts.enabled,
  })
}

// Polling mode ("N new posts" banner) — same `after=<latestPublishedAt>` contract and ~25s
// cadence as the hand-rolled page's own feedScript() poll(), just implemented as a query instead
// of an inline <script>. Disabled until there's a `latestPublishedAt` to poll against.
export function useRiverFeedPoll(opts: { after: string | null; following?: boolean }) {
  return useQuery({
    queryKey: ['riverFeedPoll', opts],
    queryFn: async () => {
      const client = getApiClient()
      return unwrap(
        await client.GET('/river/feed', {
          params: {
            query: { after: opts.after ?? undefined, following: opts.following ? '1' : undefined },
          },
        }),
      )
    },
    enabled: Boolean(opts.after),
    refetchInterval: 25_000,
  })
}

// Patches every cached riverFeed page (any `following` variant) in place — an instant, correct
// update from the mutation's own authoritative response, no full refetch needed for something
// this lightweight. `exact: false` (the default for an array queryKey filter) matches every
// ['riverFeed', opts] query regardless of its opts.
function updateRiverFeedCache(
  queryClient: QueryClient,
  updateItem: (item: RiverFeedItem) => RiverFeedItem,
) {
  queryClient.setQueriesData<{ pages: RiverFeedResponse[]; pageParams: unknown[] }>(
    { queryKey: ['riverFeed'] },
    (data) => {
      if (!data) return data
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map(updateItem),
        })),
      }
    },
  )
}

export function useReactToRiverPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (riverPostId: string) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/river/posts/{riverPostId}/react', {
          params: { path: { riverPostId } },
          headers: { Accept: 'application/json' },
        }),
      )
    },
    onSuccess: (result) => {
      const { riverPostId, reacted, reactionCount } = result.data ?? {}
      if (!riverPostId) return
      updateRiverFeedCache(queryClient, (item) =>
        item.id === riverPostId
          ? {
              ...item,
              viewer: item.viewer ? { ...item.viewer, reacted } : item.viewer,
              metrics: { ...item.metrics, reactions: reactionCount ?? item.metrics.reactions },
            }
          : item,
      )
    },
  })
}

export function useUnreactToRiverPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (riverPostId: string) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/river/posts/{riverPostId}/unreact', {
          params: { path: { riverPostId } },
          headers: { Accept: 'application/json' },
        }),
      )
    },
    onSuccess: (result) => {
      const { riverPostId, reacted, reactionCount } = result.data ?? {}
      if (!riverPostId) return
      updateRiverFeedCache(queryClient, (item) =>
        item.id === riverPostId
          ? {
              ...item,
              viewer: item.viewer ? { ...item.viewer, reacted } : item.viewer,
              metrics: { ...item.metrics, reactions: reactionCount ?? item.metrics.reactions },
            }
          : item,
      )
    },
  })
}

export function useFollowRiverBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (businessId: string) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/river/businesses/{businessId}/follow', {
          params: { path: { businessId } },
          headers: { Accept: 'application/json' },
        }),
      )
    },
    onSuccess: (result) => {
      const { businessId, following } = result.data ?? {}
      if (!businessId) return
      updateRiverFeedCache(queryClient, (item) =>
        item.business.id === businessId
          ? { ...item, viewer: item.viewer ? { ...item.viewer, following } : item.viewer }
          : item,
      )
    },
  })
}

export function useUnfollowRiverBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (businessId: string) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/river/businesses/{businessId}/unfollow', {
          params: { path: { businessId } },
          headers: { Accept: 'application/json' },
        }),
      )
    },
    onSuccess: (result) => {
      const { businessId, following } = result.data ?? {}
      if (!businessId) return
      updateRiverFeedCache(queryClient, (item) =>
        item.business.id === businessId
          ? { ...item, viewer: item.viewer ? { ...item.viewer, following } : item.viewer }
          : item,
      )
    },
  })
}

// ---------- River comments ----------
// One level of nesting only (see the "River comments" plan doc). useRiverComments is shared by
// both consumers of GET /river/posts/{riverPostId}/comments — the feed card's inline preview
// (limit: 2, reads just the first page and never calls fetchNextPage) and the full-thread
// permalink page (paginated via cursor as a thread grows past the default page size) — same
// endpoint, same hook, not two implementations. An infinite query rather than a plain one for
// exactly that reason — the preview usage just happens to never page past the first result.
export function useRiverComments(riverPostId: string | undefined, opts: { limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['riverComments', riverPostId, opts],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const client = getApiClient()
      return unwrap(
        await client.GET('/river/posts/{riverPostId}/comments', {
          params: {
            path: { riverPostId: riverPostId! },
            query: { limit: opts.limit, cursor: pageParam },
          },
        }),
      )
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    enabled: Boolean(riverPostId),
  })
}

// The post's own comment count (item.metrics.comments) is patched locally here — incremented/
// decremented, since the mutation's own success is the authoritative signal — while the comments
// list itself is invalidated so the new/removed comment actually shows up wherever it's being
// read from (the inline preview, the full thread, or both).
export function useCreateRiverComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { riverPostId: string; body: string; parentCommentId?: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.POST('/river/posts/{riverPostId}/comments', {
          params: { path: { riverPostId: input.riverPostId } },
          body: { body: input.body, parentCommentId: input.parentCommentId },
        }),
      )
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['riverComments', variables.riverPostId] })
      updateRiverFeedCache(queryClient, (item) =>
        item.id === variables.riverPostId
          ? { ...item, metrics: { ...item.metrics, comments: item.metrics.comments + 1 } }
          : item,
      )
    },
  })
}

export function useDeleteRiverComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { riverPostId: string; commentId: string }) => {
      const client = getApiClient()
      return unwrap(
        await client.DELETE('/river/posts/{riverPostId}/comments/{commentId}', {
          params: { path: { riverPostId: input.riverPostId, commentId: input.commentId } },
        }),
      )
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['riverComments', variables.riverPostId] })
      updateRiverFeedCache(queryClient, (item) =>
        item.id === variables.riverPostId
          ? {
              ...item,
              metrics: { ...item.metrics, comments: Math.max(0, item.metrics.comments - 1) },
            }
          : item,
      )
    },
  })
}

// The permalink/detail route's own query — GET /river/posts/{riverPostId} is content-negotiated
// the same way GET /b/{slug} is (see useBusinessProfile.ts): text/html by default (the standalone
// page, untouched), JSON when this hook's Accept header is sent. openapi-fetch types the response
// as a union of both content types since it can't know statically which one a given request will
// get back; this hook always sends the JSON header, so the cast below is safe.
type RiverPostResponse = { data?: { post: RiverFeedItem } }

export function useRiverPost(riverPostId: string | undefined) {
  return useQuery({
    queryKey: ['riverPost', riverPostId],
    queryFn: async () => {
      const client = getApiClient()
      const result = await client.GET('/river/posts/{riverPostId}', {
        params: { path: { riverPostId: riverPostId! } },
        headers: { Accept: 'application/json' },
      })
      return unwrap(
        result as unknown as {
          data?: RiverPostResponse
          error?: unknown
          response: { status: number }
        },
      )
    },
    enabled: Boolean(riverPostId),
  })
}
