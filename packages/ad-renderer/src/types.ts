// Closed preset vocabularies for the Ad Designer ("a limited Canva, not a blank canvas") — see
// CLAUDE.md's Ad Designer entry. These string unions mirror the Prisma enums of the same name
// exactly (Advertisement.format/textPlacement/fontScale/textAlign/overlay/ctaPlacement/mediaFocal
// in packages/db/prisma/schema.prisma) but are declared locally, not imported from @project/db —
// this package has zero dependencies on purpose so it can be imported unmodified into apps/web
// (the browser) as well as apps/server and apps/ad-server (Node). Keep the two lists in sync by
// hand; there is no codegen link between them.

export type AdCreativeFormat = 'POSTER' | 'STORY' | 'FEED_POST'

export type AdTextPlacement =
  | 'TOP_LEFT'
  | 'TOP_CENTER'
  | 'TOP_RIGHT'
  | 'CENTER'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_CENTER'
  | 'BOTTOM_RIGHT'

export type AdFontScale = 'COMPACT' | 'STANDARD' | 'OVERSIZED'

export type AdTextAlign = 'LEFT' | 'CENTER' | 'RIGHT'

export type AdOverlayTreatment = 'NONE' | 'DARK_GRADIENT' | 'LIGHT_GRADIENT' | 'SOLID_SCRIM'

export type AdCtaPlacement = 'BENEATH_COPY' | 'INLINE_WITH_COPY' | 'FLOATING_BOTTOM' | 'TOP_BANNER'

export type AdMediaFocal = 'CENTER' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'

// The full, resolved semantic design of one creative — every field present, no arbitrary x/y or
// pixel values. Callers building this from a DB row should use `resolveAdCreativeDesign` so a
// null/legacy field always falls back to that format's preset default rather than an undefined
// class name reaching the renderer.
export type AdCreativeDesign = {
  format: AdCreativeFormat
  textPlacement: AdTextPlacement
  fontScale: AdFontScale
  textAlign: AdTextAlign
  overlay: AdOverlayTreatment
  ctaPlacement: AdCtaPlacement
  mediaFocal: AdMediaFocal
}

export type AdCreativeContent = {
  headline?: string | null
  primaryText?: string | null
  ctaLabel?: string | null
  mediaUrl?: string | null
  mediaAlt?: string | null
  // Fully resolved click-through URL (a Loopie Page's hosted URL already looked up, or the raw
  // external URL) — resolving destinationType/destinationLandingPageId into a URL is the caller's
  // job (AdvertisementService et al.), never this package's; it has no DB access at all.
  clickUrl?: string | null
  accessibleLabel?: string | null
}

export type AdCreativeInput = AdCreativeContent &
  Partial<AdCreativeDesign> & { format: AdCreativeFormat }
