// Hand-synced copy of packages/db/src/pageThemes.ts — apps/web doesn't depend on @project/db for
// these shapes (see docs/architecture/landing-page-layouts-and-themes.md's "hand-synced types"
// pitfall). Keep both files' values identical whenever either changes.
//
// Brought back to parity with the server's full 6 presets in this pass (was silently down to 4,
// missing brutalist-studio/editorial-portfolio — real pre-existing drift, unrelated to Phase 4,
// fixed while this file was open anyway). Also dropped the old `spacing` field: confirmed dead
// (grep found no reader anywhere outside this file's own themeFromPreset) — an earlier,
// never-wired density-axis attempt, consistent with Phase 4's explicit decision that density
// stays a Layout-declared affordance, not a universal style axis, not something to revive here.

export type PageThemePreset = {
  id: string
  name: string
  primaryColor: string
  onPrimaryColor: string
  backgroundColor: string
  inkColor: string
  cardColor: string
  fontFamily: string
  headingFont: string
  googleFonts: string
  radius: string
}

export const PAGE_THEME_PRESETS: PageThemePreset[] = [
  {
    id: 'carbon',
    name: 'Carbon',
    primaryColor: '#FF2D6A',
    onPrimaryColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    inkColor: '#0A0A0A',
    cardColor: '#F5F5F5',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Syne, ui-sans-serif, system-ui, sans-serif',
    googleFonts: 'family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800',
    radius: '9999px',
  },
  {
    id: 'shopfront',
    name: 'Shopfront',
    primaryColor: '#111111',
    onPrimaryColor: '#FFFFFF',
    backgroundColor: '#F5D000',
    inkColor: '#111111',
    cardColor: '#FFFFFF',
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
    headingFont: '"Archivo Black", "Arial Black", sans-serif',
    googleFonts: 'family=Archivo+Black&family=Manrope:wght@400;500;600;700',
    radius: '0',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    primaryColor: '#1A1F3C',
    onPrimaryColor: '#F7EFE6',
    backgroundColor: '#E8782A',
    inkColor: '#1A1F3C',
    cardColor: '#F7EFE6',
    fontFamily: 'Karla, ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Fraunces, Georgia, serif',
    googleFonts: 'family=Karla:wght@400;600;700&family=Fraunces:wght@500;600;700',
    radius: '0',
  },
  {
    id: 'night-desk',
    name: 'Night desk',
    primaryColor: '#C4B5FF',
    onPrimaryColor: '#1A0530',
    backgroundColor: '#2A0A4A',
    inkColor: '#F4EEFF',
    cardColor: '#3B1A66',
    fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    headingFont: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    googleFonts: 'family=Space+Grotesk:wght@400;500;600;700',
    radius: '9999px',
  },
  {
    id: 'brutalist-studio',
    name: 'Brutalist Studio',
    primaryColor: '#F93900',
    onPrimaryColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    inkColor: '#000000',
    cardColor: '#F0F0F0',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    headingFont: '"Archivo Black", "Arial Black", sans-serif',
    googleFonts: 'family=Archivo+Black&family=DM+Sans:wght@400;500;600;700',
    radius: '0',
  },
  {
    id: 'editorial-portfolio',
    name: 'Editorial Portfolio',
    primaryColor: '#9C998F',
    onPrimaryColor: '#1A1A1A',
    backgroundColor: '#121212',
    inkColor: '#F5F5F0',
    cardColor: '#1E1E1E',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Fraunces, Georgia, serif',
    googleFonts:
      'family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500',
    radius: '0',
  },
]

export function themeFromPreset(preset: PageThemePreset): Record<string, string> {
  return {
    presetId: preset.id,
    primaryColor: preset.primaryColor,
    onPrimaryColor: preset.onPrimaryColor,
    backgroundColor: preset.backgroundColor,
    inkColor: preset.inkColor,
    cardColor: preset.cardColor,
    fontFamily: preset.fontFamily,
    headingFont: preset.headingFont,
    googleFonts: preset.googleFonts,
    radius: preset.radius,
  }
}

export function matchThemePreset(
  theme: Record<string, string>,
  presets: PageThemePreset[] = PAGE_THEME_PRESETS,
): PageThemePreset {
  const byId = presets.find((preset) => preset.id === theme.presetId)
  if (byId) return byId
  const byTokens = presets.find(
    (preset) =>
      preset.primaryColor === theme.primaryColor && preset.fontFamily === theme.fontFamily,
  )
  return byTokens ?? presets[0]!
}

export function presetsFromSchema(schema: unknown): PageThemePreset[] {
  const presets = (schema as { themePresets?: PageThemePreset[] } | undefined)?.themePresets
  return Array.isArray(presets) && presets.length > 0 ? presets : PAGE_THEME_PRESETS
}

// ---------- Style axes (Pages Phase 4, 2026-09-10) ----------
// Mirrors packages/db/src/pageThemes.ts's own axis section exactly — see its doc comment for the
// full rationale (palette/typography/shape only, motion/density deliberately excluded).

export type PaletteOption = {
  id: string
  name: string
  primaryColor: string
  onPrimaryColor: string
  backgroundColor: string
  inkColor: string
  cardColor: string
}

export type TypographyOption = {
  id: string
  name: string
  fontFamily: string
  headingFont: string
  googleFonts: string
}

export type ShapeOption = {
  id: string
  name: string
  radius: string
}

export type StyleBundle = {
  id: string
  name: string
  paletteId: string
  typographyId: string
  shapeId: string
}

