import type { TemplateSchema } from '../leadGenTemplate'
import { DEFAULT_PAGE_FAVICON_URL, type PageContent } from '../content'
import { PAGE_THEME_PRESETS } from '../pageThemes'
import type { StarterPageBusiness } from '../starterPageBusiness'

export const SYSTEM_GENERAL_TEMPLATE_ID = 'system-template-general'

// The Blank / General Page Type's own layout (2026-09-10 — see
// docs/strategy/pages-page-types-and-style-axes-roadmap.md §9). Deliberately unopinionated: same
// plain section vocabulary as the Sales page (hero, media, features, form, footer — the smallest
// real section set already proven in the catalog), but with genuinely blank starter content
// instead of sales-flavored copy, for a page that doesn't fit any of the named purposes.
export const generalTitle = 'Blank page'
export const generalDescription = 'An empty starting point with no assumed purpose.'

export const generalSchema: TemplateSchema = {
  renderer: 'standard',
  sections: [
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['headline', 'body', 'primaryCta'],
    },
    { key: 'image', type: 'media-image', order: 1, hideable: true, editable: ['assetId', 'url'] },
    { key: 'features', type: 'feature-grid', order: 2, hideable: true, editable: ['items'] },
    { key: 'form', type: 'form-embed', order: 3, hideable: true, editable: [] },
    { key: 'footer', type: 'footer', order: 4, hideable: true, editable: ['body'] },
  ],
  themeTokens: [],
  themePresets: PAGE_THEME_PRESETS,
}

// A function, not a static object — see StarterPageBusiness's own doc comment. Blank stays
// genuinely blank in its hero (no assumed purpose, per this template's own design); only the
// browser tab picks up the real business name, since a real identity there is never presumptuous
// the way sales-flavored hero copy would be.
export function generalStarterContent(business: StarterPageBusiness): PageContent {
  return {
    browser: {
      title: business.name,
      favicon: { url: DEFAULT_PAGE_FAVICON_URL },
    },
    hero: {
      headline: '',
      body: '',
    },
  }
}
