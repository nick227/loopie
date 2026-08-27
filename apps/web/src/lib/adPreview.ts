export type PreviewFrameId = 'desktop' | 'mobile'

export type PreviewFrame = {
  id: PreviewFrameId
  label: string
}

export const PREVIEW_FRAMES: PreviewFrame[] = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'mobile', label: 'Mobile' },
]

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
