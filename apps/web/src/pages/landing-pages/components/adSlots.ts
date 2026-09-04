export const AD_PLACEMENTS = [
  { id: 'AFTER_HERO', label: 'After hero' },
  { id: 'BEFORE_FORM', label: 'Before form' },
  { id: 'AFTER_FORM', label: 'After form' },
  { id: 'BOTTOM', label: 'Bottom of page' },
] as const

// One draft per LandingPageAdSlot row — filled by at most one of adRunId (a platform-run buy) or
// advertisementId (a saved Ad Designer creative, placed by direct reference). Ad Designer
// (2026-09-03) — see CLAUDE.md.
export type AdSlotDraft = {
  placement: (typeof AD_PLACEMENTS)[number]['id']
  adRunId: string | null
  advertisementId: string | null
}
