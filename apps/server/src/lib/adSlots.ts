export const AD_SLOT_PLACEMENTS = ['AFTER_HERO', 'BEFORE_FORM', 'AFTER_FORM', 'BOTTOM'] as const
export type AdSlotPlacement = (typeof AD_SLOT_PLACEMENTS)[number]

export type AdSlotInput = { placement: AdSlotPlacement; adUnitId: string | null }
export type AdSlotDTO = {
  id: string
  sortOrder: number
  placement: AdSlotPlacement
  adUnitId: string | null
}
export type AdSlotSnapshotItem = {
  placement: AdSlotPlacement
  sortOrder: number
  adUnitId: string | null
  embedUrl: string | null
}

const AD_SERVER_URL =
  process.env.AD_SERVER_URL ?? `http://localhost:${process.env.AD_SERVER_PORT ?? 3002}`

export const MAX_AD_SLOTS = 24

export function embedUrlFor(adUnitId: string | null) {
  if (!adUnitId) return null
  return `${AD_SERVER_URL}/embed/${adUnitId}`
}

export function snapshotSlots(
  slots: { sortOrder: number; placement: string; adUnitId: string | null }[],
): AdSlotSnapshotItem[] {
  return slots.map((slot) => ({
    placement: slot.placement as AdSlotPlacement,
    sortOrder: slot.sortOrder,
    adUnitId: slot.adUnitId,
    embedUrl: embedUrlFor(slot.adUnitId),
  }))
}

export function toSlotDTO(slot: {
  id: string
  sortOrder: number
  placement: string
  adUnitId: string | null
}): AdSlotDTO {
  return {
    id: slot.id,
    sortOrder: slot.sortOrder,
    placement: slot.placement as AdSlotPlacement,
    adUnitId: slot.adUnitId,
  }
}

export function asPlacement(value: string): AdSlotPlacement {
  if ((AD_SLOT_PLACEMENTS as readonly string[]).includes(value)) return value as AdSlotPlacement
  throw { statusCode: 400, message: 'Invalid ad slot placement' }
}
