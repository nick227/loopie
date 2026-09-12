import { escapeHtml } from '../core/escape'
import type { AdSlotEmbedItem, AdSlotGroup } from '../core/types'

function renderAdSlot(item: AdSlotEmbedItem, context: string, sessionToken?: string): string {
  const src = sessionToken
    ? `${item.embedUrl}?sid=${encodeURIComponent(sessionToken)}`
    : item.embedUrl
  const contextClass = `lp-ad--${context.toLowerCase()}`
  const formatClass = item.format ? `lp-ad--format-${item.format.toLowerCase()}` : ''
  return `<section class="lp-section lp-ad ${contextClass} ${formatClass}"><iframe src="${escapeHtml(src)}" title="Ad" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>`
}

export function slotsAt(slots: AdSlotGroup[], placement: string, sessionToken?: string): string {
  return slots
    .filter((slot) => slot.placement === placement)
    .flatMap((slot) =>
      slot.items.map((item) => renderAdSlot(item, slot.context ?? 'CONTAINED', sessionToken)),
    )
    .join('\n')
}
