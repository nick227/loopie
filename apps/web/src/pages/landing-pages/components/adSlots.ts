export const AD_PLACEMENTS = [
  { id: 'AFTER_HERO', label: 'After hero' },
  { id: 'BEFORE_FORM', label: 'Before form' },
  { id: 'AFTER_FORM', label: 'After form' },
  { id: 'BOTTOM', label: 'Bottom of page' },
] as const

export type AdSlotDraft = {
  placement: (typeof AD_PLACEMENTS)[number]['id']
  adUnitId: string | null
}
