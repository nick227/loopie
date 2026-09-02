import { RiverPostService } from '../services/RiverPostService'
import { RiverFollowService } from '../services/RiverFollowService'
import { RiverFeedService, toRiverFeedItem } from '../services/RiverFeedService'
import { RiverCommentService } from '../services/RiverCommentService'
import { renderRiverFeed, renderRiverPost } from '../lib/renderRiver'
import { publicBusinessProfileUrl, riverPostUrl, riverViewerUrl, hostedPageUrl } from '../lib/urls'
import { resolveOptionalViewer } from '../lib/riverViewer'

const riverPosts = new RiverPostService()
const riverFollows = new RiverFollowService()
const riverFeed = new RiverFeedService()
const riverComments = new RiverCommentService()

// ---------- Authenticated ----------

export async function listRiverPosts(request: any, reply: any) {
  const data = await riverPosts.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createRiverPost(request: any, reply: any) {
  const post = await riverPosts.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: post })
}

export async function deleteRiverPost(request: any, reply: any) {
  await riverPosts.delete(request.user.businessId, request.params.riverPostId)
  return reply.send({ data: null })
}

// Content negotiation, not two endpoints: the rendered page's plain <form method="post"> never
// sends `Accept: application/json` (browsers only send that for a real fetch/XHR call), so it
// keeps getting the redirect unchanged; the authenticated SPA's River page explicitly sets that
// header on these same operations and gets a JSON body instead. Same service call either way —
// see the slice's plan doc ("Move River into the main Loopie app shell").
function wantsJson(request: any): boolean {
  return Boolean(request.headers.accept?.includes('application/json'))
}

export async function reactToRiverPost(request: any, reply: any) {
  const { riverPostId } = request.params
  await riverPosts.react(riverPostId, request.user.businessId)
  if (wantsJson(request)) {
    const reactionCount = await riverPosts.reactionCount(riverPostId)
    return reply.send({ data: { riverPostId, reacted: true, reactionCount } })
  }
  return reply.redirect(302, request.query.returnTo ?? riverPostUrl(riverPostId))
}

export async function unreactToRiverPost(request: any, reply: any) {
  const { riverPostId } = request.params
  await riverPosts.unreact(riverPostId, request.user.businessId)
  if (wantsJson(request)) {
    const reactionCount = await riverPosts.reactionCount(riverPostId)
    return reply.send({ data: { riverPostId, reacted: false, reactionCount } })
  }
  return reply.redirect(302, request.query.returnTo ?? riverPostUrl(riverPostId))
}

export async function followRiverBusiness(request: any, reply: any) {
  const { businessId } = request.params
  await riverFollows.follow(request.user.businessId, businessId)
  if (wantsJson(request)) {
    return reply.send({ data: { businessId, following: true } })
  }
  return reply.redirect(302, request.query.returnTo ?? riverViewerUrl())
}

export async function unfollowRiverBusiness(request: any, reply: any) {
  const { businessId } = request.params
  await riverFollows.unfollow(request.user.businessId, businessId)
  if (wantsJson(request)) {
    return reply.send({ data: { businessId, following: false } })
  }
  return reply.redirect(302, request.query.returnTo ?? riverViewerUrl())
}

// Fallback is the caller's own public profile (not the generic River feed root, unlike
// follow/unfollow) — pinning only ever makes sense in the context of "my own profile," so that's
// the correct default when the rendered page didn't supply a returnTo. request.user.business is
// already loaded (bearerAuth's session query includes it), so no extra lookup is needed.
function ownProfileFallbackUrl(request: any): string {
  const slug = request.user.business?.slug
  return slug ? publicBusinessProfileUrl(slug) : riverViewerUrl()
}

export async function pinRiverPost(request: any, reply: any) {
  const { riverPostId } = request.params
  await riverPosts.pin(riverPostId, request.user.businessId)
  if (wantsJson(request)) {
    return reply.send({ data: { riverPostId, pinned: true } })
  }
  return reply.redirect(302, request.query.returnTo ?? ownProfileFallbackUrl(request))
}

export async function unpinRiverPost(request: any, reply: any) {
  const { riverPostId } = request.params
  await riverPosts.unpin(riverPostId, request.user.businessId)
  if (wantsJson(request)) {
    return reply.send({ data: { riverPostId, pinned: false } })
  }
  return reply.redirect(302, request.query.returnTo ?? ownProfileFallbackUrl(request))
}

// ---------- Public ----------

function isTruthyQueryFlag(value: unknown) {
  return value === true || value === 'true' || value === '1'
}

