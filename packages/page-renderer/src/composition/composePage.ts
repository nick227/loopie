import { SECTION_TYPE_TO_SLOT_GROUP, type PageContent } from '@project/db'
import { slotsAt } from './ads'
import { renderHeroMarkup, renderAdjacentHeroMediaHtml } from '../sections/hero'
import type { ComposeInput, TemplateSection } from '../core/types'

// A section's `type` declares which canonical slot group of `content` it reads from — see
// @project/db's SECTION_TYPE_TO_SLOT_GROUP doc comment. Shared by every composer (default and
// Studio's own) since it carries no Starter-specific decision, only a generic content lookup.
export function resolveSlotContent(content: PageContent, section: TemplateSection): unknown {
  const slotGroup = SECTION_TYPE_TO_SLOT_GROUP[section.type]
  return slotGroup ? ((content as Record<string, unknown>)[slotGroup] ?? {}) : {}
}

// The shared default composition: walk the resolved sections in order, rendering each through the
// current Starter's own renderSection, interleaving ad slots at their declared placements. Every
// Starter except Studio (scroll-snap parallax bridging — see starters/studio/compose.ts) and
// Portfolio (its hero has no adjacent-media concept at all — full-bleed background image, see
// starters/portfolio/definition.ts) uses this untouched; Email Outreach wraps it to append its own
// footer strip (starters/emailOutreach/compose.ts).
//
// Hero+adjacent-media grouping (2026-09-11): a schema that pairs 'hero' with an immediately-
// following 'media-image' section stores its real photo in that sibling section, never in hero's
// own `content.media` (a real bug this fixed: hero.content.media can independently hold stale/
// duplicate data — same URL as the sibling — for pages authored before this was understood, and
// the plain hero renderer used to show both, once inline and once as a second full-width section
// right after it). The editor's own canvas (PageCanvas.tsx) never reads hero.content.media at all
// for this shape — HeroBlock is copy-only, MediaImageBlock is the one real image — so this mirrors
// that exactly: the sibling's image is always the one shown, and under SPLIT specifically the two
// group into one real two-column `.lp-hero` composition instead of two stacked full-width blocks.
export function composeDefault(input: ComposeInput): string {
  const {
    sections,
    content,
    adSlots,
    sessionToken,
    renderSection,
    formEmbeddedElsewhere,
    layoutVariant,
  } = input
  const chunks: string[] = []

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]!
    const nextSection = sections[i + 1]
    const isPairedHero = section.type === 'hero' && nextSection?.type === 'media-image'

    if (section.type === 'form-embed' && !formEmbeddedElsewhere) {
      chunks.push(slotsAt(adSlots, 'BEFORE_FORM', sessionToken))
    }

    if (isPairedHero) {
      const heroContent = resolveSlotContent(content, section)
      const mediaContent = resolveSlotContent(content, nextSection!)
      const externalMediaHtml =
        layoutVariant === 'SPLIT' ? renderAdjacentHeroMediaHtml(mediaContent) : ''
      chunks.push(
        renderHeroMarkup(
          {
            section,
            content: heroContent,
            formHtml: '',
            submissionCount: 0,
            formEmbeddedElsewhere,
          },
          { externalMediaHtml },
        ),
      )
      chunks.push(slotsAt(adSlots, 'AFTER_HERO', sessionToken))
      if (layoutVariant !== 'SPLIT') {
        // Stacked/Centered: the sibling still renders as its own full-width block, right after —
        // only its inline duplicate inside .lp-hero is suppressed above.
        chunks.push(renderSection(nextSection!, mediaContent, formEmbeddedElsewhere))
      }
      i++ // consume the paired media section either way (grouped, or already rendered above)
      continue
    }

    const slotContent = resolveSlotContent(content, section)
    chunks.push(renderSection(section, slotContent, formEmbeddedElsewhere))
    if (section.type === 'hero') chunks.push(slotsAt(adSlots, 'AFTER_HERO', sessionToken))
    if (
      (section.type === 'form-embed' && !formEmbeddedElsewhere) ||
      section.type === 'split-capture'
    ) {
      chunks.push(slotsAt(adSlots, 'AFTER_FORM', sessionToken))
    }
  }
  chunks.push(slotsAt(adSlots, 'BOTTOM', sessionToken))
  return chunks.filter(Boolean).join('\n')
}
