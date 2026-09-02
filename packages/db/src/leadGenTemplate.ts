export {
  PAGE_THEME_PRESETS,
  DEFAULT_PAGE_THEME,
  themeFromPreset,
  matchThemePreset,
} from './pageThemes'
export type { PageThemePreset } from './pageThemes'
import { PAGE_THEME_PRESETS } from './pageThemes'
import {
  DEFAULT_PAGE_FAVICON_URL,
  SECTION_TYPE_TO_SLOT_GROUP,
  type LayoutConfig,
  type PageContent,
} from './content'

export const SYSTEM_LEAD_GEN_TEMPLATE_ID = 'system-template-lead-gen'
export const SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID = 'system-template-lead-gen-media'

export const MOCK_STARTER_IMAGE =
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80'

export const MOCK_FEATURE_ITEMS = [
  {
    title: 'Same-week openings',
    body: 'A few slots stay clear every week so new work does not sit in a queue.',
  },
  {
    title: 'Price before we start',
    body: 'You get a number in writing. No padding, no surprise line items later.',
  },
  {
    title: 'One person, start to finish',
    body: 'The person who picks up the form is the person who shows up.',
  },
]

const HERO = {
  key: 'hero',
  type: 'hero',
  order: 0,
  hideable: false,
  editable: ['headline', 'body', 'primaryCta'],
}

const FORM = { key: 'form', type: 'form-embed', hideable: false, editable: [] as string[] }
const FOOTER = { key: 'footer', type: 'footer', hideable: true, editable: ['body'] }

export const SYSTEM_LEAD_GEN_SCHEMA = {
  sections: [
    HERO,
    {
      key: 'image',
      type: 'media-image',
      order: 1,
      hideable: true,
      editable: ['assetId', 'url'],
    },
    { key: 'features', type: 'feature-grid', order: 2, hideable: true, editable: ['items'] },
    { ...FORM, order: 3 },
    { ...FOOTER, order: 4 },
  ],
  themeTokens: [],
  themePresets: PAGE_THEME_PRESETS,
}

export const SYSTEM_MEDIA_LEAD_GEN_SCHEMA = {
  sections: [
    {
      key: 'split',
      type: 'split-capture',
      order: 0,
      hideable: false,
      editable: ['headline', 'media'],
    },
  ],
  themeTokens: [],
  themePresets: PAGE_THEME_PRESETS,
}

export type TemplateSectionDef = {
  key: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

export type TemplateSchema = {
  /** Stable visual renderer identity, frozen into PublishedPageVersion.schemaSnapshot. */
  renderer?:
    'standard' | 'corporate-professional' | 'webinar-signup' | 'studio' | 'portfolio' | 'store'
  sections?: TemplateSectionDef[]
  themeTokens?: string[]
  themePresets?: typeof PAGE_THEME_PRESETS
}

export function defaultLayoutConfigFromSchema(schema: TemplateSchema): LayoutConfig {
  const sections: Record<string, { hidden?: boolean; order?: number }> = {}
  for (const section of schema.sections ?? []) {
    sections[section.key] = { hidden: false, order: section.order }
  }
  return { sections }
}

export function starterContentForTemplate(
  schema: TemplateSchema,
  businessName: string,
): PageContent {
  const slotGroups = new Set(
    (schema.sections ?? [])
      .map((section) => SECTION_TYPE_TO_SLOT_GROUP[section.type])
      .filter((slot): slot is NonNullable<typeof slot> => !!slot),
  )
  const content: PageContent = {
    browser: { title: businessName, faviconUrl: DEFAULT_PAGE_FAVICON_URL },
  }
  if (slotGroups.has('hero')) {
    const isSplit = (schema.sections ?? []).some((s) => s.type === 'split-capture')
    content.hero = isSplit
      ? { headline: `Get ${businessName}'s next opening`, media: { url: MOCK_STARTER_IMAGE } }
      : {
          headline: `${businessName} is booking this week`,
          body: 'Leave your name and the job. We call back the same day with a time that works and a price before we start.',
          primaryCta: { label: 'Request a callback', url: '#form' },
        }
  }
  if (slotGroups.has('features')) {
    content.features = { items: MOCK_FEATURE_ITEMS }
  }
  if (slotGroups.has('media')) {
    content.media = { kind: 'image', url: MOCK_STARTER_IMAGE }
  }
  if (slotGroups.has('footer')) {
    content.footer = { body: `${businessName} · Send this form — we reply the same day.` }
  }
  return content
}
