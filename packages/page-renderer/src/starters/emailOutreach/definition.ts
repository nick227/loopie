import { escapeHtml } from '../../core/escape'
import type { SectionRenderInput, StarterDefinition } from '../../core/types'
import { EMAIL_OUTREACH_STYLES_CSS } from './styles'
import { composeEmailOutreach } from './compose'

// Email Outreach's nav has no links or ask CTA — a "First note" chip instead of a menu.
function renderEmailOutreachNav({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const brand = typeof c.brand === 'string' ? c.brand : ''
  return `<nav class="lp-nav"><a class="lp-brand" href="#">${escapeHtml(brand)}</a><span class="lp-email-chip">First note</span></nav>`
}

export const emailOutreachDefinition: StarterDefinition = {
  id: 'email-outreach',
  styles: EMAIL_OUTREACH_STYLES_CSS,
  sectionOverrides: {
    nav: renderEmailOutreachNav,
  },
  compose: composeEmailOutreach,
}
