import { readFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { trackedAdRunUrl } from '../lib/urls'
import { requireIdempotencyKey } from '../lib/finance/money'
import { isUniqueConflict } from '../lib/prismaError'
import { validateAdRunCreateInput } from '../lib/adRunValidation'
import { tryGetConnector } from '../lib/platforms/registry'
import { unsealToken } from '../lib/platforms/encrypt'
import { localPath } from '../lib/mediaStorage/local'
// Not '@project/sdk' directly — that package's root export pulls in React-Query hooks the
// server has no business resolving, and its package.json #exports map isn't resolvable under
// this tsconfig's classic "node" moduleResolution anyway. This subpath (already carved out in
// packages/sdk/package.json's #exports specifically for non-bundler consumers) is a plain
// dependency-free validation function, safe to import directly by file path.
import { validateAdvertisement } from '@project/sdk/src/lib/capabilities'
import { leadsSalesRevenueByAdRun, type AdRunPerformance } from '../lib/adRunPerformance'
import { freezeMediaOrderRevision } from '../lib/mediaOrderRevision'
import { notifyAdRunEvent, type AdRunInboxEvent } from '../lib/adRunInbox'
import { AdRunSyncService, downgradeStaleness } from './AdRunSyncService'

function toAdRunDTO(adRunRow: any, performance?: AdRunPerformance) {
  const adRun = downgradeStaleness(adRunRow)
  return {
    id: adRun.id,
    advertisementId: adRun.advertisementId,
    platform: adRun.platform,
    status: adRun.status,
    budget: adRun.budget ? Number(adRun.budget) : null,
    spend: Number(adRun.spend ?? 0),
    impressions: adRun.impressions,
    reach: adRun.reach ?? null,
    clicks: adRun.clicks,
    conversions: adRun.conversions,
    leads: performance?.leads ?? 0,
    sales: performance?.sales ?? 0,
    revenue: performance?.revenue ?? 0,
    // Platform delivery truth — independent of `status` (LOOPIE's own order state) above.
    providerState: adRun.providerState ?? null,
    providerStateRaw: adRun.providerStateRaw ?? null,
    syncHealth: adRun.syncHealth,
    syncError: adRun.syncError ?? null,
    effectiveBudget: adRun.effectiveBudget ? Number(adRun.effectiveBudget) : null,
    effectiveStartDate: adRun.effectiveStartDate?.toISOString() ?? null,
    effectiveEndDate: adRun.effectiveEndDate?.toISOString() ?? null,
    country: adRun.country ?? null,
    locationNote: adRun.locationNote ?? null,
    radiusMiles: adRun.radiusMiles ?? null,
    effectiveCountry: adRun.effectiveCountry ?? null,
    effectiveLocationNote: adRun.effectiveLocationNote ?? null,
    effectiveRadiusMiles: adRun.effectiveRadiusMiles ?? null,
    providerIssues: (adRun.providerIssues as string[] | null) ?? null,
    supersedesRunId: adRun.supersedesRunId ?? null,
    startDate: adRun.startDate?.toISOString() ?? null,
    endDate: adRun.endDate?.toISOString() ?? null,
    externalCampaignId: adRun.externalCampaignId ?? null,
    externalAdSetId: adRun.externalAdSetId ?? null,
    externalAdId: adRun.externalAdId ?? null,
    placement: adRun.placement ?? null,
    previewUrl: adRun.previewUrl ?? null,
    managerUrl: adRun.managerUrl ?? null,
    errorMessage: adRun.errorMessage ?? null,
    destinationLandingPageId: adRun.destinationLandingPageId ?? null,
    orderSnapshot: adRun.orderSnapshot ?? null,
    mediaOrderRevisionId: adRun.mediaOrderRevisionId ?? null,
    // The durable authorization record this run was actually sent against (Phase 1, scoped down
    // — see mediaOrderRevision.ts). Null for pre-existing rows sent before this column existed;
    // orderSnapshot above stays their sole record. The frontend builds the authorization sentence
    // from these raw fields — one shared function renders it both pre-send (live form state) and
    // post-send (this frozen revision), so the sentence never has two independent phrasings.
    mediaOrderRevision: adRun.mediaOrderRevision
      ? {
          id: adRun.mediaOrderRevision.id,
          revision: adRun.mediaOrderRevision.revision,
          goal: adRun.mediaOrderRevision.goal,
          successEvent: adRun.mediaOrderRevision.successEvent,
          country: adRun.mediaOrderRevision.country,
          locationNote: adRun.mediaOrderRevision.locationNote ?? null,
          radiusMiles: adRun.mediaOrderRevision.radiusMiles ?? null,
          dailyBudgetMinor: adRun.mediaOrderRevision.dailyBudgetMinor,
          currency: adRun.mediaOrderRevision.currency,
          startAt: adRun.mediaOrderRevision.startAt.toISOString(),
          endAt: adRun.mediaOrderRevision.endAt?.toISOString() ?? null,
          destinationLandingPageId: adRun.mediaOrderRevision.destinationLandingPageId ?? null,
          destinationLandingPageVersionId:
            adRun.mediaOrderRevision.destinationLandingPageVersionId ?? null,
          assetIds: adRun.mediaOrderRevision.assetIds ?? [],
          accountName: adRun.mediaOrderRevision.accountName ?? null,
          accountCurrency: adRun.mediaOrderRevision.accountCurrency ?? null,
          accountTimezone: adRun.mediaOrderRevision.accountTimezone ?? null,
          adAccountId: adRun.mediaOrderRevision.adAccountId ?? null,
          contentHash: adRun.mediaOrderRevision.contentHash,
          createdAt: adRun.mediaOrderRevision.createdAt.toISOString(),
        }
      : null,
    trackedUrl: trackedAdRunUrl(adRun.id),
    lastSyncedAt: adRun.lastSyncedAt?.toISOString() ?? null,
    createdAt: adRun.createdAt.toISOString(),
  }
}

function uploadKey(url: string) {
  if (!url.startsWith('/uploads/')) return null
  return url.slice('/uploads/'.length)
}

const ADVERTISEMENT_WITH_ASSETS = {
  assets: { include: { asset: true } },
} as const

const VERB: Record<'ACTIVE' | 'PAUSED' | 'ENDED', string> = {
  ACTIVE: 'resume',
  PAUSED: 'pause',
  ENDED: 'end',
}

export class AdRunService {
  async list(
    businessId: string,
    advertisementId: string,
    opts: { cursor?: string; limit?: number },
  ) {
    await this._findAdvertisement(businessId, advertisementId)
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const adRuns = await db.adRun.findMany({
      where: { advertisementId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { mediaOrderRevision: true },
    })
    const hasMore = adRuns.length > limit
    const items = hasMore ? adRuns.slice(0, limit) : adRuns
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    const performance = await leadsSalesRevenueByAdRun(
      businessId,
      items.map((row) => row.id),
    )
    return {
      data: items.map((row) => toAdRunDTO(row, performance.get(row.id))),
      meta: { hasMore, nextCursor },
    }
  }

  // The declarative "create and provision" command: the caller states intent (platform, budget,
  // dates, destination, which of the Advertisement's already-attached media to run), and this
  // owns validate -> create AdRun -> call connector -> persist external ids -> mark
  // PENDING ("ready", pushed as a paused draft awaiting manual activation, same convention as
  // Deployment) or VALIDATION_FAILED. See CLAUDE.md's Media/Advertisement/AdRun migration audit.
  //
  // Idempotent in two layers: (1) a client-supplied idempotencyKey means a retried call returns
  // the same local AdRun row instead of creating a second one; (2) within that row, provisioning
  // only ever runs while externalAdId is still unset, so a retry after a failed/interrupted push
  // re-attempts against the *same* row rather than risking a second external campaign/ad.
  async createAndProvision(
    businessId: string,
    advertisementId: string,
    data: any,
    createdByUserId?: string,
  ) {
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey)
    const advertisement = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId },
      include: ADVERTISEMENT_WITH_ASSETS,
    })
    if (!advertisement) throw { statusCode: 404, message: 'Advertisement not found' }

    validateAdRunCreateInput(data)
    if (data.destinationLandingPageId)
      await this._findLandingPage(businessId, data.destinationLandingPageId)

    const mediaAsset = advertisement.assets
      .map((row: any) => row.asset)
      .find((asset: any) => (asset.type === 'IMAGE' || asset.type === 'VIDEO') && !asset.deletedAt)
    const textAsset = advertisement.assets
      .map((row: any) => row.asset)
      .find((asset: any) => asset.type === 'TEXT' && asset.textContent && !asset.deletedAt)

    const validation = validateAdvertisement(
      {
        mediaType: mediaAsset?.type as any,
        aspectRatio: undefined, // Requires more advanced media metadata later
        text: textAsset?.textContent ?? advertisement.name,
        url: data.destinationLandingPageId
          ? `https://example.com/lp/${data.destinationLandingPageId}`
          : undefined,
      },
      data.platform,
      data.placement ?? 'FEED',
    )

    if (validation.state === 'UNSUPPORTED') {
      throw {
        statusCode: 400,
        message: `Platform run configuration unsupported: ${validation.warnings.join(', ')}`,
      }
    }

    // Verified against this same advertisement before it's ever persisted as an FK — a client
    // could otherwise hand back an id belonging to a different business/advertisement, which
    // would silently no-op the "end the prior run" step below but must not still get stored as a
    // cross-tenant lineage pointer.
    const supersedesRun = data.supersedesRunId
      ? await db.adRun.findFirst({ where: { id: data.supersedesRunId, advertisementId } })
      : null

    let adRun = await db.adRun.findUnique({
      where: { advertisementId_idempotencyKey: { advertisementId, idempotencyKey } },
    })
    if (!adRun) {
      try {
        // Freeze the durable, numbered authorization record before the AdRun row itself exists —
        // only on a genuine new send, never on an idempotent retry (a retry must return the same
        // revision, not mint a new one for a request that already happened). See
        // mediaOrderRevision.ts's own doc comment for why this exists alongside orderSnapshot.
        const snapshot = (data.orderSnapshot ?? {}) as Record<string, unknown>
        const connection = await db.platformConnection.findUnique({
          where: { businessId_platform: { businessId, platform: data.platform } },
        })
        const revision = await freezeMediaOrderRevision({
          businessId,
          advertisementId,
          platform: data.platform,
          placement: data.placement ?? null,
          goal: typeof snapshot.goal === 'string' ? snapshot.goal : '',
          successEvent: typeof snapshot.successEvent === 'string' ? snapshot.successEvent : '',
          country:
            typeof snapshot.country === 'string'
              ? snapshot.country
              : (connection?.defaultCountry ?? 'US'),
          locationNote:
            typeof snapshot.location === 'string' && snapshot.location ? snapshot.location : null,
          radiusMiles: typeof snapshot.radiusMiles === 'number' ? snapshot.radiusMiles : null,
          dailyBudgetMinor: Math.round(Number(data.budget ?? 0) * 100),
          currency: connection?.currency ?? 'USD',
          startAt: data.startDate ? new Date(data.startDate) : new Date(),
          endAt: data.endDate ? new Date(data.endDate) : null,
          destinationLandingPageId: data.destinationLandingPageId ?? null,
          destinationLandingPageVersionId:
            typeof snapshot.destinationLandingPageVersion === 'string'
              ? snapshot.destinationLandingPageVersion
              : null,
          assetIds: Array.isArray(snapshot.assetIds)
            ? snapshot.assetIds.filter((id): id is string => typeof id === 'string')
            : advertisement.assets.map((row: any) => row.assetId),
          accountName: connection?.accountName ?? null,
          accountCurrency: connection?.currency ?? null,
          accountTimezone: connection?.timezone ?? null,
          adAccountId: connection?.adAccountId ?? null,
          createdByUserId: createdByUserId ?? 'unknown',
        })

        adRun = await db.adRun.create({
          data: {
            advertisementId,
            platform: data.platform,
            placement: data.placement,
            destinationLandingPageId: data.destinationLandingPageId,
            budget: data.budget,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            country: revision.country,
            locationNote: revision.locationNote,
            radiusMiles: revision.radiusMiles,
            orderSnapshot: data.orderSnapshot ?? undefined,
            mediaOrderRevisionId: revision.id,
            supersedesRunId: supersedesRun?.id ?? null,
            status: 'PENDING',
            idempotencyKey,
          },
        })
      } catch (err) {
        if (!isUniqueConflict(err)) throw err
        const raced = await db.adRun.findUnique({
          where: { advertisementId_idempotencyKey: { advertisementId, idempotencyKey } },
        })
        if (!raced) throw err
        adRun = raced
      }
    }

    if (!adRun.externalAdId) {
      adRun = await this._provision(businessId, adRun, advertisement)
    }

    // Relaunch/new-version: the caller states which prior run (same Advertisement, same
    // destination) this new one replaces. That prior run stays live until the replacement is
    // actually ready — ended only now, after provisioning has resolved, and only if it
    // genuinely succeeded (never VALIDATION_FAILED/PROVISIONING_FAILED). A failed replacement
    // must never strand the business with zero live run for this destination; the prior run
    // keeps delivering exactly as it was until a retry actually succeeds. Idempotent: ending an
    // already-ENDED run is a no-op, and this only ever touches a run verified to belong to the
    // same Advertisement above (see supersedesRun).
    if (
      supersedesRun &&
      supersedesRun.id !== adRun!.id &&
      adRun!.status !== 'VALIDATION_FAILED' &&
      adRun!.status !== 'PROVISIONING_FAILED'
    ) {
      await db.adRun.updateMany({
        where: { id: supersedesRun.id, advertisementId, status: { not: 'ENDED' } },
        data: { status: 'ENDED' },
      })
    }
    const withRevision = await db.adRun.findUniqueOrThrow({
      where: { id: adRun!.id },
      include: { mediaOrderRevision: true, advertisement: true },
    })

    try {
      const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
      await ActivityProjectionService.project(
        withRevision.advertisement.businessId,
        'AdRun',
        withRevision.id,
        'project',
        withRevision,
        withRevision.advertisement,
      )
    } catch (err) {
      console.error('Failed to project AdRun provisioning', err)
    }

    return toAdRunDTO(withRevision)
  }

  private async _provision(businessId: string, adRun: any, advertisement: any) {
    if (adRun.platform === 'LOOPIE') {
      const previewUrl = adRun.destinationLandingPageId
        ? `https://example.com/lp/${adRun.destinationLandingPageId}?preview=true`
        : null
      return await db.adRun.update({
        where: { id: adRun.id },
        data: {
          previewUrl,
          status: 'PENDING',
        },
      })
    }

    const connector = tryGetConnector(adRun.platform)
    // No registered connector for this platform, or the app-level integration isn't configured —
    // leave the run PENDING for manual entry, same as Deployment's default (non-Meta) path. This
    // is not a failure; VALIDATION_FAILED is reserved for a connector that was actually attempted
    // and failed.
    if (!connector || !connector.capabilities.pushDraft || !connector.configured()) return adRun

    const connection = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId, platform: adRun.platform } },
    })
    // Connector exists but this business hasn't connected/mapped an ad account+page yet — same
    // "nothing to push to yet, leave PENDING" treatment as above, not a failure.
    if (
      !connection ||
      connection.status !== 'CONNECTED' ||
      !connection.adAccountId ||
      !connection.pageId
    ) {
      return adRun
    }

    const imageAsset = advertisement.assets
      .map((row: any) => row.asset)
      .find((asset: any) => asset.type === 'IMAGE' && asset.url && !asset.deletedAt)
    const key = imageAsset?.url ? uploadKey(imageAsset.url) : null
    if (!imageAsset || !key) {
      // A real, attempted provisioning failure (media requirement unmet) — must not leave the run
      // looking live. See "Connector failure safety" in CLAUDE.md's migration audit.
      const failed = await db.adRun.update({
        where: { id: adRun.id },
        data: { status: 'VALIDATION_FAILED' },
        include: { advertisement: true },
      })

      try {
        const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
        await ActivityProjectionService.project(
          failed.advertisement.businessId,
          'AdRun',
          failed.id,
          'project',
          failed,
          failed.advertisement,
        )
      } catch (projErr) {
        console.error('Failed to project VALIDATION_FAILED', projErr)
      }

      return failed
    }

    try {
      const bytes = await readFile(localPath(key))
      const text = advertisement.assets
        .map((row: any) => row.asset)
        .find((asset: any) => asset.type === 'TEXT' && asset.textContent)

      const result = await connector.pushDraft({
        accessToken: unsealToken(connection.accessTokenEnc),
        adAccountId: connection.adAccountId,
        pageId: connection.pageId,
        defaultCountry: adRun.country ?? connection.defaultCountry,
        campaignName: advertisement.name,
        creativeName: advertisement.name,
        trackedUrl: trackedAdRunUrl(adRun.id),
        dailyBudgetCents: Math.round(Number(adRun.budget ?? 0) * 100),
        image: { bytes, filename: key, mimeType: imageAsset.mimeType ?? 'image/png' },
        message: text?.textContent ?? advertisement.name,
        locationNote: adRun.locationNote ?? null,
        radiusMiles: adRun.radiusMiles ?? null,
      })

      // Preview/manager URL populates only now — after the external object genuinely exists, not
      // speculatively before or during the attempt.
      const managerUrl =
        connector.managerUrl?.(result, { adAccountId: connection.adAccountId }) ?? null
      const previewUrl =
        connector.previewUrl?.(result, { adAccountId: connection.adAccountId }) ?? null

      return await db.adRun.update({
        where: { id: adRun.id },
        data: {
          externalCampaignId: result.externalCampaignId,
          externalAdSetId: result.externalAdSetId,
          externalAdId: result.externalAdId,
          managerUrl,
          previewUrl,
          status: 'PENDING', // pushed as a paused draft — matches Deployment/connector behavior; the business activates it manually
          lastSyncedAt: new Date(),
        },
      })
    } catch (err: any) {
      // The connector call itself failed (network, platform rejection, etc.) — same failure-
      // safety rule as the media-missing case above: never leave the run looking live.
      const failed = await db.adRun.update({
        where: { id: adRun.id },
        data: { status: 'PROVISIONING_FAILED', errorMessage: err?.message || String(err) },
        include: { advertisement: true },
      })

      try {
        const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
        await ActivityProjectionService.project(
          failed.advertisement.businessId,
          'AdRun',
          failed.id,
          'project',
          failed,
          failed.advertisement,
        )
      } catch (projErr) {
        console.error('Failed to project PROVISIONING_FAILED', projErr)
      }

      throw err
    }
  }

  private async _priorRevisionOf(current: any) {
    return current.mediaOrderRevisionId
      ? await db.mediaOrderRevision.findUnique({ where: { id: current.mediaOrderRevisionId } })
      : null
  }

  // Shared by replaceCreative/replaceDestination — carries forward every field a RECREATE isn't
  // specifically changing (budget/schedule/targeting/destination/media), from the prior revision
  // when one exists, falling back to the run's own current columns otherwise. Neither replace
  // method needs to re-derive this on its own.
  private _carryForwardInput(current: any, priorRevision: any, overrides: Record<string, unknown>) {
    const startAt = priorRevision?.startAt ?? current.startDate ?? null
    const endAt = priorRevision?.endAt ?? current.endDate ?? null
    return {
      platform: current.platform,
      placement: current.placement,
      budget: priorRevision
        ? priorRevision.dailyBudgetMinor / 100
        : current.budget != null
          ? Number(current.budget)
          : undefined,
      startDate: startAt ? startAt.toISOString() : undefined,
      endDate: endAt ? endAt.toISOString() : undefined,
      destinationLandingPageId:
        priorRevision?.destinationLandingPageId ?? current.destinationLandingPageId ?? undefined,
      orderSnapshot: {
        ...((current.orderSnapshot as Record<string, unknown> | null) ?? {}),
        location: priorRevision?.locationNote ?? current.locationNote ?? undefined,
        radiusMiles: priorRevision?.radiusMiles ?? current.radiusMiles ?? undefined,
        country: priorRevision?.country ?? current.country ?? undefined,
        // Cleared, not carried forward — a stale destinationLandingPageVersion pointing at the
        // *old* destination's published version must never survive onto a run whose
        // destinationLandingPageId just changed. replaceDestination sets the new page's own
        // publishedVersionId explicitly via its own override; every other RECREATE path (generic
        // relaunch, replaceCreative) genuinely has no new version to carry, so undefined here is
        // correct for them too.
        destinationLandingPageVersion: undefined,
      },
      supersedesRunId: current.id,
      ...overrides,
    }
  }

  // RECREATE for creative — reuses the Advertisement's current attached assets (the same
  // createAndProvision command a first send/generic relaunch already uses), scoped to this one
  // purpose so the confirm step and error messaging can be specific ("replace the creative")
  // rather than the generic "something changed, relaunch?" banner. 400s if the Advertisement's
  // current media already matches this run's last revision — nothing to replace. The prior run's
  // "stays live until the replacement is ready" guarantee comes from createAndProvision itself.
  async replaceCreative(
    businessId: string,
    adRunId: string,
    data: { idempotencyKey?: string },
    createdByUserId?: string,
  ) {
    const current = await this._findOwn(businessId, adRunId)
    const advertisement = await db.advertisement.findUniqueOrThrow({
      where: { id: current.advertisementId },
      include: ADVERTISEMENT_WITH_ASSETS,
    })
    const priorRevision = await this._priorRevisionOf(current)
    const currentAssetIds = advertisement.assets
      .map((row: any) => row.assetId)
      .slice()
      .sort()
    const priorAssetIds = ((priorRevision?.assetIds as string[] | null) ?? []).slice().sort()
    const unchanged =
      currentAssetIds.length === priorAssetIds.length &&
      currentAssetIds.every((id: string, i: number) => id === priorAssetIds[i])
    if (unchanged) {
      throw {
        statusCode: 400,
        message:
          "The Advertisement's current media matches this run's last revision — nothing to replace.",
      }
    }

    const input = this._carryForwardInput(current, priorRevision, {
      idempotencyKey: data.idempotencyKey || randomUUID(),
    })
    try {
      const result = await this.createAndProvision(
        businessId,
        current.advertisementId,
        input,
        createdByUserId,
      )
      if (result.status === 'VALIDATION_FAILED' || result.status === 'PROVISIONING_FAILED') {
        await notifyAdRunEvent(
          businessId,
          current.advertisementId,
          current.platform,
          advertisement.name,
          {
            type: 'REPLACEMENT_FAILED',
            reason: result.errorMessage ?? 'The connector could not provision the replacement.',
          },
        )
      } else {
        await notifyAdRunEvent(
          businessId,
          current.advertisementId,
          current.platform,
          advertisement.name,
          {
            type: 'CREATIVE_REPLACED',
            oldRevision: priorRevision?.revision ?? 0,
            newRevision: result.mediaOrderRevision?.revision ?? 0,
          },
        )
      }
      return result
    } catch (err: any) {
      await notifyAdRunEvent(
        businessId,
        current.advertisementId,
        current.platform,
        advertisement.name,
        {
          type: 'REPLACEMENT_FAILED',
          reason: err?.message || String(err),
        },
      )
      throw err
    }
  }

  // RECREATE for destination — same contract as replaceCreative, for the click destination
  // instead of the media. 400s if the new destinationLandingPageId matches what's already
  // effective — nothing to replace.
  async replaceDestination(
    businessId: string,
    adRunId: string,
    data: { destinationLandingPageId?: string; idempotencyKey?: string },
    createdByUserId?: string,
  ) {
    if (!data.destinationLandingPageId) {
      throw { statusCode: 400, message: 'destinationLandingPageId is required' }
    }
    const current = await this._findOwn(businessId, adRunId)
    const advertisement = await db.advertisement.findUniqueOrThrow({
      where: { id: current.advertisementId },
    })
    const newPage = await this._findLandingPage(businessId, data.destinationLandingPageId)
    const priorRevision = await this._priorRevisionOf(current)
    const priorDestination =
      priorRevision?.destinationLandingPageId ?? current.destinationLandingPageId ?? null
    if (priorDestination === data.destinationLandingPageId) {
      throw {
        statusCode: 400,
        message: 'This is already the destination for this run — nothing to replace.',
      }
    }

    const input = this._carryForwardInput(current, priorRevision, {
      destinationLandingPageId: data.destinationLandingPageId,
      idempotencyKey: data.idempotencyKey || randomUUID(),
      orderSnapshot: {
        ...((current.orderSnapshot as Record<string, unknown> | null) ?? {}),
        location: priorRevision?.locationNote ?? current.locationNote ?? undefined,
        radiusMiles: priorRevision?.radiusMiles ?? current.radiusMiles ?? undefined,
        country: priorRevision?.country ?? current.country ?? undefined,
        // The new destination's own current published version, not the old destination's —
        // see _carryForwardInput's own comment on why this can never just carry forward.
        destinationLandingPageVersion: newPage.publishedVersionId ?? undefined,
      },
    })
    try {
      const result = await this.createAndProvision(
        businessId,
        current.advertisementId,
        input,
        createdByUserId,
      )
      if (result.status === 'VALIDATION_FAILED' || result.status === 'PROVISIONING_FAILED') {
        await notifyAdRunEvent(
          businessId,
          current.advertisementId,
          current.platform,
          advertisement.name,
          {
            type: 'REPLACEMENT_FAILED',
            reason: result.errorMessage ?? 'The connector could not provision the replacement.',
          },
        )
      } else {
        await notifyAdRunEvent(
          businessId,
          current.advertisementId,
          current.platform,
          advertisement.name,
          {
            type: 'DESTINATION_REPLACED',
            pageName: newPage.name,
          },
        )
      }
      return result
    } catch (err: any) {
      await notifyAdRunEvent(
        businessId,
        current.advertisementId,
        current.platform,
        advertisement.name,
        {
          type: 'REPLACEMENT_FAILED',
          reason: err?.message || String(err),
        },
      )
      throw err
    }
  }

  async get(businessId: string, adRunId: string) {
    const adRun = await db.adRun.findFirst({
      where: { id: adRunId, advertisement: { businessId } },
      include: { mediaOrderRevision: true },
    })
    if (!adRun) throw { statusCode: 404, message: 'AdRun not found' }
    const performance = await leadsSalesRevenueByAdRun(businessId, [adRun.id])
    return toAdRunDTO(adRun, performance.get(adRun.id))
  }

  // Manual metrics/status entry (spend/impressions/clicks/conversions) — same "no live platform
  // sync in V1" model as Deployment. Deliberately does not accept platform/advertisementId: once
  // an AdRun exists, its source identity is immutable — see "Immutable source identity once
  // attribution exists" in CLAUDE.md's migration audit. Changing which platform or Advertisement
  // an AdRun belongs to would retroactively misattribute every Lead/Sale/Interaction that already
  // points at it via sourceAdRunId.
  async update(businessId: string, adRunId: string, data: any) {
    const adRun = await db.adRun.findFirst({
      where: { id: adRunId, advertisement: { businessId } },
    })
    if (!adRun) throw { statusCode: 404, message: 'AdRun not found' }
    if (data.destinationLandingPageId)
      await this._findLandingPage(businessId, data.destinationLandingPageId)

    const updated = await db.adRun.update({
      where: { id: adRunId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.spend !== undefined ? { spend: data.spend } : {}),
        ...(data.budget !== undefined ? { budget: data.budget } : {}),
        ...(data.impressions !== undefined ? { impressions: data.impressions } : {}),
        ...(data.clicks !== undefined ? { clicks: data.clicks } : {}),
        ...(data.conversions !== undefined ? { conversions: data.conversions } : {}),
        ...(data.destinationLandingPageId !== undefined
          ? { destinationLandingPageId: data.destinationLandingPageId }
          : {}),
        lastSyncedAt: new Date(),
      },
    })
    return toAdRunDTO(updated)
  }

  // Status transitions — capability-driven, request-then-resync. If this run was actually sent to
  // a platform (externalAdId set) and that connector can remotely mutate this specific transition
  // (capabilities.pause/activate/end), the request goes to the platform first; LOOPIE's own
  // `status` only changes after that request is accepted, and is immediately followed by a real
  // resync so `providerState` reflects the platform's own confirmed truth in the same response —
  // never an optimistic guess. A run with no connector, no external id yet, or a connector that
  // doesn't support this transition (e.g. LOOPIE pages, which have no connector at all) falls back
  // to the same purely-local transition this always did — there is no external object for LOOPIE's
  // status to disagree with. A run that DOES have a real external identity but whose business is
  // currently disconnected is a categorically different case and must NOT silently fall back to
  // local-only: that is exactly "LOOPIE says Paused, Facebook keeps spending," the state split
  // this whole model exists to prevent. See _requireRemoteContext below. Status-cascade parity
  // with the Campaign path: CampaignService.pause/resume/end still cascade onto linked AdRuns as a
  // local-only bulk operation — deliberately not extended to remote mutation this pass (bulk
  // partial-failure semantics across N runs is a real, separate problem; see CLAUDE.md's
  // remote-ops pass).
  async pause(businessId: string, adRunId: string) {
    const current = await this._findOwn(businessId, adRunId)
    if (current.status !== 'ACTIVE') {
      throw { statusCode: 409, message: 'Only active ad runs can be paused' }
    }
    return this._transitionStatus(businessId, current, 'PAUSED')
  }

  async resume(businessId: string, adRunId: string) {
    const current = await this._findOwn(businessId, adRunId)
    if (current.status !== 'PENDING' && current.status !== 'PAUSED') {
      throw { statusCode: 409, message: 'Only pending or paused ad runs can be activated' }
    }
    return this._transitionStatus(businessId, current, 'ACTIVE')
  }

  async end(businessId: string, adRunId: string) {
    const current = await this._findOwn(businessId, adRunId)
    if (current.status === 'ENDED') throw { statusCode: 409, message: 'Ad run already ended' }
    return this._transitionStatus(businessId, current, 'ENDED')
  }

  private async _transitionStatus(
    businessId: string,
    current: any,
    targetStatus: 'ACTIVE' | 'PAUSED' | 'ENDED',
  ) {
    const connector = tryGetConnector(current.platform)
    const remoteCapable =
      (targetStatus === 'PAUSED' && connector?.capabilities.pause) ||
      (targetStatus === 'ACTIVE' && connector?.capabilities.activate) ||
      (targetStatus === 'ENDED' && connector?.capabilities.end)

    // No real external object exists to disagree with LOOPIE — pause/resume/end has always been
    // purely a local concept here (never sent, LOOPIE pages with no connector, or a connector that
    // doesn't support this specific transition).
    if (!current.externalAdId || !connector || !remoteCapable || !connector.updateRemoteStatus) {
      const updated = await db.adRun.update({
        where: { id: current.id },
        data: { status: targetStatus },
        include: { mediaOrderRevision: true, advertisement: true },
      })

      try {
        const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
        await ActivityProjectionService.project(
          updated.advertisement.businessId,
          'AdRun',
          updated.id,
          'project',
          updated,
          updated.advertisement,
        )
      } catch (err) {
        console.error('Failed to project local AdRun transition', err)
      }

      return toAdRunDTO(updated)
    }

    // From here on a real external object exists. A missing/disconnected connection is a hard
    // stop, not a silent local-only degrade: LOOPIE's status and the platform's own providerState
    // both stay exactly as they were, and the caller gets an actionable reason, not a state that
    // quietly stops being true the moment credentials lapse.
    const connection = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId, platform: current.platform } },
    })
    if (!connection || connection.status !== 'CONNECTED') {
      throw {
        statusCode: 409,
        message: `Cannot ${VERB[targetStatus]} — reconnect ${current.platform} to control this run remotely.`,
      }
    }

    try {
      await connector.updateRemoteStatus({
        accessToken: unsealToken(connection.accessTokenEnc),
        externalAdId: current.externalAdId,
        externalAdSetId: current.externalAdSetId,
        externalCampaignId: current.externalCampaignId,
        status: targetStatus,
      })
    } catch (err: any) {
      // The request itself failed — LOOPIE's own status must not change to imply it worked.
      throw {
        statusCode: 502,
        message: `Could not update ${current.platform}: ${err?.message || String(err)}`,
      }
    }

    // The remote request succeeded, so LOOPIE's own order-state intent is fulfilled — but the
    // platform's own reported truth (providerState/syncHealth) comes from actually asking again,
    // never from assuming the mutation call's success means the platform is already showing it.
    await new AdRunSyncService().syncOne(businessId, current.id)
    const updated = await db.adRun.update({
      where: { id: current.id },
      data: { status: targetStatus },
      include: { mediaOrderRevision: true, advertisement: true },
    })

    try {
      const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
      await ActivityProjectionService.project(
        updated.advertisement.businessId,
        'AdRun',
        updated.id,
        'project',
        updated,
        updated.advertisement,
      )
    } catch (err) {
      console.error('Failed to project AdRun transition', err)
    }

    const performance = await leadsSalesRevenueByAdRun(businessId, [updated.id])
    return toAdRunDTO(updated, performance.get(updated.id))
  }

  // The first operation that changes the actual media order, not just lifecycle — exercises the
  // revision architecture for real. Order: freeze a new MediaOrderRevision (continuing this
  // destination's own numbering) -> send the real mutation -> only on success does AdRun start
  // pointing at that new revision and its own `budget` move. A rejected mutation leaves the new
  // revision row in place (an honest record that this was attempted) but never effective — AdRun
  // keeps its prior revision and budget exactly as they were, same "provider truth wins, no
  // silent local mutation for an externally-tracked object" rule pause/resume/end now follow.
  // The one reusable IN_PLACE mutation pipeline — budget, schedule, and targeting are all "PATCH
  // the same ad-set object" edits with the exact same shape (validate -> capability/connection
  // gate -> freeze a new revision -> call the connector -> adopt only on success -> resync), so
  // instead of three near-duplicate service methods that slowly diverge, each field supplies only
  // what's actually different about it: how to validate its own input, which capability/connector
  // method gates it, how the new revision's fields differ from the prior one, the connector call
  // itself, and which AdRun columns to write on success. See CLAUDE.md's "generalize the mutation
  // engine" note for why this replaced three bespoke methods.
  private async _updateInPlaceField(
    businessId: string,
    adRunId: string,
    createdByUserId: string | undefined,
    opts: {
      fieldLabel: string
      capability: (caps: any) => boolean
      connectorMethod: (connector: any) => ((input: any) => Promise<void>) | undefined
      revisionOverrides: (prior: any) => Record<string, unknown>
      callConnector: (
        connector: any,
        args: { accessToken: string; externalAdSetId: string },
      ) => Promise<void>
      localUpdate: () => Record<string, unknown>
      inboxEvent: (prior: any) => AdRunInboxEvent
    },
  ) {
    const current = await this._findOwn(businessId, adRunId)
    const connector = tryGetConnector(current.platform)
    const method = connector ? opts.connectorMethod(connector) : undefined
    if (
      !current.externalAdId ||
      !current.externalAdSetId ||
      !connector ||
      !opts.capability(connector.capabilities) ||
      !method
    ) {
      throw {
        statusCode: 409,
        message: `This run's ${opts.fieldLabel} cannot be edited from LOOPIE.`,
      }
    }

    const connection = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId, platform: current.platform } },
    })
    if (!connection || connection.status !== 'CONNECTED') {
      throw {
        statusCode: 409,
        message: `Cannot edit ${opts.fieldLabel} — reconnect ${current.platform} to control this run remotely.`,
      }
    }

    const priorRevision = current.mediaOrderRevisionId
      ? await db.mediaOrderRevision.findUnique({ where: { id: current.mediaOrderRevisionId } })
      : null
    if (!priorRevision) {
      throw {
        statusCode: 409,
        message: `No prior media order revision exists for this run to base a ${opts.fieldLabel} change on.`,
      }
    }

    const newRevision = await freezeMediaOrderRevision({
      businessId,
      advertisementId: current.advertisementId,
      platform: current.platform,
      placement: current.placement,
      goal: priorRevision.goal,
      successEvent: priorRevision.successEvent,
      country: priorRevision.country,
      locationNote: priorRevision.locationNote,
      radiusMiles: priorRevision.radiusMiles,
      dailyBudgetMinor: priorRevision.dailyBudgetMinor,
      currency: priorRevision.currency,
      startAt: priorRevision.startAt,
      endAt: priorRevision.endAt,
      destinationLandingPageId: priorRevision.destinationLandingPageId,
      destinationLandingPageVersionId: priorRevision.destinationLandingPageVersionId,
      assetIds: (priorRevision.assetIds as string[] | null) ?? [],
      accountName: priorRevision.accountName,
      accountCurrency: priorRevision.accountCurrency,
      accountTimezone: priorRevision.accountTimezone,
      adAccountId: priorRevision.adAccountId,
      createdByUserId: createdByUserId ?? 'unknown',
      ...opts.revisionOverrides(priorRevision),
    } as any)

    try {
      await opts.callConnector(connector, {
        accessToken: unsealToken(connection.accessTokenEnc),
        externalAdSetId: current.externalAdSetId,
      })
    } catch (err: any) {
      // The new revision row stays — an honest record that this change was attempted — but AdRun
      // never adopts it, and the requested column(s) don't move. No optimistic "it probably worked."
      throw {
        statusCode: 502,
        message: `Could not update ${current.platform} ${opts.fieldLabel}: ${err?.message || String(err)}`,
      }
    }

    // Resync immediately so the effective* columns reflect what the platform actually now
    // reports, not the value LOOPIE just requested — the two can legitimately still disagree
    // (rounding, platform-side minimums, a slow read-after-write) and both stay visible, never
    // blended.
    await new AdRunSyncService().syncOne(businessId, current.id)
    const updated = await db.adRun.update({
      where: { id: current.id },
      data: { ...opts.localUpdate(), mediaOrderRevisionId: newRevision.id },
      include: { mediaOrderRevision: true, advertisement: true },
    })
    await notifyAdRunEvent(
      businessId,
      updated.advertisementId,
      updated.platform,
      updated.advertisement.name,
      opts.inboxEvent(priorRevision),
    )
    const performance = await leadsSalesRevenueByAdRun(businessId, [updated.id])
    return toAdRunDTO(updated, performance.get(updated.id))
  }

  async updateBudget(
    businessId: string,
    adRunId: string,
    data: { dailyBudget?: number },
    createdByUserId?: string,
  ) {
    if (
      data.dailyBudget === undefined ||
      !Number.isFinite(data.dailyBudget) ||
      data.dailyBudget <= 0
    ) {
      throw { statusCode: 400, message: 'dailyBudget must be a positive number' }
    }
    const dailyBudget = data.dailyBudget
    return this._updateInPlaceField(businessId, adRunId, createdByUserId, {
      fieldLabel: 'budget',
      capability: (caps) => Boolean(caps.editBudget),
      connectorMethod: (connector) => connector.updateBudget,
      revisionOverrides: () => ({ dailyBudgetMinor: Math.round(dailyBudget * 100) }),
      callConnector: (connector, args) =>
        connector.updateBudget({ ...args, dailyBudgetCents: Math.round(dailyBudget * 100) }),
      localUpdate: () => ({ budget: dailyBudget }),
      inboxEvent: (prior) => ({
        type: 'BUDGET_UPDATED',
        fromMinor: prior.dailyBudgetMinor,
        toMinor: Math.round(dailyBudget * 100),
        currency: prior.currency ?? 'USD',
      }),
    })
  }

  // Schedule editing — the closest cousin to updateBudget above, and the same shape once run
  // through the shared pipeline. No new validation policy about which schedule changes are
  // "reasonable" (e.g. moving a start time that already began delivering) — Meta itself decides
  // that and this just forwards whatever it says, success or rejection, like every mutation here.
  async updateSchedule(
    businessId: string,
    adRunId: string,
    data: { startDate?: string; endDate?: string | null },
    createdByUserId?: string,
  ) {
    if (!data.startDate) {
      throw { statusCode: 400, message: 'startDate is required' }
    }
    const startAt = new Date(data.startDate)
    if (Number.isNaN(startAt.getTime())) {
      throw { statusCode: 400, message: 'startDate is not a valid date' }
    }
    let endAt: Date | null = null
    if (data.endDate) {
      endAt = new Date(data.endDate)
      if (Number.isNaN(endAt.getTime())) {
        throw { statusCode: 400, message: 'endDate is not a valid date' }
      }
      if (endAt <= startAt) {
        throw { statusCode: 400, message: 'endDate must be after startDate' }
      }
    }
    return this._updateInPlaceField(businessId, adRunId, createdByUserId, {
      fieldLabel: 'schedule',
      capability: (caps) => Boolean(caps.editSchedule),
      connectorMethod: (connector) => connector.updateSchedule,
      revisionOverrides: () => ({ startAt, endAt }),
      callConnector: (connector, args) =>
        connector.updateSchedule({
          ...args,
          startAt: startAt.toISOString(),
          endAt: endAt ? endAt.toISOString() : null,
        }),
      localUpdate: () => ({ startDate: startAt, endDate: endAt }),
      inboxEvent: () => ({
        type: 'SCHEDULE_UPDATED',
        startIso: startAt.toISOString(),
        endIso: endAt ? endAt.toISOString() : null,
      }),
    })
  }

  // Targeting editing — same shared pipeline again. locationNote/radiusMiles null means
  // country-only targeting; a locationNote the connector can't resolve to a real location is a
  // rejected mutation like any other (502, revision stays unadopted), never a silent fallback.
  async updateTargeting(
    businessId: string,
    adRunId: string,
    data: { country?: string; locationNote?: string | null; radiusMiles?: number | null },
    createdByUserId?: string,
  ) {
    if (!data.country || !data.country.trim()) {
      throw { statusCode: 400, message: 'country is required' }
    }
    const country = data.country.trim()
    const locationNote = data.locationNote?.trim() || null
    const radiusMiles = locationNote ? (data.radiusMiles ?? null) : null
    return this._updateInPlaceField(businessId, adRunId, createdByUserId, {
      fieldLabel: 'targeting',
      capability: (caps) => Boolean(caps.editAudience),
      connectorMethod: (connector) => connector.updateTargeting,
      revisionOverrides: () => ({ country, locationNote, radiusMiles }),
      callConnector: (connector, args) =>
        connector.updateTargeting({ ...args, country, locationNote, radiusMiles }),
      localUpdate: () => ({ country, locationNote, radiusMiles }),
      inboxEvent: () => ({ type: 'TARGETING_UPDATED', country, locationNote, radiusMiles }),
    })
  }

  // On-demand pull sync (the UI's "Sync now") — see AdRunSyncService for the actual pull/mapping.
  async sync(businessId: string, adRunId: string) {
    const updated = await new AdRunSyncService().syncOne(businessId, adRunId)
    const performance = await leadsSalesRevenueByAdRun(businessId, [updated.id])
    return toAdRunDTO(updated, performance.get(updated.id))
  }

  async delete(businessId: string, adRunId: string) {
    await this._findOwn(businessId, adRunId)

    // Immutable source identity once attribution exists: an AdRun that any Lead/Sale/Interaction/
    // AttributionEvent already points at via sourceAdRunId/adRunId must never disappear out from
    // under those rows — pause or end it instead. Extends the pre-existing spend/budget-history
    // check (which alone missed a zero-spend AdRun that still converted real leads).
    const [adSpends, budgetAuthorizations, leads, sales, interactions, events] = await Promise.all([
      db.adSpend.count({ where: { adRunId } }),
      db.budgetAuthorization.count({ where: { adRunId } }),
      db.lead.count({ where: { sourceAdRunId: adRunId } }),
      db.sale.count({ where: { sourceAdRunId: adRunId } }),
      db.interaction.count({ where: { sourceAdRunId: adRunId } }),
      db.attributionEvent.count({ where: { adRunId } }),
    ])
    if (adSpends || budgetAuthorizations || leads || sales || interactions || events) {
      throw {
        statusCode: 409,
        message:
          'Cannot delete an AdRun with ledger history, spend, or attributed activity. Pause or end it instead.',
      }
    }

    await db.adRun.delete({ where: { id: adRunId } })
    return { success: true }
  }

  private async _findLandingPage(businessId: string, landingPageId: string) {
    const page = await db.landingPage.findFirst({
      where: { id: landingPageId, businessId, deletedAt: null },
    })
    if (!page) throw { statusCode: 404, message: 'Landing page not found' }
    return page
  }

  private async _findAdvertisement(businessId: string, advertisementId: string) {
    const advertisement = await db.advertisement.findFirst({
      where: { id: advertisementId, businessId },
    })
    if (!advertisement) throw { statusCode: 404, message: 'Advertisement not found' }
    return advertisement
  }

  private async _findOwn(businessId: string, adRunId: string) {
    const adRun = await db.adRun.findFirst({
      where: { id: adRunId, advertisement: { businessId } },
    })
    if (!adRun) throw { statusCode: 404, message: 'AdRun not found' }
    return adRun
  }
}
