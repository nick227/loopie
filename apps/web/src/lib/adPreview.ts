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
  key: 'META_FEED' | 'GOOGLE_DISPLAY' | 'GOOGLE_YOUTUBE'
  platform: 'META' | 'GOOGLE'
  placement: string
  brand: string
  format: string
  where: string
  types: Array<'IMAGE' | 'VIDEO' | 'TEXT'>
}

export const PAID_TARGETS: PaidTarget[] = [
  {
    key: 'META_FEED',
    platform: 'META',
    placement: 'FEED',
    brand: 'Facebook',
    format: 'Feed',
    where: 'Facebook Feed',
    types: ['IMAGE', 'VIDEO'],
  },
  {
    key: 'GOOGLE_DISPLAY',
    platform: 'GOOGLE',
    placement: 'DISPLAY',
    brand: 'Google',
    format: 'Display',
    where: 'Google Display',
    types: ['IMAGE', 'VIDEO'],
  },
  {
    key: 'GOOGLE_YOUTUBE',
    platform: 'GOOGLE',
    placement: 'YOUTUBE',
    brand: 'YouTube',
    format: 'Video',
    where: 'YouTube In-stream video',
    types: ['VIDEO'],
  },
]

export function pageKey(pageId: string) {
  return `page:${pageId}`
}

export function pageIdFromKey(key: string) {
  return key.startsWith('page:') ? key.slice(5) : null
}

export function paidTargetByKey(key: string) {
  return PAID_TARGETS.find((row) => row.key === key)
}

export function runDestinationKey(run: {
  platform: string
  placement?: string | null
  destinationLandingPageId?: string | null
}) {
  if (run.platform === 'LOOPIE' && run.destinationLandingPageId) {
    return pageKey(run.destinationLandingPageId)
  }
  if (run.platform === 'GOOGLE' && run.placement === 'YOUTUBE') return 'GOOGLE_YOUTUBE'
  if (run.platform === 'GOOGLE') return 'GOOGLE_DISPLAY'
  if (run.platform === 'META') return 'META_FEED'
  return `${run.platform}_${run.placement ?? 'FEED'}`
}
