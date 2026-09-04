export const TOKEN_DEFAULTS = {
  primaryColor: '#FF2D6A',
  onPrimaryColor: '#FFFFFF',
  backgroundColor: '#FFFFFF',
  inkColor: '#0A0A0A',
  cardColor: '#F5F5F5',
  fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  headingFont: 'Syne, ui-sans-serif, system-ui, sans-serif',
  radius: '9999px',
}

export const ink = (mix: number) => `color-mix(in srgb, var(--lp-ink) ${mix}%, var(--lp-bg))`
export const inv = (mix: number) => `color-mix(in srgb, var(--lp-bg) ${mix}%, var(--lp-ink))`

/** Uppercase punch word for kinetic backdrops — prefers longer words over "We"/"A". */
export function kineticWord(text: string | undefined, fallback: string): string {
  const words = (text ?? '')
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const pick = [...words].sort((a, b) => b.length - a.length)[0] ?? fallback
  return pick.toUpperCase().slice(0, 16)
}
