import { escapeHtml } from '../core/escape'
import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

export function renderFeatureItems(items: { title: string; body: string }[]): string {
  return items
    .map(
      (item) =>
        `<div class="lp-feature"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></div>`,
    )
    .join('')
}

// Shared default for 'feature-grid' — Studio's own colorWash/snap variant lives in
// starters/studio/definition.ts and reuses renderFeatureItems for the individual cards.
export function renderFeatureGrid({ section, content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = Array.isArray(c.items) ? (c.items as { title: string; body: string }[]) : []
  const itemsHtml = renderFeatureItems(items)
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
  return `<section class="lp-section lp-features"${sectionIdAttr(section)}><div class="lp-section-heading">${headline}${body}</div><div class="lp-feature-grid">${itemsHtml}</div></section>`
}
