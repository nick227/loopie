import { escapeHtml, safeHttpUrl } from '../core/escape'
import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

export function renderSplitCapture({ section, content, formHtml }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const media = (c.media && typeof c.media === 'object' ? c.media : {}) as Record<string, unknown>
  const src = safeHttpUrl(media.src) || safeHttpUrl(media.url)
  const mediaHtml = src
    ? `<div class="lp-split-media"><img src="${escapeHtml(src)}" alt="" /></div>`
    : `<div class="lp-split-media lp-split-media-empty"></div>`
  const pitch = c.headline ? `<h1>${escapeHtml(c.headline)}</h1>` : ''
  return `<section class="lp-split"${sectionIdAttr(section)}>${mediaHtml}<div class="lp-split-copy">${pitch}${formHtml}</div></section>`
}
