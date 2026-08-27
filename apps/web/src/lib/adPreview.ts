export type PreviewFrameId = 'native' | 'meta' | 'tiktok' | 'youtube' | 'pages'

export type PreviewFrame = {
  id: PreviewFrameId
  label: string
  ratio: number | null
  chrome: 'none' | 'phone' | 'player' | 'page'
}

export const PREVIEW_FRAMES: PreviewFrame[] = [
  { id: 'native', label: 'Original', ratio: null, chrome: 'none' },
  { id: 'meta', label: 'Meta', ratio: 4 / 5, chrome: 'phone' },
  { id: 'tiktok', label: 'TikTok', ratio: 9 / 16, chrome: 'phone' },
  { id: 'youtube', label: 'YouTube', ratio: 16 / 9, chrome: 'player' },
  { id: 'pages', label: 'Pages', ratio: 16 / 9, chrome: 'page' },
]

export const PREVIEW_MAX = 320
export const RATIO_TOLERANCE = 0.03

export type PaidTarget = {
  key: 'META_FEED' | 'META_REEL' | 'TIKTOK_FEED'
  platform: 'META' | 'TIKTOK'
  placement: string
  label: string
  types: Array<'IMAGE' | 'VIDEO' | 'TEXT'>
}

export const PAID_TARGETS: PaidTarget[] = [
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

export function pageKey(pageId: string) {
  return `page:${pageId}`
}

export function pageIdFromKey(key: string) {
  return key.startsWith('page:') ? key.slice(5) : null
}

export function runDestinationKey(run: {
  platform: string
  placement?: string | null
  destinationLandingPageId?: string | null
}) {
  if (run.platform === 'LOOPIE' && run.destinationLandingPageId) {
    return pageKey(run.destinationLandingPageId)
  }
  if (run.platform === 'META' && run.placement === 'REEL') return 'META_REEL'
  if (run.platform === 'TIKTOK') return 'TIKTOK_FEED'
  if (run.platform === 'META') return 'META_FEED'
  return `${run.platform}_${run.placement ?? 'FEED'}`
}

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
