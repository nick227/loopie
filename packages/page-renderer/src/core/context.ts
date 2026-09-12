import { escapeHtml } from './escape'
import type { TemplateSection } from './types'

// Shared, renderer-agnostic anchor ids — every Starter's nav can link to `#contact`/`#signup`/
// `#form`, or to any other section's own key, regardless of which Starter is currently rendering.
export function sectionIdAttr(section: TemplateSection): string {
  if (section.type === 'studio-contact') return ' id="contact"'
  if (section.type === 'webinar-widget') return ' id="signup"'
  if (section.type === 'form-embed' || section.type === 'split-capture') return ' id="form"'
  if (section.key && section.key !== 'nav' && section.key !== 'hero' && section.key !== 'footer') {
    return ` id="${escapeHtml(section.key)}"`
  }
  return ''
}

// A nav link whose url targets one of these well-known in-page anchors is the "ask" — pulled out
// of the regular menu-links row and rendered as the standalone `.lp-nav-cta` button instead.
export function isNavAskUrl(url: string | undefined): boolean {
  return url === '#contact' || url === '#signup' || url === '#products'
}
