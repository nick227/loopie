import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

// A template's 'form-embed' entry only renders a real standalone form block when it's the one and
// only place the attached Form actually shows up; otherwise (every rich Starter — the Form is
// nested inside whichever section actually owns it, e.g. studio-contact/webinar-widget/
// split-capture) it's Content-tab ordering/visibility metadata only and must render nothing here,
// or the Form's fields would appear twice on the published page. See
// @project/db's SECTION_TYPE_TO_SLOT_GROUP doc comment for the full explanation.
export function renderFormEmbed({
  section,
  formHtml,
  formEmbeddedElsewhere,
}: SectionRenderInput): string {
  if (formEmbeddedElsewhere) return ''
  return `<section class="lp-section lp-form"${sectionIdAttr(section)}><div class="lp-form-card"><p class="lp-form-title">Tell us what you need</p>${formHtml}</div></section>`
}
