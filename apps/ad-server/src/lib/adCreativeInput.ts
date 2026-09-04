import { db, absoluteMediaUrl } from '@project/db'
import type { AdCreativeInput } from '@project/ad-renderer'

// apps/server's own public URL — where locally-stored Asset.url paths (e.g. "/uploads/x.png")
// actually live. Both services load the same root .env (see package.json's `--env-file=../../.env`),
// so TRACKING_BASE_URL is already set here; the localhost:3001 fallback only matters if that ever
// changes.
const ASSET_ORIGIN = process.env.TRACKING_BASE_URL ?? 'http://localhost:3001'

// The one place a frozen PublishedAdvertisementVersion row turns into the AdCreativeInput that
// @project/ad-renderer actually renders — used by both the public embed route (/v1/embed/:publicId
// -> EmbedServingService) and the direct internal route (/ads/:advertisementId/embed, for a Loopie
// Page's own ad-slot iframe). Both routes call this, then both call the exact same render
// function — see CLAUDE.md's Ad Designer "CRITICAL RENDERING REQUIREMENT".
export async function buildAdCreativeInput(version: {
  creativeSnapshot: unknown
  format: string | null
  destinationUrl?: string | null
}): Promise<AdCreativeInput> {
  const snapshot = (version.creativeSnapshot ?? {}) as Record<string, unknown>
  const assetIds = Array.isArray(snapshot.assets) ? (snapshot.assets as string[]) : []
  const assets = assetIds.length ? await db.asset.findMany({ where: { id: { in: assetIds } } }) : []
  const image = assets.find((a) => a.type === 'IMAGE')

  const str = (value: unknown): string | null => (typeof value === 'string' ? value : null)

  return {
    // A pre-Ad-Designer generic ad has no format at all — default to FEED_POST (a square) so it
    // still renders through the shared renderer rather than the old hand-rolled stub disappearing
    // with nothing to replace it.
    format: (version.format ??
      (snapshot.format as string | undefined) ??
      'FEED_POST') as AdCreativeInput['format'],
    headline: str(snapshot.headline),
    primaryText: str(snapshot.primaryText),
    ctaLabel: str(snapshot.ctaLabel),
    mediaUrl: absoluteMediaUrl(image?.url, ASSET_ORIGIN),
    mediaAlt: str(snapshot.headline),
    clickUrl: version.destinationUrl ?? str(snapshot.destinationUrl),
    accessibleLabel: str(snapshot.accessibleLabel),
    textPlacement: snapshot.textPlacement as AdCreativeInput['textPlacement'],
    fontScale: snapshot.fontScale as AdCreativeInput['fontScale'],
    textAlign: snapshot.textAlign as AdCreativeInput['textAlign'],
    overlay: snapshot.overlay as AdCreativeInput['overlay'],
    ctaPlacement: snapshot.ctaPlacement as AdCreativeInput['ctaPlacement'],
    mediaFocal: snapshot.mediaFocal as AdCreativeInput['mediaFocal'],
  }
}
