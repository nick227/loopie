import type {
  AdCreativeDesign,
  AdCreativeFormat,
  AdCtaPlacement,
  AdFontScale,
  AdMediaFocal,
  AdOverlayTreatment,
  AdTextAlign,
  AdTextPlacement,
} from './types'

// Per-format defaults — the worked example from CLAUDE.md's Ad Designer spec ("Poster: text
// bottom-left, size oversized, overlay dark-gradient, CTA beneath copy") is FORMAT_DEFAULTS.POSTER
// below, verbatim. Used both server-side (AdvertisementService fills unset fields from these on
// create/update) and client-side (the Designer starts a new creative from these).
export const FORMAT_DEFAULTS: Record<AdCreativeFormat, AdCreativeDesign> = {
  POSTER: {
    format: 'POSTER',
    textPlacement: 'BOTTOM_LEFT',
    fontScale: 'OVERSIZED',
    textAlign: 'LEFT',
    overlay: 'DARK_GRADIENT',
    ctaPlacement: 'BENEATH_COPY',
    mediaFocal: 'CENTER',
  },
  STORY: {
    format: 'STORY',
    textPlacement: 'BOTTOM_CENTER',
    fontScale: 'OVERSIZED',
    textAlign: 'CENTER',
    overlay: 'DARK_GRADIENT',
    ctaPlacement: 'FLOATING_BOTTOM',
    mediaFocal: 'CENTER',
  },
  FEED_POST: {
    format: 'FEED_POST',
    textPlacement: 'BOTTOM_LEFT',
    fontScale: 'STANDARD',
    textAlign: 'LEFT',
    overlay: 'SOLID_SCRIM',
    ctaPlacement: 'INLINE_WITH_COPY',
    mediaFocal: 'CENTER',
  },
}

// Intrinsic aspect ratio per format — the one thing about a format that is NOT a user-choosable
// preset (a Poster is portrait, a Story is tall, a Feed Post is square, full stop).
export const FORMAT_ASPECT_RATIO: Record<AdCreativeFormat, string> = {
  POSTER: '4 / 5',
  STORY: '9 / 16',
  FEED_POST: '1 / 1',
}

export const AD_CREATIVE_FORMATS: {
  value: AdCreativeFormat
  label: string
  description: string
}[] = [
  { value: 'POSTER', label: 'Poster', description: 'Bold, portrait — a printable-feeling promo.' },
  {
    value: 'STORY',
    label: 'Story',
    description: 'Tall and full-bleed, built for a vertical feed.',
  },
  { value: 'FEED_POST', label: 'Feed Post', description: 'Square, native to a scrolling feed.' },
]

export const TEXT_PLACEMENT_OPTIONS: { value: AdTextPlacement; label: string }[] = [
  { value: 'TOP_LEFT', label: 'Top left' },
  { value: 'TOP_CENTER', label: 'Top center' },
  { value: 'TOP_RIGHT', label: 'Top right' },
  { value: 'CENTER', label: 'Center' },
  { value: 'BOTTOM_LEFT', label: 'Bottom left' },
  { value: 'BOTTOM_CENTER', label: 'Bottom center' },
  { value: 'BOTTOM_RIGHT', label: 'Bottom right' },
]

export const FONT_SCALE_OPTIONS: { value: AdFontScale; label: string }[] = [
  { value: 'COMPACT', label: 'Compact' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'OVERSIZED', label: 'Oversized' },
]

export const TEXT_ALIGN_OPTIONS: { value: AdTextAlign; label: string }[] = [
  { value: 'LEFT', label: 'Left' },
  { value: 'CENTER', label: 'Center' },
  { value: 'RIGHT', label: 'Right' },
]

export const OVERLAY_OPTIONS: { value: AdOverlayTreatment; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'DARK_GRADIENT', label: 'Dark gradient' },
  { value: 'LIGHT_GRADIENT', label: 'Light gradient' },
  { value: 'SOLID_SCRIM', label: 'Solid scrim' },
]

export const CTA_PLACEMENT_OPTIONS: { value: AdCtaPlacement; label: string }[] = [
  { value: 'BENEATH_COPY', label: 'Beneath copy' },
  { value: 'INLINE_WITH_COPY', label: 'Inline with copy' },
  { value: 'FLOATING_BOTTOM', label: 'Floating at bottom' },
  { value: 'TOP_BANNER', label: 'Top banner' },
]

export const MEDIA_FOCAL_OPTIONS: { value: AdMediaFocal; label: string }[] = [
  { value: 'CENTER', label: 'Center' },
  { value: 'TOP', label: 'Top' },
  { value: 'BOTTOM', label: 'Bottom' },
  { value: 'LEFT', label: 'Left' },
  { value: 'RIGHT', label: 'Right' },
]

// Fills any unset design field from that format's preset default — the single place "what does an
// unset field render as" is decided, shared by every writer (AdvertisementService) and reader
// (the renderer itself, defensively, in case an old/partial row reaches it).
export function resolveAdCreativeDesign(
  format: AdCreativeFormat,
  partial: Partial<AdCreativeDesign> = {},
): AdCreativeDesign {
  const base = FORMAT_DEFAULTS[format]
  return {
    format,
    textPlacement: partial.textPlacement ?? base.textPlacement,
    fontScale: partial.fontScale ?? base.fontScale,
    textAlign: partial.textAlign ?? base.textAlign,
    overlay: partial.overlay ?? base.overlay,
    ctaPlacement: partial.ctaPlacement ?? base.ctaPlacement,
    mediaFocal: partial.mediaFocal ?? base.mediaFocal,
  }
}
