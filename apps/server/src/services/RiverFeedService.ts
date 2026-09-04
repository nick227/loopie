import { db } from '@project/db'
import type { AdCreativeInput } from '@project/ad-renderer'
import {
  RiverPostService,
  toFeedCards,
  FEED_INCLUDE,
  type FeedRow,
  type RiverFeedCard,
} from './RiverPostService'
import { riverPostClickUrl } from '../lib/urls'

const riverPosts = new RiverPostService()

// Deterministic, not personalized — see the River feed v2 plan doc's explicit "not ranking
// algorithms" scope call. Fixed constants, not knobs: the user's own spec gave a 6-10 range and
// this picks the middle rather than adding a config surface nothing yet needs.
const SPONSORED_CADENCE = 7
const SPONSORED_POOL_SIZE = 20
const ANTI_REPEAT_STREAK_LIMIT = 4
const POLL_BATCH_SIZE = 20

// The canonical public shape from the plan doc — deliberately flatter than RiverFeedCard (no
// isOwnPost/viewerFollowsBusiness-as-separate-field — those are HTML-render-only concerns).
// headline is omitted entirely for now: no current source produces one (TEXT/AD/PAGE posts only
// ever have `body`) — it becomes real once system-generated activity types land later.
export type RiverFeedItem = {
  id: string
  type: 'TEXT' | 'AD' | 'PAGE' | 'SPONSORED'
  business: { id: string; name: string; slug: string | null; logoUrl: string | null }
  publishedAt: string
  body?: string
  // A native post's image gallery is 1+ IMAGE entries; a video is one VIDEO entry, listed first
  // when both are set — the composer allows picking images and a video together, so both must
  // appear here rather than one silently dropping the other. An AD's own creative is still one
  // IMAGE entry, unchanged from before.
  media?: { type: 'IMAGE' | 'VIDEO'; url: string }[]
  linkPreview?: {
    url: string
    title: string | null
    description: string | null
    imageUrl: string | null
  }
  cta?: { label: string; url: string }
  // The one tracked click-through, whatever it resolves to server-side (CTA, AD destination, a
  // shared PAGE's hosted url, or a plain link) — see handlers/river.ts#resolveClickDestination.
  clickUrl?: string
  pageInfo?: { name: string; slug: string }
  // Ad Designer (2026-09-03) — see RiverPostService.RiverFeedCard's own doc comment.
  adCreative?: AdCreativeInput
  metrics: { reactions: number; comments: number }
  viewer?: { reacted: boolean; following: boolean }
}

// Exported so the business-profile JSON response can convert its own pinned/"Featured" post
// lookup (a RiverFeedCard, from RiverPostService#getForRender) into the same canonical shape the
// SPA's RiverFeedCard component already renders everywhere else — see
// lib/renderBusinessProfile.ts#getBusinessProfileJson.
export function toRiverFeedItem(card: RiverFeedCard): RiverFeedItem {
  const mediaEntries: NonNullable<RiverFeedItem['media']> = []
  if (card.videoUrl) mediaEntries.push({ type: 'VIDEO', url: card.videoUrl })
  for (const url of card.imageUrls) mediaEntries.push({ type: 'IMAGE', url })
  const media = mediaEntries.length ? mediaEntries : undefined

  return {
    id: card.id,
    type: card.sponsored ? 'SPONSORED' : card.type,
    business: {
      id: card.business.id,
      name: card.business.name,
      slug: card.business.slug,
      logoUrl: card.business.logoUrl,
    },
    publishedAt: card.createdAt.toISOString(),
    body: card.body || undefined,
    media,
    linkPreview: card.linkPreview ?? undefined,
    cta: card.cta ?? undefined,
    clickUrl: card.hasClickThrough ? riverPostClickUrl(card.id) : undefined,
    pageInfo: card.pageInfo ?? undefined,
    // The creative's own fragment renders its own <a href> (see RiverFeedCard.tsx) — point it at
    // River's tracked click redirect, same as every other River click, not the raw destination.
    adCreative: card.adCreative
      ? { ...card.adCreative, clickUrl: card.hasClickThrough ? riverPostClickUrl(card.id) : null }
      : undefined,
    metrics: { reactions: card.reactionCount, comments: card.commentCount },
    viewer:
      card.viewerHasReacted !== null
        ? { reacted: card.viewerHasReacted, following: card.viewerFollowsBusiness ?? false }
        : undefined,
  }
}

// Best-effort, presentation-only reorder — never moves the last row (that row's createdAt/id is
// the cursor boundary for the next page; reordering it would desync pagination). Not a hard
// guarantee under pathological data (e.g. one business posting 20 times in a row with nothing
// else in the window) — matches the user's own "maybe one tiny secondary rule" framing.
function applyAntiRepeat(rows: FeedRow[]): FeedRow[] {
  const result = [...rows]
  const lastIndex = result.length - 1
  let streakBusinessId: string | null = null
  let streakLen = 0
  for (let i = 0; i < lastIndex; i++) {
    let row = result[i]!
    // Intervene BEFORE placing the item that would complete the streak, not after — swapping in
    // a substitute once 4-in-a-row already exists is too late.
    if (row.businessId === streakBusinessId && streakLen + 1 >= ANTI_REPEAT_STREAK_LIMIT) {
      const swapIndex = result.findIndex(
        (candidate, idx) => idx > i && idx < lastIndex && candidate.businessId !== streakBusinessId,
      )
      if (swapIndex !== -1) {
        const [swapped] = result.splice(swapIndex, 1)
        result.splice(i, 0, swapped!)
        row = swapped!
      }
      // swapIndex === -1: can't fix without touching the boundary row — let the streak continue.
    }
    if (row.businessId === streakBusinessId) {
      streakLen++
    } else {
      streakBusinessId = row.businessId
      streakLen = 1
    }
  }
  return result
}

