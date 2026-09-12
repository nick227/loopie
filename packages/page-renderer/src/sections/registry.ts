import type { SectionRenderer, SectionRendererRegistry, SectionRenderInput } from '../core/types'
import { renderNav } from './nav'
import { renderHero } from './hero'
import { renderFeatureGrid } from './features'
import { renderFormEmbed } from './form'
import { renderSplitCapture } from './splitCapture'
import { renderFooter } from './footer'
import { renderStudioContact } from './studioContact'
import { renderMediaImage, renderMediaAudio, renderMediaYoutube } from './media'
import { renderLogoCloud } from './logos'
import { renderServiceSelector } from './services'
import { renderMetrics } from './metrics'
import { renderComparison } from './comparison'
import { renderTestimonials } from './testimonials'
import { renderWebinarWidget } from './webinar'
import { renderPhotoGallery } from './gallery'
import { renderTeam } from './team'
import { renderProductGrid } from './products'
import { renderCategoryGrid } from './categories'
import { renderStory } from './story'
import { renderFaq } from './faq'

// The shared default renderer for every section `type` a Starter doesn't otherwise override.
// This is the ONE place core rendering code is allowed to know every section type exists — no
// Starter identity is referenced anywhere in this file or the modules it imports.
export const BASE_SECTION_REGISTRY: SectionRendererRegistry = {
  nav: renderNav,
  hero: renderHero,
  'feature-grid': renderFeatureGrid,
  'form-embed': renderFormEmbed,
  'split-capture': renderSplitCapture,
  footer: renderFooter,
  'cta-band': renderFooter,
  'studio-contact': renderStudioContact,
  'media-image': renderMediaImage,
  'media-audio': renderMediaAudio,
  'media-youtube': renderMediaYoutube,
  'logo-cloud': renderLogoCloud,
  'service-selector': renderServiceSelector,
  metrics: renderMetrics,
  comparison: renderComparison,
  testimonials: renderTestimonials,
  'webinar-widget': renderWebinarWidget,
  'photo-gallery': renderPhotoGallery,
  team: renderTeam,
  'product-grid': renderProductGrid,
  'category-grid': renderCategoryGrid,
  story: renderStory,
  faq: renderFaq,
}

// Looks up the current Starter's own override for this section type, falling back to the shared
// default, falling back to '' for any type nobody renders. The only "identity" this function ever
// sees is whatever override map its caller (composition/composePage.ts, bound to the current
// Starter) already resolved — it never branches on a renderer id itself.
export function resolveSectionRenderer(
  overrides: SectionRendererRegistry | undefined,
  type: string,
): SectionRenderer {
  return overrides?.[type] ?? BASE_SECTION_REGISTRY[type] ?? (() => '')
}

export function renderSectionWith(
  overrides: SectionRendererRegistry | undefined,
  input: SectionRenderInput,
): string {
  return resolveSectionRenderer(overrides, input.section.type)(input)
}
