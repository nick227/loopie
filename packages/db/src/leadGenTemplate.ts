export const SYSTEM_LEAD_GEN_TEMPLATE_ID = 'system-template-lead-gen'
export const SYSTEM_MEDIA_LEAD_GEN_TEMPLATE_ID = 'system-template-lead-gen-media'

export const MOCK_STARTER_IMAGE =
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80'

export const DEFAULT_PAGE_THEME = {
  primaryColor: '#0B3D91',
  backgroundColor: '#E8EEF4',
  fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
}

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

const THEME_TOKENS = ['primaryColor', 'backgroundColor', 'fontFamily'] as const

const HERO = {
  key: 'hero',
  type: 'hero',
  order: 0,
  hideable: false,
  editable: ['headline', 'subheadline', 'ctaLabel', 'ctaLink'],
}

const FORM = { key: 'form', type: 'form-embed', hideable: false, editable: [] as string[] }
const FOOTER = { key: 'footer', type: 'footer', hideable: true, editable: ['text'] }

export const SYSTEM_LEAD_GEN_SCHEMA = {
  sections: [
    HERO,
    {
      key: 'image',
      type: 'media-image',
      order: 1,
      hideable: true,
      editable: ['assetId', 'imageUrl'],
    },
    { key: 'features', type: 'feature-grid', order: 2, hideable: true, editable: ['items'] },
    { ...FORM, order: 3 },
    { ...FOOTER, order: 4 },
  ],
  themeTokens: [...THEME_TOKENS],
}

export const SYSTEM_MEDIA_LEAD_GEN_SCHEMA = {
  sections: [
    HERO,
    {
      key: 'image',
      type: 'media-image',
      order: 1,
      hideable: true,
      editable: ['assetId', 'imageUrl'],
    },
    { key: 'audio', type: 'media-audio', order: 2, hideable: true, editable: ['assetId'] },
    { key: 'youtube', type: 'media-youtube', order: 3, hideable: true, editable: ['youtubeUrl'] },
    { ...FORM, order: 4 },
    { ...FOOTER, order: 5 },
  ],
  themeTokens: [...THEME_TOKENS],
}

export type TemplateSectionDef = {
  key: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

export type TemplateSchema = {
  sections?: TemplateSectionDef[]
  themeTokens?: string[]
}

export type SectionContent = Record<string, unknown> & { hidden?: boolean }
export type PageContent = { sections?: Record<string, SectionContent> }

export function defaultContentFromSchema(schema: TemplateSchema): PageContent {
  const sections: Record<string, SectionContent> = {}
  for (const section of schema.sections ?? []) {
    sections[section.key] = { hidden: false }
  }
  return { sections }
}

export function starterContentForTemplate(
  schema: TemplateSchema,
  businessName: string,
): PageContent {
  const content = defaultContentFromSchema(schema)
  const sections = { ...(content.sections ?? {}) }
  if (sections.hero) {
    sections.hero = {
      hidden: false,
      headline: `${businessName} is booking this week`,
      subheadline:
        'Leave your name and the job. We call back the same day with a time that works and a price before we start.',
      ctaLabel: 'Request a callback',
      ctaLink: '#form',
    }
  }
  if (sections.features) {
    sections.features = { hidden: false, items: MOCK_FEATURE_ITEMS }
  }
  if (sections.image) {
    sections.image = { hidden: false, imageUrl: MOCK_STARTER_IMAGE }
  }
  if (sections.footer) {
    sections.footer = {
      hidden: false,
      text: `${businessName} · Send this form — we reply the same day.`,
    }
  }
  return { sections }
}
