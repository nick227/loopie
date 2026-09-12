import { escapeHtml, renderCta } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

// Shared by both the 'footer' and 'cta-band' section types — no Starter renders these any
// differently.
export function renderFooter({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
  const cta = renderCta(c.cta)
  return `<footer class="lp-section lp-footer">${headline}${body}${cta}</footer>`
}
