import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import { canonicalJson } from '@project/embed-contract'
import {
  resolveAdCreativeDesign,
  type AdCreativeDesign,
  type AdCreativeFormat,
} from '@project/ad-renderer'
import crypto from 'crypto'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { requireAssets } from '../lib/ownership'
import { aspectRatio, matchPlacements } from '../lib/assetSpecs'
import { advertisementSummary } from '../lib/advertisementSummary'
import { hostedPageUrl } from '../lib/urls'

// Ad Designer (2026-09-03) — the design fields on a row are always either "all null" (a
// pre-existing generic ad, or a new ad that hasn't picked a format yet) or "all resolved" (every
// field a concrete enum value, defaulted from FORMAT_DEFAULTS via resolveAdCreativeDesign) — never
// a sparse in-between. This keeps every reader (this service's own DTO/publish, RiverPostService,
// the ad-server embed routes) simple: either branch on `format === null` once, or trust every
// design field is populated.
type DesignPatch = Partial<Omit<AdCreativeDesign, 'format'>>

function designFieldsFrom(design: AdCreativeDesign | null) {
  if (!design) {
    return {
      textPlacement: null,
      fontScale: null,
      textAlign: null,
      overlay: null,
      ctaPlacement: null,
      mediaFocal: null,
    }
  }
  const { format: _format, ...rest } = design
  return rest
}

// Advertisement is the "Media" layer's grouping entity in the Media -> Advertisement -> AdRun
// model (see CLAUDE.md's Media/Advertisement/AdRun migration audit) — its content comes directly
// from Asset via AdvertisementAsset, deliberately bypassing the old per-campaign Creative model.
// Media selection lives here, once, rather than being re-specified on every AdRun: an AdRun
// references its parent Advertisement's already-attached assets when it provisions on a platform.
const INCLUDE = {
  assets: { include: { asset: true } },
  runs: true,
  publishedVersions: { orderBy: { publishedAt: 'desc' }, take: 1 },
} as const

type AdvertisementRow = Prisma.AdvertisementGetPayload<{ include: typeof INCLUDE }>

function toNestedAsset(asset: AdvertisementRow['assets'][number]['asset']) {
  const widthPx = asset.widthPx
  const heightPx = asset.heightPx
  return {
    id: asset.id,
    businessId: asset.businessId,
    type: asset.type,
    name: asset.name,
    url: asset.url,
    textContent: asset.textContent,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    widthPx,
    heightPx,
    durationMs: asset.durationMs,
    aspectRatio: widthPx && heightPx ? aspectRatio(widthPx, heightPx) : null,
    placements: widthPx && heightPx ? matchPlacements(widthPx, heightPx) : [],
    usedInAds: 0,
    usedInTemplates: 0,
    createdAt: asset.createdAt.toISOString(),
  }
}

function toAdvertisementDTO(row: AdvertisementRow) {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    primaryText: row.primaryText,
    ctaLabel: row.ctaLabel,
    destinationUrl: row.destinationUrl,
    assetIds: row.assets.map((a) => a.assetId),
    assets: row.assets.map((a) => toNestedAsset(a.asset)),
    format: row.format,
    headline: row.headline,
    textPlacement: row.textPlacement,
    fontScale: row.fontScale,
    textAlign: row.textAlign,
    overlay: row.overlay,
    ctaPlacement: row.ctaPlacement,
    mediaFocal: row.mediaFocal,
    destinationType: row.destinationType,
    destinationLandingPageId: row.destinationLandingPageId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastPublishedAt: row.publishedVersions?.[0]?.publishedAt.toISOString() ?? null,
    ...advertisementSummary(row.runs),
  }
}

// destinationType=LANDING_PAGE is a live reference (see CLAUDE.md's Ad Designer "reference, never
// copy" rule) — resolved to a real hosted URL only when actually needed (publish, click), never
// stored as a stale copy on the Advertisement row itself.
async function resolveClickUrl(
  businessId: string,
  advertisement: {
    destinationType: string | null
    destinationLandingPageId: string | null
    destinationUrl: string | null
  },
  overrideDestinationUrl: string | undefined,
): Promise<string | null> {
  if (overrideDestinationUrl !== undefined) return overrideDestinationUrl || null
  if (advertisement.destinationType === 'LANDING_PAGE' && advertisement.destinationLandingPageId) {
    const page = await db.landingPage.findFirst({
      where: { id: advertisement.destinationLandingPageId, businessId, deletedAt: null },
      select: { slug: true },
    })
    return page ? hostedPageUrl(page.slug) : null
  }
  return advertisement.destinationUrl ?? null
}

async function assertDestinationLandingPage(businessId: string, landingPageId: string) {
  const page = await db.landingPage.findFirst({
    where: { id: landingPageId, businessId, deletedAt: null },
    select: { id: true },
  })
  if (!page) throw { statusCode: 404, message: 'Destination landing page not found' }
}

