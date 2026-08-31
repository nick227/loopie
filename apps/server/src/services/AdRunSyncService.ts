import { db } from '@project/db'
import { Prisma } from '@prisma/client'
import type { Platform } from '@prisma/client'
import { tryGetConnector } from '../lib/platforms/registry'
import { unsealToken } from '../lib/platforms/encrypt'
import { notifyAdRunEvent } from '../lib/adRunInbox'

// How long a CURRENT sync stays trustworthy before the DTO itself starts reporting it as
// DELAYED — computed at read time (see downgradeStaleness below), not written by the poller, so
// staleness is always accurate even between poll ticks rather than only right after one runs.
const FRESHNESS_SLA_MS = 15 * 60_000

type SyncableRun = {
  id: string
  advertisementId: string
  platform: string
  externalAdId: string | null
  externalAdSetId: string | null
  externalCampaignId: string | null
}

// A CURRENT row whose lastSyncedAt has aged past the freshness SLA is stale even though nothing
// has re-run the poller yet — downgrade it for display without touching the stored row.
export function downgradeStaleness<T extends { syncHealth: string; lastSyncedAt: Date | null }>(
  row: T,
): T {
  if (row.syncHealth === 'CURRENT' && row.lastSyncedAt) {
    const age = Date.now() - row.lastSyncedAt.getTime()
    if (age > FRESHNESS_SLA_MS) return { ...row, syncHealth: 'DELAYED' }
  }
  return row
}

const DRIFT_FIELDS = {
  providerState: true,
  budget: true,
  startDate: true,
  endDate: true,
  country: true,
  locationNote: true,
  radiusMiles: true,
  effectiveBudget: true,
  effectiveStartDate: true,
  effectiveEndDate: true,
  effectiveCountry: true,
  effectiveLocationNote: true,
  effectiveRadiusMiles: true,
} as const

// True when requested and effective disagree on budget, schedule, or targeting — used both for
// "did drift just newly appear" (compare a before/after snapshot) and could be reused for a
// future drift indicator elsewhere. Only compares dimensions the platform has actually reported
// back (an effective* field still null means "not synced yet," not "matches.").
function hasDrift(row: Record<string, any>): boolean {
  const budgetDrift =
    row.effectiveBudget != null &&
    row.budget != null &&
    Math.abs(Number(row.effectiveBudget) - Number(row.budget)) > 0.01
  const scheduleDrift =
    row.effectiveStartDate != null &&
    ((row.startDate?.getTime() ?? null) !== row.effectiveStartDate.getTime() ||
      (row.endDate?.getTime() ?? null) !== (row.effectiveEndDate?.getTime() ?? null))
  const targetingDrift =
    row.effectiveCountry != null &&
    (row.country !== row.effectiveCountry ||
      (row.locationNote ?? null) !== (row.effectiveLocationNote ?? null) ||
      (row.radiusMiles ?? null) !== (row.effectiveRadiusMiles ?? null))
  return budgetDrift || scheduleDrift || targetingDrift
}

export class AdRunSyncService {
  // Manual, on-demand sync for one run (the UI's "Sync now" action). Only structural problems
  // (no such run, never sent) throw — a genuine pull failure (network, connector rejection) is
  // not an error response, it's a fact about this run: persisted as syncHealth: FAILED with
  // syncError set, same shape the DISCONNECTED case already returns, so the caller always gets a
  // normal 200 with a DTO it can render either way rather than branching on thrown vs. returned.
  async syncOne(businessId: string, adRunId: string) {
    const adRun = await db.adRun.findFirst({
      where: { id: adRunId, advertisement: { businessId } },
    })
    if (!adRun) throw { statusCode: 404, message: 'AdRun not found' }
    if (!adRun.externalAdId) {
      throw { statusCode: 409, message: 'This run has not been sent to a platform yet' }
    }
    try {
      await this._sync(adRun)
    } catch {
      // Already recorded on the row by _sync's own catch block — nothing more to do here.
    }
    return db.adRun.findUniqueOrThrow({
      where: { id: adRunId },
      include: { mediaOrderRevision: true },
    })
  }

  // The pollable entrypoint — mirrors AutomationExecutorService.runDueAutomations' shape. One bad
  // run can't stop the tick: failures are caught, recorded on that row's own syncError, counted.
  async runDueSyncs() {
    const rows = await db.adRun.findMany({
      where: { externalAdId: { not: null }, status: { not: 'ENDED' } },
    })
    let synced = 0
    let failed = 0
    for (const row of rows) {
      try {
        await this._sync(row)
        synced++
      } catch {
        failed++
      }
    }
    return { total: rows.length, synced, failed }
  }

