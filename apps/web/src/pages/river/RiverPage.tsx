import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Waves, PenLine } from 'lucide-react'
import type { components } from '@project/sdk'
import { useCurrentUser, useRiverFeed, useRiverFeedPoll } from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { VirtualInfiniteList } from '@/components/ui/VirtualInfiniteList'
import { RiverFeedCard } from '@/components/river/RiverFeedCard'
import { RiverComposerModal } from '@/components/river/RiverComposerModal'
import {
  RiverDiscoveryModule,
  type DiscoveryBusiness,
} from '@/components/river/RiverDiscoveryModule'

type RiverFeedItem = components['schemas']['RiverFeedItem']

type FeedRow =
  | { kind: 'post'; item: RiverFeedItem }
  | { kind: 'discovery'; key: string; businesses: DiscoveryBusiness[] }

const DISCOVERY_CADENCE = 6
const DISCOVERY_GROUP_SIZE = 4
const DISCOVERY_MIN_GROUP_SIZE = 3

// Interleaves a business-discovery module every ~6 *organic* posts (SPONSORED items don't count
// toward the cadence — that's already its own deterministic insertion server-side, see
// RiverFeedService; stacking a second one exactly on its boundary would tangle two independent
// rhythms together). The module is built entirely from businesses already seen earlier in this
// same scrolled feed — deduplicated, excludes the viewer's own business and anything with no
// public slug to link to — and a boundary with fewer than 3 distinct businesses collected simply
// has no module inserted there rather than rendering a half-empty grid (checked again at the next
// boundary once more have accumulated). Recomputed from scratch whenever `items` changes, so a
// "N new posts" banner click (which prepends at the front) can shift where a module lands relative
// to before — an accepted simplification, not worth stabilizing positions across that rare case.
function buildFeedRows(items: RiverFeedItem[], viewerBusinessId?: string): FeedRow[] {
  const rows: FeedRow[] = []
  const alreadyShown = new Set<string>()
  const pool: DiscoveryBusiness[] = []
  let organicCount = 0

  for (const item of items) {
    rows.push({ kind: 'post', item })

    const { business } = item
    if (
      business.slug &&
      business.id !== viewerBusinessId &&
      !alreadyShown.has(business.id) &&
      !pool.some((b) => b.id === business.id)
    ) {
      pool.push({
        id: business.id,
        name: business.name,
        slug: business.slug,
        logoUrl: business.logoUrl ?? null,
      })
    }

    if (item.type === 'SPONSORED') continue
    organicCount += 1
    if (organicCount % DISCOVERY_CADENCE !== 0) continue
    if (pool.length < DISCOVERY_MIN_GROUP_SIZE) continue

    const chosen = pool.splice(0, DISCOVERY_GROUP_SIZE)
    chosen.forEach((b) => alreadyShown.add(b.id))
    rows.push({ kind: 'discovery', key: `discovery-${item.id}`, businesses: chosen })
  }

  return rows
}

