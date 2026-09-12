// Scroll-linked solid color plane — mirrors Studio's ColorWash in the React canvas. Only ever used
// by Studio's own section overrides (behaviors/scrollEffects.ts animates it via the wash's own
// data attributes at scroll time).
export function colorWash(index: number, tone: 'bg' | 'ink' | 'primary' | 'card' = 'bg'): string {
  const edges = ['bottom', 'left', 'top', 'right', 'bottom'] as const
  const byTone: Record<typeof tone, ReadonlyArray<'ink' | 'primary' | 'bg' | 'card'>> = {
    bg: ['primary', 'ink'],
    card: ['primary', 'ink'],
    ink: ['primary', 'bg'],
    primary: ['ink', 'bg'],
  }
  const colors = byTone[tone]
  const color = colors[index % colors.length]!
  const edge = edges[index % edges.length]!
  return `<div class="lp-color-wash" data-lp-wash-color="${color}" data-lp-wash-edge="${edge}" aria-hidden="true"></div>`
}