export class AdvertisementService {
  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: Prisma.AdvertisementWhereInput[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const rows = await db.advertisement.findMany({
      where: { businessId, deletedAt: null, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: INCLUDE,
    })
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toAdvertisementDTO), meta: { hasMore, nextCursor } }
  }

  async create(
    businessId: string,
    data: {
      name: string
      primaryText?: string
      ctaLabel?: string
      destinationUrl?: string
      assetIds?: string[]
      format?: AdCreativeFormat
      headline?: string
      destinationType?: 'LANDING_PAGE' | 'EXTERNAL_URL'
      destinationLandingPageId?: string
    } & DesignPatch,
  ) {
    const assetIds = data.assetIds ?? []
    await requireAssets(businessId, assetIds)
    if (data.destinationType === 'LANDING_PAGE') {
      if (!data.destinationLandingPageId) {
        throw {
          statusCode: 400,
          message: 'destinationLandingPageId is required for destinationType LANDING_PAGE',
        }
      }
      await assertDestinationLandingPage(businessId, data.destinationLandingPageId)
    }
    const design = data.format ? resolveAdCreativeDesign(data.format, data) : null
    const row = await db.advertisement.create({
      data: {
        businessId,
        name: data.name,
        primaryText: data.primaryText ?? null,
        ctaLabel: data.ctaLabel ?? null,
        destinationUrl: data.destinationUrl ?? null,
        format: data.format ?? null,
        headline: data.headline ?? null,
        destinationType: data.destinationType ?? null,
        destinationLandingPageId: data.destinationLandingPageId ?? null,
        ...designFieldsFrom(design),
        assets: { create: assetIds.map((assetId) => ({ assetId })) },
      },
      include: INCLUDE,
    })
    return toAdvertisementDTO(row)
  }

  async get(businessId: string, advertisementId: string) {
    const row = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId, deletedAt: null },
      include: INCLUDE,
    })
    if (!row) throw { statusCode: 404, message: 'Advertisement not found' }
    return toAdvertisementDTO(row)
  }

  // Wholesale replace, same convention as CampaignService.update's creativeIds diff — not
  // versioned like Creative (Advertisement is a live, editable grouping entity, not a frozen
  // per-send snapshot). Adding/removing media here only affects AdRuns provisioned *after* this
  // call; an already-pushed AdRun's external platform object is not retroactively touched.
  async update(
    businessId: string,
    advertisementId: string,
    data: {
      name?: string
      primaryText?: string | null
      ctaLabel?: string | null
      destinationUrl?: string | null
      assetIds?: string[]
      format?: AdCreativeFormat | null
      headline?: string | null
      destinationType?: 'LANDING_PAGE' | 'EXTERNAL_URL' | null
      destinationLandingPageId?: string | null
    } & DesignPatch,
  ) {
    const current = await this._find(businessId, advertisementId)
    if (data.assetIds !== undefined) await requireAssets(businessId, data.assetIds)
    const nextDestinationType =
      data.destinationType !== undefined ? data.destinationType : current.destinationType
    const nextDestinationLandingPageId =
      data.destinationLandingPageId !== undefined
        ? data.destinationLandingPageId
        : current.destinationLandingPageId
    if (nextDestinationType === 'LANDING_PAGE') {
      if (!nextDestinationLandingPageId) {
        throw {
          statusCode: 400,
          message: 'destinationLandingPageId is required for destinationType LANDING_PAGE',
        }
      }
      await assertDestinationLandingPage(businessId, nextDestinationLandingPageId)
    }

    // The format a row ends up with, and the design merged onto that format's current resolved
    // values (or its defaults, if this is the call that first sets a format) — never a sparse
    // partial write. `format: null` explicitly clears back to a generic ad (all design fields null).
    const nextFormat =
      data.format !== undefined ? data.format : (current.format as AdCreativeFormat | null)
    const currentDesign: DesignPatch = {
      textPlacement: (current.textPlacement as AdCreativeDesign['textPlacement']) ?? undefined,
      fontScale: (current.fontScale as AdCreativeDesign['fontScale']) ?? undefined,
      textAlign: (current.textAlign as AdCreativeDesign['textAlign']) ?? undefined,
      overlay: (current.overlay as AdCreativeDesign['overlay']) ?? undefined,
      ctaPlacement: (current.ctaPlacement as AdCreativeDesign['ctaPlacement']) ?? undefined,
      mediaFocal: (current.mediaFocal as AdCreativeDesign['mediaFocal']) ?? undefined,
    }
    const designOverride: DesignPatch = {
      ...(data.textPlacement !== undefined
        ? { textPlacement: data.textPlacement ?? undefined }
        : {}),
      ...(data.fontScale !== undefined ? { fontScale: data.fontScale ?? undefined } : {}),
      ...(data.textAlign !== undefined ? { textAlign: data.textAlign ?? undefined } : {}),
      ...(data.overlay !== undefined ? { overlay: data.overlay ?? undefined } : {}),
      ...(data.ctaPlacement !== undefined ? { ctaPlacement: data.ctaPlacement ?? undefined } : {}),
      ...(data.mediaFocal !== undefined ? { mediaFocal: data.mediaFocal ?? undefined } : {}),
    }
    const design = nextFormat
      ? resolveAdCreativeDesign(nextFormat, { ...currentDesign, ...designOverride })
      : null

    const row = await db.$transaction(async (tx) => {
      if (data.assetIds !== undefined) {
        await tx.advertisementAsset.deleteMany({ where: { advertisementId } })
        if (data.assetIds.length) {
          await tx.advertisementAsset.createMany({
            data: data.assetIds.map((assetId) => ({ advertisementId, assetId })),
          })
        }
      }
      return tx.advertisement.update({
        where: { id: advertisementId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.primaryText !== undefined ? { primaryText: data.primaryText } : {}),
          ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel } : {}),
          ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl } : {}),
          ...(data.headline !== undefined ? { headline: data.headline } : {}),
          ...(data.format !== undefined ? { format: data.format } : {}),
          ...(data.destinationType !== undefined ? { destinationType: data.destinationType } : {}),
          ...(data.destinationLandingPageId !== undefined
            ? { destinationLandingPageId: data.destinationLandingPageId }
            : {}),
          ...designFieldsFrom(design),
        },
        include: INCLUDE,
      })
    })
    return toAdvertisementDTO(row)
  }

  private async _find(businessId: string, advertisementId: string) {
    const row = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId, deletedAt: null },
    })
    if (!row) throw { statusCode: 404, message: 'Advertisement not found' }
    return row
  }

  async delete(businessId: string, advertisementId: string) {
    await this._find(businessId, advertisementId)
    const deliveringRun = await db.adRun.findFirst({
      where: {
        advertisementId,
        status: { in: ['PENDING', 'READY', 'ACTIVE', 'PAUSED'] },
      },
      select: { id: true },
    })
    if (deliveringRun) {
      throw {
        statusCode: 409,
        message: 'End every active or paused destination before deleting this ad',
      }
    }
    await db.advertisement.update({
      where: { id: advertisementId },
      data: { deletedAt: new Date() },
    })
  }

  async publish(
    businessId: string,
    advertisementId: string,
    data: {
      clickBehavior?: 'NONE' | 'URL' | 'HOST'
      destinationUrl?: string
      dimensions?: string
      accessibleLabel?: string
    } = {},
    publishedBy?: string,
  ) {
    const advertisement = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId, deletedAt: null },
      include: { assets: { orderBy: { id: 'asc' } } },
    })
    if (!advertisement) throw { statusCode: 404, message: 'Advertisement not found' }

    // Feed Ad POC: destinationUrl/clickBehavior default from the Advertisement's own draft
    // creative fields (set in the editor, alongside primaryText/ctaLabel) rather than requiring a
    // separate publish-time form — an explicit override in `data` still wins. Ad Designer
    // (2026-09-03): when destinationType=LANDING_PAGE, the resolved URL comes from the referenced
    // page's live hosted URL, not a copy — this is the one moment that reference gets turned into
    // a concrete URL and frozen onto this version (see CLAUDE.md's "reference, never copy" rule;
    // republishing the Advertisement is what picks up a since-changed page slug).
    const destinationUrl = await resolveClickUrl(businessId, advertisement, data.destinationUrl)
    const clickBehavior = data.clickBehavior ?? (destinationUrl ? 'URL' : 'HOST')

    return db.$transaction(async (tx) => {
      const last = await tx.publishedAdvertisementVersion.findFirst({
        where: { advertisementId },
        orderBy: { version: 'desc' },
      })
      const nextVersion = (last?.version ?? 0) + 1

      const assetIds = advertisement.assets.map((a) => a.assetId)

      const payload = {
        accessibleLabel: data.accessibleLabel ?? null,
        assets: assetIds,
        primaryText: advertisement.primaryText,
        ctaLabel: advertisement.ctaLabel,
        clickBehavior,
        destinationUrl: destinationUrl ?? null,
        dimensions: data.dimensions
          ? {
              width: parseInt(data.dimensions.split('x')[0] || '0', 10),
              height: parseInt(data.dimensions.split('x')[1] || '0', 10),
            }
          : null,
        format: advertisement.format,
        headline: advertisement.headline,
        textPlacement: advertisement.textPlacement,
        fontScale: advertisement.fontScale,
        textAlign: advertisement.textAlign,
        overlay: advertisement.overlay,
        ctaPlacement: advertisement.ctaPlacement,
        mediaFocal: advertisement.mediaFocal,
      }

      const canonicalString = canonicalJson({
        rendererFormatVersion: 'advertisement-embed-v1',
        payload,
      })
      const checksum = crypto.createHash('sha256').update(canonicalString).digest('hex')

      const version = await tx.publishedAdvertisementVersion.create({
        data: {
          advertisementId,
          version: nextVersion,
          creativeSnapshot: payload,
          assetIds: assetIds,
          clickBehavior,
          destinationUrl: destinationUrl ?? null,
          dimensions: data.dimensions,
          accessibleLabel: data.accessibleLabel,
          format: advertisement.format,
          checksum,
          publishedBy,
        },
      })

      return version
    })
  }
}
