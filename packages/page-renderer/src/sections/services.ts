import { escapeHtml, safeHttpUrl, renderCta } from '../core/escape'
import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

export type ServiceItem = {
  label: string
  headline?: string
  description?: string
  media?: { url?: string; src?: string; alt?: string }
  cta?: unknown
}

export function serviceItems(content: unknown): ServiceItem[] {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  return Array.isArray(c.items) ? (c.items as ServiceItem[]) : []
}

export type ServiceRowOptions = {
  // 'h3' for the plain default, 'kicker' for Studio/Portfolio's editorial label treatment.
  headingMode?: 'h3' | 'kicker'
  articleClass?: string
}

// One `<article>` row — shared by the default renderer and Portfolio's own override
// (starters/portfolio/definition.ts). Studio's rows are different enough (per-index tone,
// colorWash, snap wrapping) that it builds its own markup directly rather than reusing this.
export function renderServiceRow(
  item: ServiceItem,
  { headingMode = 'h3', articleClass = 'lp-service' }: ServiceRowOptions = {},
): string {
  const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
  const media = src
    ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? '')}" />`
    : ''
  const label =
    headingMode === 'kicker'
      ? `<p class="lp-kicker">${escapeHtml(item.label)}</p>`
      : `<h3>${escapeHtml(item.label)}</h3>`
  return `<article class="${articleClass}">${media}<div class="lp-service-copy">${label}${item.headline ? `<h3>${escapeHtml(item.headline)}</h3>` : ''}<p>${escapeHtml(item.description ?? '')}</p>${renderCta(item.cta)}</div></article>`
}

// Shared default 'service-selector' — a heading + a grid of renderServiceRow articles. Reused
// (with different row options) by Portfolio; Corporate Professional's tabs and Studio's own
// snap/colorWash treatment are complete replacements, not variations of this wrapper.
export function renderServiceSelector(
  { section, content }: SectionRenderInput,
  rowOptions?: ServiceRowOptions,
): string {
  const items = serviceItems(content)
  if (!items.length) return ''
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
  const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
  const rows = items.map((item) => renderServiceRow(item, rowOptions)).join('')
  return `<section class="lp-section lp-services"${sectionIdAttr(section)}><div class="lp-section-heading">${title}${body}</div><div class="lp-service-grid">${rows}</div></section>`
}
