import { escapeHtml, renderCta, safeHttpUrl } from '../../core/escape'
import { sectionIdAttr } from '../../core/context'
import { serviceItems } from '../../sections/services'
import type { SectionRenderInput, StarterDefinition } from '../../core/types'
import { CORPORATE_STYLES_CSS } from './styles'

// Corporate Professional's own 'service-selector' — a tabbed selector (label list + one visible
// panel), replacing the shared default's row grid entirely.
function renderCorporateServiceTabs({ section, content }: SectionRenderInput): string {
  const items = serviceItems(content)
  if (!items.length) return ''
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
  const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''

  const tabs = items
    .map(
      (item, index) =>
        `<button type="button" class="lp-service-tab${index === 0 ? ' is-active' : ''}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" data-lp-tab="${index}">${escapeHtml(item.label)}</button>`,
    )
    .join('')
  const panels = items
    .map((item, index) => {
      const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
      const media = src
        ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? '')}" />`
        : ''
      return `<div class="lp-service-panel${index === 0 ? ' is-active' : ''}" role="tabpanel" data-lp-panel="${index}"${index === 0 ? '' : ' hidden'}>${media}<div class="lp-service-copy">${item.headline ? `<h4>${escapeHtml(item.headline)}</h4>` : ''}<p>${escapeHtml(item.description ?? '')}</p>${renderCta(item.cta)}</div></div>`
    })
    .join('')
  return `<section class="lp-section lp-services"${sectionIdAttr(section)}><div class="lp-section-heading">${title}${body}</div><div class="lp-service-tabs" data-lp-service-tabs><div class="lp-service-tablist" role="tablist">${tabs}</div><div class="lp-service-panels">${panels}</div></div></section>`
}

export const corporateDefinition: StarterDefinition = {
  id: 'corporate-professional',
  styles: CORPORATE_STYLES_CSS,
  sectionOverrides: {
    'service-selector': renderCorporateServiceTabs,
  },
}
