import type { AdOrder } from '@/lib/adOrder'
import type { PublishTarget } from '@/components/ads/AdDestinations'

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

export function selectedPageTargets(selected: string[], supersedesRunId?: string): PublishTarget[] {
  const pages: PublishTarget[] = []
  for (const key of selected) {
    const id = pageIdFromKey(key)
    if (id) {
      pages.push({
        platform: 'LOOPIE',
        placement: 'PAGE',
        budget: 0,
        destinationLandingPageId: id,
        supersedesRunId,
      })
    }
  }
  return pages
}

export function paidOrderTarget(
  key: string,
  order: AdOrder,
  supersedesRunId?: string,
): PublishTarget | null {
  const row = paidTargetByKey(key)
  if (!row) return null
  return {
    platform: row.platform,
    placement: row.placement,
    budget: order.dailyBudget,
    startDate: order.startDate,
    endDate: order.endDate || undefined,
    destinationLandingPageId: order.destinationLandingPageId || undefined,
    orderSnapshot: { ...order, where: row.where },
    supersedesRunId,
  }
}
