import { escapeHtml, safeHttpUrl } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

export function renderCategoryGrid({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = Array.isArray(c.items)
    ? (c.items as {
        label: string
        url?: string
        media?: { url?: string; src?: string; alt?: string }
      }[])
    : []
  if (!items.length) return ''
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const tiles = items
    .map((item) => {
      const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
      const media = src
        ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? item.label)}" />`
        : `<div class="lp-category-media-empty"></div>`
      const href = typeof item.url === 'string' && item.url ? item.url : '#'
      return `<a class="lp-category-tile" href="${escapeHtml(href)}">${media}<span class="lp-category-label">${escapeHtml(item.label)}</span></a>`
    })
    .join('')
  return `<section class="lp-section lp-categories">${headline ? `<div class="lp-section-heading">${headline}</div>` : ''}<div class="lp-category-grid">${tiles}</div></section>`
}
