export const PLACEMENTS = [
  { id: 'SQUARE', label: '1:1', ratio: 1, role: 'Feed' },
  { id: 'PORTRAIT', label: '4:5', ratio: 4 / 5, role: 'Feed' },
  { id: 'STORY', label: '9:16', ratio: 9 / 16, role: 'Story' },
  { id: 'LANDSCAPE', label: '16:9', ratio: 16 / 9, role: 'Landscape' },
] as const

export type PlacementId = (typeof PLACEMENTS)[number]['id']

const RATIO_TOLERANCE = 0.03

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

export function aspectRatio(widthPx: number, heightPx: number): string {
  const g = gcd(widthPx, heightPx)
  return `${widthPx / g}:${heightPx / g}`
}

export function matchPlacements(widthPx: number, heightPx: number): PlacementId[] {
  const actual = widthPx / heightPx
  return PLACEMENTS.filter(
    (row) => Math.abs(actual - row.ratio) / row.ratio <= RATIO_TOLERANCE,
  ).map((row) => row.id)
}
