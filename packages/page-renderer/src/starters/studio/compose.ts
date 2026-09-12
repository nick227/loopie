import { escapeHtml, safeHttpUrl } from '../../core/escape'
import { slotsAt } from '../../composition/ads'
import { resolveSlotContent } from '../../composition/composePage'
import type { ComposeInput } from '../../core/types'

// Studio's only real composition difference from every other Starter: its hero and (if present)
// logo-cloud sections are grouped into one scroll-linked parallax bridge — a sticky full-height
// media layer behind normally-flowing content — instead of rendering as ordinary stacked
// sections. Everything else in the schema renders through the exact same per-section loop (with
// the same ad-slot placements) as composition/composePage.ts's shared default.
export function composeStudio(input: ComposeInput): string {
  const { sections, content, adSlots, sessionToken, renderSection, formEmbeddedElsewhere } = input
  const chunks: string[] = []
  const bridgeInner: string[] = []
  let bridgeMedia = ''
  let bridgeOpen = false

  const flushBridge = () => {
    if (!bridgeOpen) return
    const sticky = bridgeMedia
      ? `<div class="lp-parallax-sticky" aria-hidden="true">${bridgeMedia}<div class="lp-parallax-scrim"></div></div>`
      : `<div class="lp-parallax-sticky" aria-hidden="true"><div class="lp-parallax-scrim"></div></div>`
    chunks.push(
      `<div class="lp-parallax-bridge" data-lp-parallax-bridge>${sticky}<div class="lp-parallax-content">${bridgeInner.join('\n')}</div></div>`,
    )
    bridgeInner.length = 0
    bridgeOpen = false
    bridgeMedia = ''
  }

  for (const section of sections) {
    if (section.type === 'form-embed' && !formEmbeddedElsewhere) {
      chunks.push(slotsAt(adSlots, 'BEFORE_FORM', sessionToken))
    }
    const slotContent = resolveSlotContent(content, section)

    const inBridge = section.type === 'hero' || section.type === 'logo-cloud'
    if (inBridge) {
      if (section.type === 'hero') {
        const media =
          slotContent && typeof slotContent === 'object'
            ? ((slotContent as Record<string, unknown>).media as
                Record<string, unknown> | undefined)
            : undefined
        const src = safeHttpUrl(media?.src) || safeHttpUrl(media?.url)
        if (src) {
          bridgeMedia = `<img class="lp-parallax-img" src="${escapeHtml(src)}" alt="" />`
        }
        bridgeOpen = true
      }
      bridgeInner.push(renderSection(section, slotContent, formEmbeddedElsewhere))
      if (section.type === 'hero') bridgeInner.push(slotsAt(adSlots, 'AFTER_HERO', sessionToken))
      continue
    }
    flushBridge()

    chunks.push(renderSection(section, slotContent, formEmbeddedElsewhere))
    if (section.type === 'hero') chunks.push(slotsAt(adSlots, 'AFTER_HERO', sessionToken))
    if (
      (section.type === 'form-embed' && !formEmbeddedElsewhere) ||
      section.type === 'split-capture'
    ) {
      chunks.push(slotsAt(adSlots, 'AFTER_FORM', sessionToken))
    }
  }
  flushBridge()
  chunks.push(slotsAt(adSlots, 'BOTTOM', sessionToken))
  return chunks.filter(Boolean).join('\n')
}
