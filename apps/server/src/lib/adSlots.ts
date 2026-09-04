import { db } from '@project/db'
import type { AdCreativeFormat } from '@project/ad-renderer'

export const AD_SLOT_PLACEMENTS = ['AFTER_HERO', 'BEFORE_FORM', 'AFTER_FORM', 'BOTTOM'] as const
export type AdSlotPlacement = (typeof AD_SLOT_PLACEMENTS)[number]

// Visual sizing context, independent of placement — Ad Designer (2026-09-03). Purely a page-
// authoring choice ("how much room does this ad get here"); the ad's own shape (POSTER/STORY/
// FEED_POST) never changes, only how large a box it's given.
export const AD_SLOT_CONTEXTS = ['INLINE', 'CONTAINED', 'PROMOTIONAL'] as const
export type AdSlotContext = (typeof AD_SLOT_CONTEXTS)[number]

export type AdSlotInput = {
  placement: AdSlotPlacement
  context?: AdSlotContext
  adRunIds: string[]
  // Ad Designer (2026-09-03) — a saved Advertisement placed by direct reference, the sibling of
  // adRunIds above. A slot can mix both kinds of candidate.
  advertisementIds?: string[]
}
export type AdSlotAssignmentDTO = {
  id: string
  slotId: string
  adRunId: string | null
  advertisementId: string | null
  status: string
  weight: number
}
export type AdSlotDTO = {
  id: string
  sortOrder: number
  placement: AdSlotPlacement
  context: AdSlotContext
  assignments: AdSlotAssignmentDTO[]
}
export type AdSlotEmbedItem = {
  embedUrl: string
  // Known (and thus sizeable without distortion) only for an Advertisement-backed item — an
  // adRunId-backed legacy/platform item has no fixed shape, same as before this pass.
  format: AdCreativeFormat | null
}
export type AdSlotSnapshotItem = {
  placement: AdSlotPlacement
  sortOrder: number
  context: AdSlotContext
  adRunIds: string[]
  advertisementIds: string[]
  items: AdSlotEmbedItem[]
}

const AD_SERVER_URL =
  process.env.AD_SERVER_URL ?? `http://localhost:${process.env.AD_SERVER_PORT ?? 3002}`

export const MAX_AD_SLOTS = 24

export function embedUrlFor(adRunId: string | null) {
  if (!adRunId) return null
  return `${AD_SERVER_URL}/embed/${adRunId}` // For V1, LOOPIE embed resolves via AdRun
}

// Direct, trusted, no-nonce route (see apps/ad-server's routes.ts) — for our own Page iframing our
// own ad-server, not the public/third-party embed-code path (that stays on the EmbedDeployment
// publicId + domain-policy flow). Both routes render through the exact same
// @project/ad-renderer function; this one is just simpler because there's no external trust
// boundary to police.
export function embedUrlForAdvertisement(advertisementId: string) {
  return `${AD_SERVER_URL}/ads/${advertisementId}/embed`
}

export async function snapshotSlots(
  slots: {
    sortOrder: number
    placement: string
    context?: string | null
    assignments: { adRunId: string | null; advertisementId: string | null }[]
  }[],
): Promise<AdSlotSnapshotItem[]> {
  const advertisementIds = [
    ...new Set(
      slots.flatMap((slot) =>
        slot.assignments.map((a) => a.advertisementId).filter((v): v is string => !!v),
      ),
    ),
  ]
  const formatByAdvertisementId = new Map<string, AdCreativeFormat | null>()
  if (advertisementIds.length) {
    const rows = await db.advertisement.findMany({
      where: { id: { in: advertisementIds } },
      select: { id: true, format: true },
    })
    for (const row of rows)
      formatByAdvertisementId.set(row.id, row.format as AdCreativeFormat | null)
  }

  return slots.map((slot) => {
    const adRunIds = slot.assignments.map((a) => a.adRunId).filter((v): v is string => !!v)
    const advertisementIdsForSlot = slot.assignments
      .map((a) => a.advertisementId)
      .filter((v): v is string => !!v)
    const items: AdSlotEmbedItem[] = [
      ...adRunIds.map((id) => ({ embedUrl: embedUrlFor(id)!, format: null })),
      ...advertisementIdsForSlot.map((id) => ({
        embedUrl: embedUrlForAdvertisement(id),
        format: formatByAdvertisementId.get(id) ?? null,
      })),
    ]
    return {
      placement: slot.placement as AdSlotPlacement,
      sortOrder: slot.sortOrder,
      context: asContext(slot.context ?? 'CONTAINED'),
      adRunIds,
      advertisementIds: advertisementIdsForSlot,
      items,
    }
  })
}

export function toSlotDTO(slot: {
  id: string
  sortOrder: number
  placement: string
  context?: string | null
  assignments: {
    id: string
    slotId: string
    adRunId: string | null
    advertisementId: string | null
    status: string
    weight: number
  }[]
}): AdSlotDTO {
  return {
    id: slot.id,
    sortOrder: slot.sortOrder,
    placement: slot.placement as AdSlotPlacement,
    context: asContext(slot.context ?? 'CONTAINED'),
    assignments: slot.assignments,
  }
}

export function asPlacement(value: string): AdSlotPlacement {
  if ((AD_SLOT_PLACEMENTS as readonly string[]).includes(value)) return value as AdSlotPlacement
  throw { statusCode: 400, message: 'Invalid ad slot placement' }
}

export function asContext(value: string): AdSlotContext {
  if ((AD_SLOT_CONTEXTS as readonly string[]).includes(value)) return value as AdSlotContext
  throw { statusCode: 400, message: 'Invalid ad slot context' }
}