export async function serveRiverFeed(request: any, reply: any) {
  const viewer = await resolveOptionalViewer(request)
  const following = isTruthyQueryFlag(request.query.following)
  const { cards, nextCursor } = await riverFeed.assembleFeed({
    cursor: request.query.cursor,
    viewerBusinessId: viewer?.businessId,
    following,
  })
  return reply.type('text/html').send(
    renderRiverFeed(cards, nextCursor, {
      currentUrl: request.url,
      following,
      viewerRecognized: viewer !== null,
      viewerBusinessId: viewer?.businessId,
      viewerSlug: viewer?.businessSlug,
    }),
  )
}

export async function getRiverFeed(request: any, reply: any) {
  const viewer = await resolveOptionalViewer(request)
  const scopeBusinessId: string | undefined = request.query.business || undefined
  const excludePostId: string | undefined = request.query.exclude || undefined

  if (request.query.after) {
    const data = scopeBusinessId
      ? await riverFeed.listSince(
          request.query.after,
          viewer?.businessId,
          scopeBusinessId,
          excludePostId,
        )
      : await riverFeed.listSince(request.query.after, viewer?.businessId)
    return reply.send(data)
  }

  if (scopeBusinessId) {
    const data = await riverFeed.listForBusiness(scopeBusinessId, {
      cursor: request.query.cursor,
      limit: request.query.limit,
      viewerBusinessId: viewer?.businessId,
      excludePostId,
    })
    return reply.send(data)
  }

  const following = isTruthyQueryFlag(request.query.following)
  const data = await riverFeed.listFeedItems({
    cursor: request.query.cursor,
    limit: request.query.limit,
    viewerBusinessId: viewer?.businessId,
    following,
  })
  return reply.send(data)
}

export async function serveRiverPost(request: any, reply: any) {
  const viewer = await resolveOptionalViewer(request)
  const card = await riverPosts.getForRender(request.params.riverPostId, viewer?.businessId)
  await riverPosts.recordEngagement(request.params.riverPostId, 'IMPRESSION')
  if (wantsJson(request)) {
    return reply.send({ data: { post: toRiverFeedItem(card) } })
  }
  return reply
    .type('text/html')
    .send(renderRiverPost(card, { currentUrl: request.url, viewerSlug: viewer?.businessSlug }))
}

// ---------- Comments ----------
// Public read (same as the feed itself), authenticated write — not owner-restricted, any
// authenticated business can comment on any post, same as reacting. See RiverCommentService for
// the one-level-nesting rule.

export async function listRiverComments(request: any, reply: any) {
  const data = await riverComments.list(request.params.riverPostId, request.query)
  return reply.send(data)
}

export async function createRiverComment(request: any, reply: any) {
  const data = await riverComments.create(
    request.params.riverPostId,
    request.user.businessId,
    request.body,
  )
  return reply.status(201).send({ data })
}

export async function deleteRiverComment(request: any, reply: any) {
  await riverComments.delete(request.params.commentId, request.user.businessId)
  return reply.send({ data: null })
}

// Slice 6 — one endpoint, one CLICK event, regardless of which of a post's several possible
// destinations actually fired: an explicit CTA takes precedence (the business chose it
// deliberately), then an AD's own destination, then a shared PAGE's hosted URL, then a plain
// linkUrl. Same "one tracked-click mechanism for every clickable thing on a post" the slice-6
// plan doc asked for.
function resolveClickDestination(row: {
  ctaUrl: string | null
  linkUrl: string | null
  type: string
  publishedAdvertisementVersion: { destinationUrl: string | null; clickBehavior: string } | null
  landingPage: { slug: string } | null
}): string | null {
  if (row.ctaUrl) return row.ctaUrl
  if (
    row.publishedAdvertisementVersion?.destinationUrl &&
    row.publishedAdvertisementVersion.clickBehavior !== 'NONE'
  ) {
    return row.publishedAdvertisementVersion.destinationUrl
  }
  if (row.type === 'PAGE' && row.landingPage?.slug) return hostedPageUrl(row.landingPage.slug)
  if (row.linkUrl) return row.linkUrl
  return null
}

export async function trackRiverClick(request: any, reply: any) {
  const row = await riverPosts.getForRedirect(request.params.riverPostId)
  const destinationUrl = resolveClickDestination(row)
  if (!destinationUrl) {
    throw { statusCode: 404, message: 'This post has no click-through destination' }
  }
  await riverPosts.recordEngagement(row.id, 'CLICK')
  return reply.header('Cache-Control', 'no-store').redirect(302, destinationUrl)
}

export async function trackRiverProfileVisit(request: any, reply: any) {
  const row = await riverPosts.getForRedirect(request.params.riverPostId)
  if (!row.business?.slug) {
    throw { statusCode: 404, message: 'This business has no public profile yet' }
  }
  await riverPosts.recordEngagement(row.id, 'PROFILE_VISIT')
  return reply
    .header('Cache-Control', 'no-store')
    .redirect(302, publicBusinessProfileUrl(row.business.slug))
}
