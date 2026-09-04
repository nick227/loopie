import { db, absoluteMediaUrl } from '@project/db'
import type { Prisma } from '@prisma/client'
import type { AdCreativeInput } from '@project/ad-renderer'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { riverPostUrl, PUBLIC_SERVER_URL, hostedPageUrl } from '../lib/urls'
import { requireAssets } from '../lib/ownership'
import { fetchLinkPreview } from '../lib/linkPreview'

const OWNER_INCLUDE = {
  advertisement: { select: { id: true, name: true } },
  publishedAdvertisementVersion: true,
  landingPage: { select: { id: true, name: true, slug: true } },
  _count: { select: { reactions: true, comments: { where: { deletedAt: null } } } },
} as const

type OwnerRow = Prisma.RiverPostGetPayload<{ include: typeof OWNER_INCLUDE }>

function toRiverPostDTO(row: OwnerRow) {
  return {
    id: row.id,
    businessId: row.businessId,
    type: row.type,
    body: row.body,
    advertisementId: row.advertisementId,
    publishedAdvertisementVersionId: row.publishedAdvertisementVersionId,
    landingPageId: row.landingPageId,
    publishedPageVersionId: row.publishedPageVersionId,
    imageAssetIds: (row.imageAssetIds as unknown as string[] | null) ?? [],
    videoAssetId: row.videoAssetId,
    linkUrl: row.linkUrl,
    linkPreviewTitle: row.linkPreviewTitle,
    linkPreviewDescription: row.linkPreviewDescription,
    linkPreviewImageUrl: row.linkPreviewImageUrl,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    permalinkUrl: riverPostUrl(row.id),
    reactionCount: row._count.reactions,
    commentCount: row._count.comments,
  }
}

// A render-ready feed/permalink card. Distinct from toRiverPostDTO's JSON API shape — this one
// resolves every asset reference (the ad's creative image, a native post's own gallery/video) to
// a real absolute URL directly, rather than depending on the embed server's own still-stubbed
// "AD CONTENT" placeholder.
export type RiverFeedCard = {
  id: string
  type: 'TEXT' | 'AD' | 'PAGE'
  body: string
  createdAt: Date
  business: { id: string; name: string; slug: string | null; logoUrl: string | null }
  // Slice 6 — plural/ordered (was a single imageUrl): an AD post still only ever has one (its
  // creative), a native TEXT post can have several (the composer's gallery picker).
  imageUrls: string[]
  videoUrl: string | null
  linkPreview: {
    url: string
    title: string | null
    description: string | null
    imageUrl: string | null
  } | null
  cta: { label: string; url: string } | null
  // type=PAGE only — the shared page's own name/description text (no fabricated thumbnail, see
  // the slice-6 plan doc's confirmed decision).
  pageInfo: { name: string; slug: string } | null
  // Ad Designer (2026-09-03) — present only for type=AD when the pinned PublishedAdvertisementVersion
  // has a format (was made with Ad Designer, not a pre-existing generic ad). RiverFeedCard.tsx
  // renders this through @project/ad-renderer's renderAdCreativeFragment, the same function every
  // other surface calls — see CLAUDE.md's Ad Designer entry. Null falls back to the generic
  // imageUrls/cta rendering above, unchanged.
  adCreative: AdCreativeInput | null
  // True when trackRiverClick has *any* destination to resolve for this post (cta > AD
  // destination > PAGE hosted url > linkUrl) — see handlers/river.ts#trackRiverClick.
  hasClickThrough: boolean
  reactionCount: number
  commentCount: number
  // null = no viewer resolved (anonymous request) — render nothing interactive. false/true = a
  // real viewer, render the live form. See lib/riverViewer.ts and the slice-2 plan doc.
  viewerHasReacted: boolean | null
  viewerFollowsBusiness: boolean | null
  isOwnPost: boolean
  // Set only by RiverFeedService's sponsored-insertion pass — always false from toFeedCards
  // itself. A presentation-time label; the underlying RiverPost.type stays 'AD' in the DB.
  sponsored: boolean
}

// Shared include shape for any query whose rows will be hydrated by toFeedCards — the sponsored
// pool query in RiverFeedService uses this exact same shape, so both paths hydrate identically.
export const FEED_INCLUDE = {
  business: { select: { id: true, name: true, slug: true, logoUrl: true } },
  publishedAdvertisementVersion: true,
  landingPage: { select: { id: true, name: true, slug: true } },
  _count: { select: { reactions: true, comments: { where: { deletedAt: null } } } },
} as const