// River, moved into the main Loopie app shell (see the dated plan doc "Move River into the main
// Loopie app shell"; the layout/spacing/typography pass below is the dated "River design
// critique" note). This route sits outside <AuthGuard/> in App.tsx — anonymous visitors can
// browse it, an authenticated business user gets the same Shell chrome plus reactions/follows/
// composer. GET /river/feed is the same canonical JSON API the hand-rolled apps/server /river
// page already uses via its own vanilla-JS poll/scroll script; this is a second consumer, not a
// re-implementation of RiverFeedService's assembly, anti-repeat, or sponsored-insertion logic.
//
// Frame width: Shell's own page wrapper (Shell.tsx) is a shared max-w-[900px] applied to every
// route in the app — widening it just for River would mean breaking a route out of the shared
// layout, which is a bigger structural change than this pass's "layout geometry, typography,
// media sizing, spacing, card anatomy" scope. Instead the feed itself sits at max-w-[720px]
// centered inside that existing 900px frame — comfortable side margins, not a narrow column
// stranded in a much wider one, without touching what every other page already relies on.
export function RiverPage() {
  const me = useCurrentUser()
  const viewer = me.data?.data
  const viewerRecognized = !me.isLoading && Boolean(viewer)
  const viewerBusinessId = viewer?.businessId

  const [following, setFollowing] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const queryClient = useQueryClient()

  const feed = useRiverFeed({ following: viewerRecognized && following })
  const items = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data])
  const latestPublishedAt = items[0]?.publishedAt ?? null
  const rows = useMemo(() => buildFeedRows(items, viewerBusinessId), [items, viewerBusinessId])

  const poll = useRiverFeedPoll({
    after: latestPublishedAt,
    following: viewerRecognized && following,
  })
  const pendingCount = poll.data?.items.length ?? 0

  function insertNewPosts() {
    const newItems = poll.data?.items
    if (!newItems?.length) return
    // Once this runs, `items[0]` changes on the next render, which gives useRiverFeedPoll a
    // brand-new `after` value and therefore a brand-new (empty, un-fetched) query — the banner
    // disappears on its own with no need to separately clear the old poll query's cache.
    queryClient.setQueryData(
      ['riverFeed', { following: viewerRecognized && following }],
      (data: typeof feed.data) => {
        if (!data || data.pages.length === 0) return data
        const [first, ...rest] = data.pages
        const firstPage = first as (typeof data.pages)[number]
        return {
          ...data,
          pages: [{ ...firstPage, items: [...newItems, ...firstPage.items] }, ...rest],
        }
      },
    )
  }

  const showSkeletons = feed.isPending

  return (
    <div className="mx-auto max-w-[590px]">
      {/* This whole header block (title/tabs/compose bar/banner) is its own snap point at the
          top of the document — without it, scroll position 0 has no snap point of its own (the
          first one belongs to the first stage post further down), so `proximity` snapping pulls
          any small scroll near the top straight past this chrome and down to that post. Found
          live: it broke a scripted click on "Share an update" the same way it would a real
          visitor's first scroll. snap-start here just means "0 already satisfies alignment," so
          normal scrolling away from the top is unaffected. */}
      <div className="snap-start">
        <PageHeader variant="list">
          {viewerRecognized ? (
            <div className="flex gap-2 border-b border-border pb-3">
              <button
                type="button"
                onClick={() => setFollowing(false)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  !following
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Latest
              </button>
              <button
                type="button"
                onClick={() => setFollowing(true)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  following
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Following
              </button>
            </div>
          ) : null}
        </PageHeader>

        {/* One destination-feeling entry point into the composer, not a bare "Post to River"
          button off in the header actions — see the design critique's "give River a page-level
          header" note. Per-type shortcut buttons (Photo/Video/Page/Ad) were floated in that note
          too; skipped here since that's new interaction surface, not layout/spacing/typography,
          and RiverComposerModal already offers all three modes the moment it opens. */}
        {viewerRecognized ? (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="mb-6 mt-4 flex w-full items-center gap-3 rounded-full border border-border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <PenLine size={16} className="shrink-0" />
            Share an update…
          </button>
        ) : (
          <div className="mb-6 mt-4" />
        )}

        {pendingCount > 0 ? (
          <button
            type="button"
            onClick={insertNewPosts}
            className="mb-6 w-full rounded-full border border-primary/30 bg-primary/10 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            ↑ {pendingCount} new post{pendingCount === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>

      {showSkeletons ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Waves}
          title={following ? 'No posts from businesses you follow yet' : 'No posts yet'}
          description={
            viewerRecognized
              ? 'Be the first to share something.'
              : 'Check back soon, or sign in to post.'
          }
        />
      ) : (
        <VirtualInfiniteList
          items={rows}
          hasNextPage={!!feed.hasNextPage}
          isFetchingNextPage={feed.isFetchingNextPage}
          fetchNextPage={feed.fetchNextPage}
          estimateSize={typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.85) : 700}
          gap={0}
          renderItem={(row) =>
            row.kind === 'post' ? (
              <RiverFeedCard item={row.item} viewerBusinessId={viewerBusinessId} variant="stage" />
            ) : (
              <RiverDiscoveryModule businesses={row.businesses} />
            )
          }
        />
      )}

      {viewerRecognized ? (
        <RiverComposerModal isOpen={composerOpen} onClose={() => setComposerOpen(false)} />
      ) : null}
    </div>
  )
}
