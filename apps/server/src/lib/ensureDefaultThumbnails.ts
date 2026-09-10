import { db } from '@project/db'
import { PageThumbnailService } from '../services/PageThumbnailService'

/**
 * Best-effort, self-healing regen of the system Page Layout preview thumbnails — called once
 * after the server starts listening (apps/server/src/index.ts), never before, so a slow or
 * failed Playwright capture cycle can never delay startup or fail a Railway health check. The
 * caller is expected to catch/log, never propagate: a missing preview image is a cosmetic gap,
 * not a reason to take the API down.
 *
 * Skips entirely once every system template already has a previewImageUrl (the common case on
 * every boot after the first) — PageThumbnailService.regenerateAllSystemLayouts() itself always
 * re-enqueues unconditionally regardless of checksum, so this count check is what actually makes
 * repeat boots cheap rather than re-capturing on every deploy.
 */
export async function ensureDefaultThumbnails() {
  const missing = await db.landingPageTemplate.count({
    where: { isSystem: true, previewImageUrl: null },
  })
  if (missing === 0) return { skipped: true as const }

  const service = new PageThumbnailService()
  const enqueued = await service.regenerateAllSystemLayouts()
  let remaining = enqueued
  while (remaining > 0) {
    const processed = await service.processPending(5)
    if (processed === 0) break
    remaining -= processed
  }
  const synced = await service.syncSystemLayoutPreviewImages()
  return { skipped: false as const, enqueued, synced }
}
