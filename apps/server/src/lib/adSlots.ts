export const AD_SLOT_PLACEMENTS = ['AFTER_HERO', 'BEFORE_FORM', 'AFTER_FORM', 'BOTTOM'] as const
export type AdSlotPlacement = (typeof AD_SLOT_PLACEMENTS)[number]

export type AdSlotInput = { placement: AdSlotPlacement; adRunIds: string[] }
export type AdSlotAssignmentDTO = {
  id: string
  slotId: string
  adRunId: string
  status: string
  weight: number
}
export type AdSlotDTO = {
  id: string
  sortOrder: number
  placement: AdSlotPlacement
  assignments: AdSlotAssignmentDTO[]
}
export type AdSlotSnapshotItem = {
  placement: AdSlotPlacement
  sortOrder: number
  adRunIds: string[]
  embedUrls: string[]
}

const AD_SERVER_URL =
  process.env.AD_SERVER_URL ?? `http://localhost:${process.env.AD_SERVER_PORT ?? 3002}`

export const MAX_AD_SLOTS = 24

export function embedUrlFor(adRunId: string | null) {
  if (!adRunId) return null
  return `${AD_SERVER_URL}/embed/${adRunId}` // For V1, LOOPIE embed resolves via AdRun
}

export function snapshotSlots(
  slots: { sortOrder: number; placement: string; assignments: { adRunId: string }[] }[],
): AdSlotSnapshotItem[] {
  return slots.map((slot) => {
    const adRunIds = slot.assignments.map((a) => a.adRunId)
    return {
      placement: slot.placement as AdSlotPlacement,
      sortOrder: slot.sortOrder,
      adRunIds,
      embedUrls: adRunIds.map((id) => embedUrlFor(id)!),
    }
  })
}

export function toSlotDTO(slot: {
  id: string
  sortOrder: number
  placement: string
  assignments: { id: string; slotId: string; adRunId: string; status: string; weight: number }[]
}): AdSlotDTO {
  return {
    id: slot.id,
    sortOrder: slot.sortOrder,
    placement: slot.placement as AdSlotPlacement,
    assignments: slot.assignments,
  }
}

export function asPlacement(value: string): AdSlotPlacement {
  if ((AD_SLOT_PLACEMENTS as readonly string[]).includes(value)) return value as AdSlotPlacement
  throw { statusCode: 400, message: 'Invalid ad slot placement' }
}