export const PALETTE_OPTIONS: PaletteOption[] = [
  {
    id: 'carbon',
    name: 'Carbon',
    primaryColor: '#FF2D6A',
    onPrimaryColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    inkColor: '#0A0A0A',
    cardColor: '#F5F5F5',
  },
  {
    id: 'shopfront',
    name: 'Shopfront',
    primaryColor: '#111111',
    onPrimaryColor: '#FFFFFF',
    backgroundColor: '#F5D000',
    inkColor: '#111111',
    cardColor: '#FFFFFF',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    primaryColor: '#1A1F3C',
    onPrimaryColor: '#F7EFE6',
    backgroundColor: '#E8782A',
    inkColor: '#1A1F3C',
    cardColor: '#F7EFE6',
  },
  {
    id: 'night-desk',
    name: 'Night desk',
    primaryColor: '#C4B5FF',
    onPrimaryColor: '#1A0530',
    backgroundColor: '#2A0A4A',
    inkColor: '#F4EEFF',
    cardColor: '#3B1A66',
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    primaryColor: '#F93900',
    onPrimaryColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    inkColor: '#000000',
    cardColor: '#F0F0F0',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    primaryColor: '#9C998F',
    onPrimaryColor: '#1A1A1A',
    backgroundColor: '#121212',
    inkColor: '#F5F5F0',
    cardColor: '#1E1E1E',
  },
]

export const TYPOGRAPHY_OPTIONS: TypographyOption[] = [
  {
    id: 'dm-sans-syne',
    name: 'DM Sans / Syne',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Syne, ui-sans-serif, system-ui, sans-serif',
    googleFonts: 'family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800',
  },
  {
    id: 'manrope-archivo',
    name: 'Manrope / Archivo Black',
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
    headingFont: '"Archivo Black", "Arial Black", sans-serif',
    googleFonts: 'family=Archivo+Black&family=Manrope:wght@400;500;600;700',
  },
  {
    id: 'karla-fraunces',
    name: 'Karla / Fraunces',
    fontFamily: 'Karla, ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Fraunces, Georgia, serif',
    googleFonts: 'family=Karla:wght@400;600;700&family=Fraunces:wght@500;600;700',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    headingFont: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    googleFonts: 'family=Space+Grotesk:wght@400;500;600;700',
  },
  {
    id: 'dm-sans-archivo',
    name: 'DM Sans / Archivo Black',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    headingFont: '"Archivo Black", "Arial Black", sans-serif',
    googleFonts: 'family=Archivo+Black&family=DM+Sans:wght@400;500;600;700',
  },
  {
    id: 'inter-fraunces',
    name: 'Inter / Fraunces',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Fraunces, Georgia, serif',
    googleFonts:
      'family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500',
  },
]

export const SHAPE_OPTIONS: ShapeOption[] = [
  { id: 'rounded', name: 'Rounded', radius: '9999px' },
  { id: 'sharp', name: 'Sharp', radius: '0' },
]

export const STYLE_BUNDLES: StyleBundle[] = [
  {
    id: 'carbon',
    name: 'Carbon',
    paletteId: 'carbon',
    typographyId: 'dm-sans-syne',
    shapeId: 'rounded',
  },
  {
    id: 'shopfront',
    name: 'Shopfront',
    paletteId: 'shopfront',
    typographyId: 'manrope-archivo',
    shapeId: 'sharp',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    paletteId: 'workshop',
    typographyId: 'karla-fraunces',
    shapeId: 'sharp',
  },
  {
    id: 'night-desk',
    name: 'Night desk',
    paletteId: 'night-desk',
    typographyId: 'space-grotesk',
    shapeId: 'rounded',
  },
  {
    id: 'brutalist-studio',
    name: 'Brutalist Studio',
    paletteId: 'brutalist',
    typographyId: 'dm-sans-archivo',
    shapeId: 'sharp',
  },
  {
    id: 'editorial-portfolio',
    name: 'Editorial Portfolio',
    paletteId: 'editorial',
    typographyId: 'inter-fraunces',
    shapeId: 'sharp',
  },
]

export function themeFromAxes(
  palette: PaletteOption,
  typography: TypographyOption,
  shape: ShapeOption,
): Record<string, string> {
  return {
    primaryColor: palette.primaryColor,
    onPrimaryColor: palette.onPrimaryColor,
    backgroundColor: palette.backgroundColor,
    inkColor: palette.inkColor,
    cardColor: palette.cardColor,
    fontFamily: typography.fontFamily,
    headingFont: typography.headingFont,
    googleFonts: typography.googleFonts,
    radius: shape.radius,
  }
}

export function matchPalette(theme: Record<string, string>): PaletteOption {
  return (
    PALETTE_OPTIONS.find(
      (p) => p.primaryColor === theme.primaryColor && p.backgroundColor === theme.backgroundColor,
    ) ?? PALETTE_OPTIONS[0]!
  )
}

export function matchTypography(theme: Record<string, string>): TypographyOption {
  return (
    TYPOGRAPHY_OPTIONS.find(
      (t) => t.fontFamily === theme.fontFamily && t.headingFont === theme.headingFont,
    ) ?? TYPOGRAPHY_OPTIONS[0]!
  )
}

export function matchShape(theme: Record<string, string>): ShapeOption {
  return SHAPE_OPTIONS.find((s) => s.radius === theme.radius) ?? SHAPE_OPTIONS[0]!
}

export function matchBundle(theme: Record<string, string>): StyleBundle | null {
  const palette = matchPalette(theme)
  const typography = matchTypography(theme)
  const shape = matchShape(theme)
  return (
    STYLE_BUNDLES.find(
      (b) =>
        b.paletteId === palette.id && b.typographyId === typography.id && b.shapeId === shape.id,
    ) ?? null
  )
}