  private async _sync(adRun: SyncableRun) {
    if (!adRun.externalAdId) return
    const connector = tryGetConnector(adRun.platform)
    if (!connector?.capabilities.pullStatus || !connector.pullSync) {
      await db.adRun.update({ where: { id: adRun.id }, data: { syncHealth: 'DISCONNECTED' } })
      return
    }

    const advertisement = await db.advertisement.findUniqueOrThrow({
      where: { id: adRun.advertisementId },
    })
    const connection = await db.platformConnection.findUnique({
      where: {
        businessId_platform: {
          businessId: advertisement.businessId,
          platform: adRun.platform as Platform,
        },
      },
    })
    if (!connection || connection.status !== 'CONNECTED') {
      await db.adRun.update({ where: { id: adRun.id }, data: { syncHealth: 'DISCONNECTED' } })
      return
    }

    // Snapshot state before this pull so a genuinely *new* rejection or drift (not one already
    // known from a prior sync) is what gets signaled to the Activity feed — re-flagging an
    // already-known rejection on every poll tick would be noise, not a meaningful event.
    const before = await db.adRun.findUniqueOrThrow({
      where: { id: adRun.id },
      select: DRIFT_FIELDS,
    })

    try {
      const snapshot = await connector.pullSync({
        accessToken: unsealToken(connection.accessTokenEnc),
        externalAdId: adRun.externalAdId,
        externalAdSetId: adRun.externalAdSetId,
        externalCampaignId: adRun.externalCampaignId,
      })
      const updated = await db.adRun.update({
        where: { id: adRun.id },
        data: {
          providerState: snapshot.providerState,
          providerStateRaw: snapshot.providerStateRaw,
          providerIssues: snapshot.issues?.length ? snapshot.issues : Prisma.JsonNull,
          spend: snapshot.spend ?? 0,
          impressions: snapshot.impressions ?? 0,
          reach: snapshot.reach ?? 0,
          clicks: snapshot.clicks ?? 0,
          conversions: snapshot.conversions ?? 0,
          effectiveBudget: snapshot.effectiveDailyBudget ?? null,
          effectiveStartDate: snapshot.effectiveStartAt
            ? new Date(snapshot.effectiveStartAt)
            : null,
          effectiveEndDate: snapshot.effectiveEndAt ? new Date(snapshot.effectiveEndAt) : null,
          effectiveCountry: snapshot.effectiveCountry ?? null,
          effectiveLocationNote: snapshot.effectiveLocationNote ?? null,
          effectiveRadiusMiles: snapshot.effectiveRadiusMiles ?? null,
          syncHealth: 'CURRENT',
          syncError: null,
          lastSyncedAt: new Date(),
        },
        include: { advertisement: true },
      })

      const newlyRejected =
        (updated.providerState === 'REJECTED' || updated.providerState === 'LIMITED') &&
        before.providerState !== updated.providerState
      const newlyDrifted = hasDrift(updated) && !hasDrift(before)
      if (newlyRejected) {
        const reason = (updated.providerIssues as string[] | null)?.join(' ') ?? null
        await notifyAdRunEvent(
          updated.advertisement.businessId,
          updated.advertisementId,
          updated.platform,
          updated.advertisement.name,
          updated.providerState === 'REJECTED'
            ? { type: 'PROVIDER_REJECTED', reason }
            : { type: 'PROVIDER_LIMITED', reason },
        )
      }
      if (newlyDrifted) {
        await notifyAdRunEvent(
          updated.advertisement.businessId,
          updated.advertisementId,
          updated.platform,
          updated.advertisement.name,
          { type: 'DRIFT_DETECTED' },
        )
      }
    } catch (err: any) {
      // lastSyncedAt deliberately untouched — it must keep meaning "as of when data was last
      // actually refreshed," not "when we last tried and failed." The stored spend/impressions/
      // status all stay exactly as they were before this attempt.
      await db.adRun.update({
        where: { id: adRun.id },
        data: { syncHealth: 'FAILED', syncError: err?.message || String(err) },
      })
      throw err
    }
  }
}

export async function runDueAdRunSyncs() {
  return new AdRunSyncService().runDueSyncs()
}
