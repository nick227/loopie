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

export const DEFAULT_PAGE_THEME = themeFromPreset(PAGE_THEME_PRESETS[0]!)

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
