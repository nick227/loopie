import { escapeHtml, renderCta } from '../core/escape'
import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

// Shared default — Studio's own colorWash/snap variant lives in starters/studio/definition.ts.
export function renderStudioContact({ section, content, formHtml }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
  const cta = renderCta(c.cta)
  return `<section class="lp-section lp-studio-contact"${sectionIdAttr(section)}><div>${headline}${body}${cta}</div><div class="lp-form-card">${formHtml}</div></section>`
}