export type FeedRow = Prisma.RiverPostGetPayload<{ include: typeof FEED_INCLUDE }>

export async function toFeedCards(
  rows: FeedRow[],
  viewerBusinessId?: string,
): Promise<RiverFeedCard[]> {
  // One batched lookup for every image/video asset referenced across the whole page — the AD
  // creative's first image, plus every native post's own imageAssetIds/videoAssetId.
  const assetIds = new Set<string>()
  for (const row of rows) {
    const adAssets = row.publishedAdvertisementVersion?.assetIds as unknown as string[] | null
    if (adAssets?.length) assetIds.add(adAssets[0] as string)
    const imageIds = row.imageAssetIds as unknown as string[] | null
    for (const id of imageIds ?? []) assetIds.add(id)
    if (row.videoAssetId) assetIds.add(row.videoAssetId)
  }
  const assets = assetIds.size
    ? await db.asset.findMany({ where: { id: { in: [...assetIds] } } })
    : []
  const assetById = new Map(assets.map((asset) => [asset.id, asset]))

  // Two batched queries for the whole page, not N+1 — see the slice-2 plan doc.
  let reactedPostIds = new Set<string>()
  let followedBusinessIds = new Set<string>()
  if (viewerBusinessId) {
    const postIds = rows.map((row) => row.id)
    const businessIds = [...new Set(rows.map((row) => row.business.id))]
    const [reactions, follows] = await Promise.all([
      postIds.length
        ? db.riverReaction.findMany({
            where: { riverPostId: { in: postIds }, actorBusinessId: viewerBusinessId },
            select: { riverPostId: true },
          })
        : [],
      businessIds.length
        ? db.riverFollow.findMany({
            where: {
              followedBusinessId: { in: businessIds },
              followerBusinessId: viewerBusinessId,
            },
            select: { followedBusinessId: true },
          })
        : [],
    ])
    reactedPostIds = new Set(reactions.map((r) => r.riverPostId))
    followedBusinessIds = new Set(follows.map((f) => f.followedBusinessId))
  }

  function resolveUrl(assetId: string | null | undefined): string | null {
    if (!assetId) return null
    const asset = assetById.get(assetId)
    return asset ? absoluteMediaUrl(asset.url, PUBLIC_SERVER_URL) : null
  }

  return rows.map((row) => {
    const version = row.publishedAdvertisementVersion
    const adImageUrl =
      row.type === 'AD' ? resolveUrl((version?.assetIds as unknown as string[] | null)?.[0]) : null
    const nativeImageUrls =
      row.type === 'TEXT'
        ? ((row.imageAssetIds as unknown as string[] | null) ?? [])
            .map((id) => resolveUrl(id))
            .filter((url): url is string => Boolean(url))
        : []
    const videoUrl = row.type === 'TEXT' ? resolveUrl(row.videoAssetId) : null

    const linkPreview = row.linkUrl
      ? {
          url: row.linkUrl,
          title: row.linkPreviewTitle,
          description: row.linkPreviewDescription,
          imageUrl: row.linkPreviewImageUrl,
        }
      : null
    // A shared advertisement owns its CTA in the pinned published version. River-level CTA
    // fields are an explicit per-post override; without one, keep the exact label and target the
    // user published with the ad instead of making the client invent a generic "Learn more".
    const versionSnapshot = version?.creativeSnapshot as {
      primaryText?: string | null
      ctaLabel?: string | null
      destinationUrl?: string | null
      headline?: string | null
      accessibleLabel?: string | null
      textPlacement?: AdCreativeInput['textPlacement']
      fontScale?: AdCreativeInput['fontScale']
      textAlign?: AdCreativeInput['textAlign']
      overlay?: AdCreativeInput['overlay']
      ctaPlacement?: AdCreativeInput['ctaPlacement']
      mediaFocal?: AdCreativeInput['mediaFocal']
    } | null
    const postCta = row.ctaLabel && row.ctaUrl ? { label: row.ctaLabel, url: row.ctaUrl } : null
    const advertisementCta =
      row.type === 'AD' && versionSnapshot?.ctaLabel && version?.destinationUrl
        ? { label: versionSnapshot.ctaLabel, url: version.destinationUrl }
        : null
    const cta = postCta ?? advertisementCta
    const body = row.body || (row.type === 'AD' ? (versionSnapshot?.primaryText ?? '') : row.body)
    const pageInfo =
      row.type === 'PAGE' && row.landingPage
        ? { name: row.landingPage.name, slug: row.landingPage.slug }
        : null

    const hasClickThrough = Boolean(
      cta ||
      (version?.destinationUrl && version.clickBehavior !== 'NONE') ||
      row.type === 'PAGE' ||
      row.linkUrl,
    )

    const adCreative: AdCreativeInput | null =
      row.type === 'AD' && version?.format
        ? {
            format: version.format as AdCreativeInput['format'],
            headline: versionSnapshot?.headline ?? null,
            primaryText: versionSnapshot?.primaryText ?? null,
            ctaLabel: versionSnapshot?.ctaLabel ?? null,
            mediaUrl: adImageUrl,
            mediaAlt: versionSnapshot?.headline ?? null,
            clickUrl: version.destinationUrl ?? null,
            accessibleLabel: versionSnapshot?.accessibleLabel ?? null,
            textPlacement: versionSnapshot?.textPlacement,
            fontScale: versionSnapshot?.fontScale,
            textAlign: versionSnapshot?.textAlign,
            overlay: versionSnapshot?.overlay,
            ctaPlacement: versionSnapshot?.ctaPlacement,
            mediaFocal: versionSnapshot?.mediaFocal,
          }
        : null

    return {
      id: row.id,
      type: row.type,
      body,
      createdAt: row.createdAt,
      // A raw Prisma logoUrl is a relative path (/uploads/...) — resolved everywhere else this
      // card touches media (imageUrls/videoUrl/linkPreview.imageUrl below), but this one was
      // passed straight through. Worked by accident on the hand-rolled same-origin /river page;
      // broke for real once the SPA (a different origin) started rendering these cards — see the
      // "River design critique" pass.
      business: {
        ...row.business,
        logoUrl: row.business.logoUrl
          ? absoluteMediaUrl(row.business.logoUrl, PUBLIC_SERVER_URL)
          : null,
      },
      imageUrls: adImageUrl ? [adImageUrl] : nativeImageUrls,
      videoUrl,
      linkPreview,
      cta,
      pageInfo,
      adCreative,
      hasClickThrough,
      reactionCount: row._count.reactions,
      commentCount: row._count.comments,
      viewerHasReacted: viewerBusinessId ? reactedPostIds.has(row.id) : null,
      viewerFollowsBusiness: viewerBusinessId ? followedBusinessIds.has(row.business.id) : null,
      isOwnPost: viewerBusinessId === row.business.id,
      sponsored: false,
    }
  })
}

