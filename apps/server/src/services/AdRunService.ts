import { readFile } from 'fs/promises'
import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { trackedAdRunUrl } from '../lib/urls'
import { requireIdempotencyKey } from '../lib/finance/money'
import { isUniqueConflict } from '../lib/prismaError'
import { validateAdRunCreateInput } from '../lib/adRunValidation'
import { tryGetConnector } from '../lib/platforms/registry'
import { unsealToken } from '../lib/platforms/encrypt'
import { localPath } from '../lib/mediaStorage/local'
import { validateAdvertisement } from '@project/sdk'

function toAdRunDTO(adRun: any) {
  return {
    id: adRun.id,
    advertisementId: adRun.advertisementId,
    platform: adRun.platform,
    status: adRun.status,
    budget: adRun.budget ? Number(adRun.budget) : null,
    spend: Number(adRun.spend ?? 0),
    impressions: adRun.impressions,
    clicks: adRun.clicks,
    conversions: adRun.conversions,
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
    trackedUrl: trackedAdRunUrl(adRun.id),
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
    })
    const hasMore = adRuns.length > limit
    const items = hasMore ? adRuns.slice(0, limit) : adRuns
    const last = items[items.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null
    return { data: items.map(toAdRunDTO), meta: { hasMore, nextCursor } }
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
  async createAndProvision(businessId: string, advertisementId: string, data: any) {
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

    let adRun = await db.adRun.findUnique({
      where: { advertisementId_idempotencyKey: { advertisementId, idempotencyKey } },
    })
    if (!adRun) {
      try {
        adRun = await db.adRun.create({
          data: {
            advertisementId,
            platform: data.platform,
            placement: data.placement,
            destinationLandingPageId: data.destinationLandingPageId,
            budget: data.budget,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
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
    return toAdRunDTO(adRun)
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
      return db.adRun.update({ where: { id: adRun.id }, data: { status: 'VALIDATION_FAILED' } })
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
        defaultCountry: connection.defaultCountry,
        campaignName: advertisement.name,
        creativeName: advertisement.name,
        trackedUrl: trackedAdRunUrl(adRun.id),
        dailyBudgetCents: Math.round(Number(adRun.budget ?? 0) * 100),
        image: { bytes, filename: key, mimeType: imageAsset.mimeType ?? 'image/png' },
        message: text?.textContent ?? advertisement.name,
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
      await db.adRun.update({
        where: { id: adRun.id },
        data: { status: 'PROVISIONING_FAILED', errorMessage: err?.message || String(err) },
      })
      throw err
    }
  }

  async get(businessId: string, adRunId: string) {
    const adRun = await db.adRun.findFirst({
      where: { id: adRunId, advertisement: { businessId } },
    })
    if (!adRun) throw { statusCode: 404, message: 'AdRun not found' }
    return toAdRunDTO(adRun)
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

  // Deterministic local status transitions — no live connector call (this app never syncs status
  // to the platform, same boundary as Deployment). Status-cascade parity with the Campaign path:
  // see CampaignService.pause/resume/end, which cascade onto any AdRun linked via CampaignAdRun.
  async pause(businessId: string, adRunId: string) {
    const current = await this._findOwn(businessId, adRunId)
    if (current.status !== 'ACTIVE') {
      throw { statusCode: 409, message: 'Only active ad runs can be paused' }
    }
    return toAdRunDTO(await db.adRun.update({ where: { id: adRunId }, data: { status: 'PAUSED' } }))
  }

  async resume(businessId: string, adRunId: string) {
    const current = await this._findOwn(businessId, adRunId)
    if (current.status !== 'PENDING' && current.status !== 'PAUSED') {
      throw { statusCode: 409, message: 'Only pending or paused ad runs can be activated' }
    }
    return toAdRunDTO(await db.adRun.update({ where: { id: adRunId }, data: { status: 'ACTIVE' } }))
  }

  async end(businessId: string, adRunId: string) {
    const current = await this._findOwn(businessId, adRunId)
    if (current.status === 'ENDED') throw { statusCode: 409, message: 'Ad run already ended' }
    return toAdRunDTO(await db.adRun.update({ where: { id: adRunId }, data: { status: 'ENDED' } }))
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
