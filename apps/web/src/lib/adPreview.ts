export type PreviewFrameId = 'native' | '1:1' | '4:5' | '9:16' | '16:9'

export type PreviewFrame = {
  id: PreviewFrameId
  label: string
  ratio: number | null
}

export const PREVIEW_FRAMES: PreviewFrame[] = [
  { id: 'native', label: 'Native', ratio: null },
  { id: '1:1', label: 'Meta Feed', ratio: 1 },
  { id: '4:5', label: 'Meta Feed', ratio: 4 / 5 },
  { id: '9:16', label: 'Reels / TikTok', ratio: 9 / 16 },
  { id: '16:9', label: 'YouTube', ratio: 16 / 9 },
]

export const PREVIEW_MAX = 280
export const RATIO_TOLERANCE = 0.03

export type PostTarget = {
  key: string
  platform: 'META' | 'TIKTOK'
  placement: string
  label: string
  types: Array<'IMAGE' | 'VIDEO' | 'TEXT'>
}

export const POST_TARGETS: PostTarget[] = [
  {
    key: 'META_FEED',
    platform: 'META',
    placement: 'FEED',
    label: 'Meta Feed',
    types: ['IMAGE', 'VIDEO'],
  },
  { key: 'META_REEL', platform: 'META', placement: 'REEL', label: 'Meta Reels', types: ['VIDEO'] },
  { key: 'TIKTOK_FEED', platform: 'TIKTOK', placement: 'FEED', label: 'TikTok', types: ['VIDEO'] },
]

export function parseAspectRatio(
  aspectRatio?: string | null,
  widthPx?: number | null,
  heightPx?: number | null,
): number | null {
  if (widthPx && heightPx) return widthPx / heightPx
  if (!aspectRatio) return null
  const [w, h] = aspectRatio.split(':').map(Number)
  if (!w || !h) return null
  return w / h
}

export function frameBox(ratio: number, scale: number) {
  const max = PREVIEW_MAX * scale
  if (ratio >= 1) return { width: max, height: max / ratio }
  return { width: max * ratio, height: max }
}

export function ratioFits(mediaRatio: number, frameRatio: number) {
  return Math.abs(mediaRatio - frameRatio) / frameRatio <= RATIO_TOLERANCE
}
