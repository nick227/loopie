import { escapeHtml } from '../core/escape'
import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

function renderLogoItems(items: { name: string }[]): string {
  return items.map((item) => `<span class="lp-logo">${escapeHtml(item.name)}</span>`).join('')
}

// Shared default (a plain wrapped row) — used by every Starter except Studio and Store, which
// both use the scrolling marquee variant (renderLogoMarquee, below) instead.
export function renderLogoCloud({ section, content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = Array.isArray(c.items) ? (c.items as { name: string }[]) : []
  if (!items.length) return ''
  const title = c.title ? `<p class="lp-kicker">${escapeHtml(c.title)}</p>` : ''
  const logos = renderLogoItems(items)
  return `<section class="lp-section lp-logos"${sectionIdAttr(section)}>${title}<div class="lp-logo-row">${logos}</div></section>`
}

// Shared by Studio and Store — registered as each's own 'logo-cloud' override (see
// starters/studio/definition.ts and starters/store/definition.ts) rather than duplicated, since
// the marquee markup itself carries no Starter identity of its own.
export function renderLogoCloudMarquee({ section, content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = Array.isArray(c.items) ? (c.items as { name: string }[]) : []
  if (!items.length) return ''
  const title = c.title ? `<p class="lp-kicker">${escapeHtml(c.title)}</p>` : ''
  const logos = renderLogoItems(items)
  return `<section class="lp-section lp-logos"${sectionIdAttr(section)}>${title}<div class="lp-logo-marquee" data-lp-marquee><div class="lp-logo-marquee-track">${logos}${logos}</div></div></section>`
}