export class RiverFeedService {
  // The one place GET /river (HTML) and GET /river/feed (JSON) both call — same fetch, same
  // reorder, same sponsored injection, so the two surfaces are provably the same data.
  async assembleFeed(opts: {
    cursor?: string
    limit?: number
    viewerBusinessId?: string
    following?: boolean
  }): Promise<{ cards: RiverFeedCard[]; nextCursor: string | null }> {
    const { items: rawItems, nextCursor } = await riverPosts.fetchPage(opts)
    const reordered = applyAntiRepeat(rawItems)
    const organicCards = await toFeedCards(reordered, opts.viewerBusinessId)

    const sponsoredCards = await this.pickSponsoredPool(
      rawItems.map((row) => row.id),
      opts.viewerBusinessId,
    )

    if (!sponsoredCards.length) return { cards: organicCards, nextCursor }

    // Additive: sponsored items are spliced in, not swapped for an organic one — a page can
    // return more than `limit` items. nextCursor is untouched (derived above from the organic
    // page's own last row before injection), since a sponsored insertion is a duplicate pulled
    // from elsewhere in time, not a new pagination frontier.
    const assembled: RiverFeedCard[] = []
    let sponsoredIndex = 0
    organicCards.forEach((card, i) => {
      assembled.push(card)
      if ((i + 1) % SPONSORED_CADENCE === 0) {
        assembled.push({
          ...sponsoredCards[sponsoredIndex % sponsoredCards.length]!,
          sponsored: true,
        })
        sponsoredIndex++
      }
    })
    return { cards: assembled, nextCursor }
  }

  private async pickSponsoredPool(excludeIds: string[], viewerBusinessId?: string) {
    const rows = await db.riverPost.findMany({
      where: {
        type: 'AD',
        deletedAt: null,
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: SPONSORED_POOL_SIZE,
      include: FEED_INCLUDE,
    })
    return rows.length ? toFeedCards(rows, viewerBusinessId) : []
  }

  async listFeedItems(opts: {
    cursor?: string
    limit?: number
    viewerBusinessId?: string
    following?: boolean
  }): Promise<{ items: RiverFeedItem[]; nextCursor: string | null; generatedAt: string }> {
    const { cards, nextCursor } = await this.assembleFeed(opts)
    return { items: cards.map(toRiverFeedItem), nextCursor, generatedAt: new Date().toISOString() }
  }

  // Slice 4 — the profile page's "Latest from this business" section (and its own paged
  // continuation via the client script's scopeBusinessId). No sponsored injection, no anti-repeat
  // — both are meaningless once every item already belongs to the same one business. Rich-card
  // shape (mirrors assembleFeed) — renderBusinessProfile.ts's HTML render calls this directly;
  // listForBusiness below is the same thing flattened to RiverFeedItem for the JSON API.
  async assembleForBusiness(
    businessId: string,
    opts: { cursor?: string; limit?: number; viewerBusinessId?: string; excludePostId?: string },
  ): Promise<{ cards: RiverFeedCard[]; nextCursor: string | null }> {
    const { items: rows, nextCursor } = await riverPosts.fetchPage({
      ...opts,
      businessId,
      excludeIds: opts.excludePostId ? [opts.excludePostId] : undefined,
    })
    const cards = await toFeedCards(rows, opts.viewerBusinessId)
    return { cards, nextCursor }
  }

  async listForBusiness(
    businessId: string,
    opts: { cursor?: string; limit?: number; viewerBusinessId?: string; excludePostId?: string },
  ): Promise<{ items: RiverFeedItem[]; nextCursor: string | null; generatedAt: string }> {
    const { cards, nextCursor } = await this.assembleForBusiness(businessId, opts)
    return { items: cards.map(toRiverFeedItem), nextCursor, generatedAt: new Date().toISOString() }
  }

  // Polling mode ("N new posts since X") — a small, unassembled preview, not a full page: no
  // sponsored injection, no anti-repeat, just "what's newer than the last thing you saw."
  // businessId scopes it to one business's own posts (the profile page's embedded feed polling).
  async listSince(
    after: string,
    viewerBusinessId?: string,
    businessId?: string,
    excludePostId?: string,
  ): Promise<{ items: RiverFeedItem[]; nextCursor: null; generatedAt: string }> {
    const afterDate = new Date(after)
    if (Number.isNaN(afterDate.getTime())) {
      throw { statusCode: 400, message: 'after must be a valid ISO timestamp' }
    }
    const rows = await db.riverPost.findMany({
      where: {
        deletedAt: null,
        createdAt: { gt: afterDate },
        ...(businessId ? { businessId } : {}),
        ...(excludePostId ? { id: { not: excludePostId } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: POLL_BATCH_SIZE,
      include: FEED_INCLUDE,
    })
    const cards = await toFeedCards(rows, viewerBusinessId)
    return {
      items: cards.map(toRiverFeedItem),
      nextCursor: null,
      generatedAt: new Date().toISOString(),
    }
  }
}
