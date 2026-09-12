import { escapeHtml } from '../core/escape'
import { isNavAskUrl } from '../core/context'
import type { SectionRenderInput } from '../core/types'

// The shared default — every Starter except Email Outreach (its own chip-style override lives in
// starters/emailOutreach/definition.ts) renders nav this way.
export function renderNav({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const brand = typeof c.brand === 'string' ? c.brand : ''
  const links = Array.isArray(c.links) ? (c.links as { label?: string; url?: string }[]) : []
  const askIndex = links.findIndex((link) => isNavAskUrl(link.url))
  const ask = askIndex >= 0 ? links[askIndex] : null
  const menuLinks = askIndex >= 0 ? links.filter((_, index) => index !== askIndex) : links
  const linksHtml = menuLinks
    .map((link) => `<a href="${escapeHtml(link.url || '#')}">${escapeHtml(link.label || '')}</a>`)
    .join('')
  const askHtml = ask?.label
    ? `<a class="lp-nav-cta" href="${escapeHtml(ask.url || '#')}">${escapeHtml(ask.label)}</a>`
    : ''
  return `<nav class="lp-nav"><a class="lp-brand" href="#">${escapeHtml(brand)}</a><div class="lp-nav-links">${linksHtml}</div>${askHtml}</nav>`
}
