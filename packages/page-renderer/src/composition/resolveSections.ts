import type { LayoutConfig } from '@project/db'
import type { TemplateSection } from '../core/types'

export interface ResolvedSections {
  // Sorted by `order`, with any Content-tab-hidden entries already removed.
  sections: TemplateSection[]
  // True when some section OTHER than 'form-embed' already embeds the attached Form itself
  // (studio-contact/webinar-widget/split-capture all do).
  formEmbeddedElsewhere: boolean
  // `formHtml` with the Content-tab's hidden state for the Form section already applied — the one
  // effective value every consuming section renderer should use, rather than each re-deriving
  // "is the form actually visible" from layoutConfig itself.
  effectiveFormHtml: string
}

export function resolveSections(
  sections: TemplateSection[],
  layoutConfig: LayoutConfig | null | undefined,
  formHtml: string,
): ResolvedSections {
  const sorted = [...sections].sort((a, b) => a.order - b.order)

  // Deliberately computed against the sorted-but-NOT-yet-hidden-filtered list, matching the
  // pre-extraction behavior exactly: a schema's own "does something else embed the form" shape
  // doesn't change just because one of those sections happens to be hidden this configuration —
  // only the final per-section render (skipped below for hidden sections) does.
  const formEmbeddedElsewhere = sorted.some(
    (s) => s.type === 'studio-contact' || s.type === 'webinar-widget' || s.type === 'split-capture',
  )

  // The 'form-embed' entry's own key carries the Content tab's hide/show state for the Form
  // section, same as any other section — but when it's editorial metadata, hiding it has to
  // suppress the *real* formHtml wherever it's actually nested, not just the (already-empty)
  // metadata entry's own no-op render. See @project/db's SECTION_TYPE_TO_SLOT_GROUP doc comment.
  const formSectionKey = sorted.find((s) => s.type === 'form-embed')?.key
  const formIsHidden = Boolean(formSectionKey && layoutConfig?.sections?.[formSectionKey]?.hidden)

  const ordered = sorted.filter(
    (section) => !(section.key && layoutConfig?.sections?.[section.key]?.hidden),
  )

  return {
    sections: ordered,
    formEmbeddedElsewhere,
    effectiveFormHtml: formIsHidden ? '' : formHtml,
  }
}