export class RiverPostService {
  async create(
    businessId: string,
    data: {
      type: 'TEXT' | 'AD' | 'PAGE'
      body?: string
      advertisementId?: string
      landingPageId?: string
      // Slice 6 — universal optional composer fields. imageAssetIds/videoAssetId are TEXT-only
      // (see the slice-6 plan doc's confirmed "share = source object's own visual" rule).
      imageAssetIds?: string[]
      videoAssetId?: string
      linkUrl?: string
      ctaLabel?: string
      ctaUrl?: string
    },
  ) {
    const body = data.body?.trim() ?? ''

    if (Boolean(data.ctaLabel) !== Boolean(data.ctaUrl)) {
      throw { statusCode: 400, message: 'ctaLabel and ctaUrl must be set together' }
    }
    if ((data.imageAssetIds?.length || data.videoAssetId) && data.type !== 'TEXT') {
      throw {
        statusCode: 400,
        message: 'imageAssetIds/videoAssetId are only allowed for a TEXT post',
      }
    }
    // One media type at a time, matching the composer's own attach UX (RiverComposerModal's
    // "Add Media" — picking a video clears any images and vice versa) and the card's rendering
    // geometry (RiverPostMedia renders either a photo/grid or a video, never both together).
    if (data.imageAssetIds?.length && data.videoAssetId) {
      throw { statusCode: 400, message: 'A post can include images or a video, not both' }
    }
    if (data.imageAssetIds?.length) await requireAssets(businessId, data.imageAssetIds)
    if (data.videoAssetId) await requireAssets(businessId, [data.videoAssetId])

    let linkUrl: string | undefined
    let linkPreview: Awaited<ReturnType<typeof fetchLinkPreview>> = null
    if (data.linkUrl) {
      try {
        linkUrl = new URL(data.linkUrl).toString()
      } catch {
        throw { statusCode: 400, message: 'linkUrl must be a valid URL' }
      }
      linkPreview = await fetchLinkPreview(linkUrl)
    }

    const sharedFields = {
      businessId,
      body,
      imageAssetIds: data.imageAssetIds?.length ? data.imageAssetIds : undefined,
      videoAssetId: data.videoAssetId,
      linkUrl,
      linkPreviewTitle: linkPreview?.title ?? undefined,
      linkPreviewDescription: linkPreview?.description ?? undefined,
      linkPreviewImageUrl: linkPreview?.imageUrl ?? undefined,
      ctaLabel: data.ctaLabel,
      ctaUrl: data.ctaUrl,
    }

    if (data.type === 'TEXT') {
      if (data.advertisementId || data.landingPageId) {
        throw {
          statusCode: 400,
          message: 'advertisementId/landingPageId are not allowed for a TEXT post',
        }
      }
      if (!body && !data.imageAssetIds?.length && !data.videoAssetId && !linkUrl) {
        throw {
          statusCode: 400,
          message: 'A post needs at least text, an image, a video, or a link',
        }
      }
      const row = await db.riverPost.create({
        data: { ...sharedFields, type: 'TEXT' },
        include: OWNER_INCLUDE,
      })
      return toRiverPostDTO(row)
    }

    if (data.type === 'AD') {
      if (!data.advertisementId) {
        throw { statusCode: 400, message: 'advertisementId is required for an AD post' }
      }
      const advertisement = await db.advertisement.findFirst({
        where: { id: data.advertisementId, businessId },
      })
      if (!advertisement) throw { statusCode: 404, message: 'Advertisement not found' }

      const publishedVersion = await db.publishedAdvertisementVersion.findFirst({
        where: { advertisementId: advertisement.id, archivedAt: null },
        orderBy: { version: 'desc' },
      })
      if (!publishedVersion) {
        throw {
          statusCode: 400,
          message: 'Advertisement must be published before posting it to River',
        }
      }

      const row = await db.riverPost.create({
        data: {
          ...sharedFields,
          type: 'AD',
          advertisementId: advertisement.id,
          publishedAdvertisementVersionId: publishedVersion.id,
        },
        include: OWNER_INCLUDE,
      })
      return toRiverPostDTO(row)
    }

    // type === 'PAGE'
    if (!data.landingPageId) {
      throw { statusCode: 400, message: 'landingPageId is required for a PAGE post' }
    }
    const landingPage = await db.landingPage.findFirst({
      where: { id: data.landingPageId, businessId, deletedAt: null },
    })
    if (!landingPage) throw { statusCode: 404, message: 'Landing page not found' }
    if (!landingPage.publishedVersionId) {
      throw {
        statusCode: 400,
        message: 'Landing page must be published before sharing it to River',
      }
    }

    const row = await db.riverPost.create({
      data: {
        ...sharedFields,
        type: 'PAGE',
        landingPageId: landingPage.id,
        publishedPageVersionId: landingPage.publishedVersionId,
      },
      include: OWNER_INCLUDE,
    })
    return toRiverPostDTO(row)
  }

