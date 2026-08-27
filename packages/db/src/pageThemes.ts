export type PageThemePreset = {
  id: string
  name: string
  primaryColor: string
  backgroundColor: string
  inkColor: string
  cardColor: string
  fontFamily: string
  headingFont: string
  googleFonts: string
}

export const PAGE_THEME_PRESETS: PageThemePreset[] = [
  {
    id: 'carbon',
    name: 'Carbon',
    primaryColor: '#0B3D91',
    backgroundColor: '#E8EEF4',
    inkColor: '#122033',
    cardColor: '#FFFFFF',
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    headingFont: '"IBM Plex Serif", Georgia, serif',
    googleFonts: 'family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@600',
  },
  {
    id: 'shopfront',
    name: 'Shopfront',
    primaryColor: '#C8102E',
    backgroundColor: '#FFFFFF',
    inkColor: '#111111',
    cardColor: '#F4F4F4',
    fontFamily: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Oswald, "Arial Narrow", sans-serif',
    googleFonts: 'family=Oswald:wght@500;600&family=Source+Sans+3:wght@400;600',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    primaryColor: '#1F3D2B',
    backgroundColor: '#E4E0D7',
    inkColor: '#1A1714',
    cardColor: '#F3F0EA',
    fontFamily: 'Karla, ui-sans-serif, system-ui, sans-serif',
    headingFont: 'Newsreader, Georgia, serif',
    googleFonts: 'family=Karla:wght@400;600&family=Newsreader:wght@500;600',
  },
  {
    id: 'night-desk',
    name: 'Night desk',
    primaryColor: '#8FA8FF',
    backgroundColor: '#0C1222',
    inkColor: '#E7ECF4',
    cardColor: '#161D30',
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    headingFont: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    googleFonts: 'family=IBM+Plex+Sans:wght@400;500;600',
  },
]

export function themeFromPreset(preset: PageThemePreset): Record<string, string> {
  return {
    presetId: preset.id,
    primaryColor: preset.primaryColor,
    backgroundColor: preset.backgroundColor,
    inkColor: preset.inkColor,
    cardColor: preset.cardColor,
    fontFamily: preset.fontFamily,
    headingFont: preset.headingFont,
    googleFonts: preset.googleFonts,
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
