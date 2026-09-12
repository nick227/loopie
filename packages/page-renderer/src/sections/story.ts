import { escapeHtml, safeHttpUrl } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

export function renderStory({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
  const media = (c.media && typeof c.media === 'object' ? c.media : {}) as Record<string, unknown>
  const src = safeHttpUrl(media.src) || safeHttpUrl(media.url)
  const mediaHtml = src
    ? `<div class="lp-story-media"><img src="${escapeHtml(src)}" alt="${escapeHtml((media.alt as string) ?? '')}" /></div>`
    : ''
  return `<section class="lp-section lp-story">${mediaHtml}<div class="lp-story-copy">${headline}${body}</div></section>`
}