  async list(
    businessId: string,
    opts: { cursor?: string; limit?: number; advertisementId?: string },
  ) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: Prisma.RiverPostWhereInput[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const rows = await db.riverPost.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(opts.advertisementId ? { advertisementId: opts.advertisementId } : {}),
        ...(AND.length ? { AND } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: OWNER_INCLUDE,
    })
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toRiverPostDTO), meta: { hasMore, nextCursor } }
  }

  async delete(businessId: string, riverPostId: string) {
    const row = await db.riverPost.findFirst({ where: { id: riverPostId, businessId } })
    if (!row) throw { statusCode: 404, message: 'River post not found' }
    await db.riverPost.update({ where: { id: riverPostId }, data: { deletedAt: new Date() } })
  }

  // ---------- Public rendering + engagement ----------

  // The raw-row half of the old feed() — returns unhydrated FeedRow[] (no toFeedCards call) so
  // RiverFeedService can reorder/inject before hydrating. hasMore/nextCursor are computed here
  // since they only depend on the raw page, not on hydration.
  async fetchPage(opts: {
    cursor?: string
    limit?: number
    following?: boolean
    viewerBusinessId?: string
    // Slice 4 — a business-scoped feed (the profile page's "Latest from this business"). Mutually
    // exclusive with `following` in practice (RiverFeedService#listForBusiness never sets both),
    // but not cross-validated here since a combination is simply "posts from this business that
    // the viewer follows," which is a coherent (if currently unused) filter, not an error.
    businessId?: string
    // Slice 4 — excludes the business's own pinned/featured post from the regular list, so it
    // never appears twice on the profile page (once in the Featured section, once here).
    excludeIds?: string[]
  }): Promise<{ items: FeedRow[]; nextCursor: string | null }> {
    if (opts.following && !opts.viewerBusinessId) {
      throw { statusCode: 400, message: 'The following feed requires a recognized viewer' }
    }
    const limit = normalizeLimit(opts.limit, 50, 20)
    const cursor = decodeCursor(opts.cursor)
    const AND: Prisma.RiverPostWhereInput[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const where: Prisma.RiverPostWhereInput = {
      deletedAt: null,
      ...(AND.length ? { AND } : {}),
      ...(opts.businessId ? { businessId: opts.businessId } : {}),
      ...(opts.excludeIds?.length ? { id: { notIn: opts.excludeIds } } : {}),
      ...(opts.following
        ? { business: { riverFollowers: { some: { followerBusinessId: opts.viewerBusinessId } } } }
        : {}),
    }
    const rows = await db.riverPost.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: FEED_INCLUDE,
    })
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { items, nextCursor }
  }

  async getForRender(riverPostId: string, viewerBusinessId?: string) {
    const row = await db.riverPost.findFirst({
      where: { id: riverPostId, deletedAt: null },
      include: FEED_INCLUDE,
    })
    if (!row) throw { statusCode: 404, message: 'River post not found' }
    const [card] = await toFeedCards([row], viewerBusinessId)
    return card as RiverFeedCard
  }

  // Returns the raw row (business.slug, destinationUrl) the redirect handlers need — kept
  // separate from getForRender since a redirect has no use for the rendered card shape.
  async getForRedirect(riverPostId: string) {
    const row = await db.riverPost.findFirst({
      where: { id: riverPostId, deletedAt: null },
      include: {
        business: { select: { slug: true } },
        publishedAdvertisementVersion: true,
        landingPage: { select: { slug: true } },
      },
    })
    if (!row) throw { statusCode: 404, message: 'River post not found' }
    return row
  }

  async recordEngagement(riverPostId: string, type: 'IMPRESSION' | 'CLICK' | 'PROFILE_VISIT') {
    await db.riverEngagementEvent.create({ data: { riverPostId, type } })
  }

  // ---------- Reactions ----------
  // A reaction's row IS the reaction — no separate event-log entry (see the slice-2 plan doc).
  // Idempotent: a duplicate react is a no-op via the unique constraint; an unreact on a
  // never-reacted post is a no-op too — same "acting again just confirms the same end state"
  // discipline as AutomationRun's scheduling idempotency.

  async react(riverPostId: string, actorBusinessId: string) {
    const post = await db.riverPost.findFirst({ where: { id: riverPostId, deletedAt: null } })
    if (!post) throw { statusCode: 404, message: 'River post not found' }
    await db.riverReaction.upsert({
      where: { riverPostId_actorBusinessId: { riverPostId, actorBusinessId } },
      create: { riverPostId, actorBusinessId },
      update: {},
    })
  }

  async unreact(riverPostId: string, actorBusinessId: string) {
    await db.riverReaction.deleteMany({ where: { riverPostId, actorBusinessId } })
  }

  // For the JSON-content-negotiated response — see handlers/river.ts. The redirect-based form
  // response never needed this; react()/unreact() themselves stay void.
  async reactionCount(riverPostId: string): Promise<number> {
    return db.riverReaction.count({ where: { riverPostId } })
  }

  // ---------- Pin (slice 4 — the profile's optional "Featured" section) ----------
  // Singular, not a list: pinning replaces whatever was pinned before (Business.pinnedRiverPostId
  // is one nullable column, not a join table) — matches "optional pinned post."

  async pin(riverPostId: string, businessId: string) {
    const post = await db.riverPost.findFirst({
      where: { id: riverPostId, businessId, deletedAt: null },
    })
    if (!post) throw { statusCode: 404, message: 'River post not found' }
    await db.business.update({
      where: { id: businessId },
      data: { pinnedRiverPostId: riverPostId },
    })
  }

  async unpin(riverPostId: string, businessId: string) {
    await db.business.updateMany({
      where: { id: businessId, pinnedRiverPostId: riverPostId },
      data: { pinnedRiverPostId: null },
    })
  }
}
