// Mirrors packages/db/src/content.ts — apps/web has no dependency on @project/db, so this shape
// is kept in sync by hand, same as TemplateSection already was before this file existed.

// Every template now shares the same {sections: TemplateSection[]} schema shape and the same
// canonical content — these ids are only needed to pick which *visual component* renders a given
// template (AdvancedTemplateRenderer's richly-styled components vs. the plain PageCanvas). See
// RICH_TEMPLATE_IDS below for the generalized "is this a rich template at all" check.
export const CORPORATE_PROFESSIONAL_TEMPLATE_ID = 'system-template-corporate-professional'
export const WEBINAR_SIGNUP_TEMPLATE_ID = 'system-template-webinar-signup'
export const STUDIO_TEMPLATE_ID = 'system-template-studio'
export const PORTFOLIO_TEMPLATE_ID = 'system-template-portfolio'
export const STORE_TEMPLATE_ID = 'system-template-store'
export const EMAIL_OUTREACH_TEMPLATE_ID = 'system-template-email-outreach'
export const RICH_TEMPLATE_IDS = [
  CORPORATE_PROFESSIONAL_TEMPLATE_ID,
  WEBINAR_SIGNUP_TEMPLATE_ID,
  STUDIO_TEMPLATE_ID,
  PORTFOLIO_TEMPLATE_ID,
  STORE_TEMPLATE_ID,
  EMAIL_OUTREACH_TEMPLATE_ID,
]

export type MediaRef = { assetId?: string; url?: string; alt?: string; src?: string }
export type CtaRef = { label?: string; url?: string }

export type FeatureItem = { title: string; body: string; icon?: string }
export type ServiceItem = {
  id?: string
  label: string
  headline?: string
  description?: string
  media?: MediaRef
  cta?: CtaRef
  icon?: string
}
export type TestimonialItem = { quote: string; author: string; role?: string; avatarUrl?: string }
export type FaqItem = { question: string; answer: string }
export type LogoItem = { name: string; icon?: string; imageUrl?: string }
export type MetricItem = { value: string; label: string; description?: string }
export type ComparisonItem = { feature: string; us: string | boolean; them: string | boolean }
export type GalleryItem = {
  assetId?: string
  url?: string
  alt?: string
  caption?: string
  src?: string
}
export type TeamMemberItem = { name: string; role?: string; bio?: string; media?: MediaRef }
export type ProductItem = {
  id?: string
  name: string
  price?: string
  badge?: string
  media?: MediaRef
  cta?: CtaRef
}
export type CategoryItem = { label: string; url?: string; media?: MediaRef }

export type NavLink = { label: string; url: string }

export const DEFAULT_PAGE_FAVICON_URL = '/favicon.png'
export type PageBrowserSettings = {
  title?: string
  favicon?: MediaRef
  /** @deprecated Compatibility with the short-lived URL setting. */
  faviconUrl?: string
}

export type PageContent = {
  browser?: PageBrowserSettings
  nav?: { brand?: string; links?: NavLink[] }
  hero?: {
    eyebrow?: string
    headline?: string
    body?: string
    media?: MediaRef
    primaryCta?: CtaRef
    badges?: string[]
  }
  intro?: { headline?: string; body?: string; media?: MediaRef }
  media?: {
    kind?: 'image' | 'audio' | 'youtube'
    assetId?: string
    url?: string
    youtubeUrl?: string
    alt?: string
    src?: string
  }
  features?: { headline?: string; body?: string; items: FeatureItem[] }
  services?: { title?: string; body?: string; items: ServiceItem[] }
  testimonials?: { headline?: string; body?: string; items: TestimonialItem[] }
  faq?: { headline?: string; body?: string; items: FaqItem[] }
  logos?: { title?: string; items: LogoItem[] }
  metrics?: { items: MetricItem[] }
  comparison?: { title?: string; items: ComparisonItem[] }
  footer?: { headline?: string; body?: string; cta?: CtaRef }
  gallery?: { title?: string; items: GalleryItem[] }
  team?: { headline?: string; body?: string; items: TeamMemberItem[] }
  products?: { headline?: string; body?: string; items: ProductItem[] }
  categories?: { headline?: string; items: CategoryItem[] }
  // Event-specific settings for webinar/event-signup templates — the live "seats filled" number
  // itself is NOT stored here, it's a real count of this page's own FormSubmission rows computed
  // at render time, never authored/edited content.
  webinar?: {
    eventDate?: string
    durationMinutes?: number
    seatsTotal?: number
    hostName?: string
    hostTitle?: string
    hostAvatarUrl?: string
    hostBio?: string
  }
}

export type SlotGroupKey = Exclude<keyof PageContent, 'browser'>

export const KNOWN_SLOT_GROUPS: SlotGroupKey[] = [
  'nav',
  'hero',
  'intro',
  'media',
  'webinar',
  'features',
  'services',
  'gallery',
  'team',
  'products',
  'categories',
  'testimonials',
  'faq',
  'logos',
  'metrics',
  'comparison',
  'footer',
]

export const SECTION_TYPE_TO_SLOT_GROUP: Record<string, SlotGroupKey | undefined> = {
  hero: 'hero',
  'split-capture': 'hero',
  'media-image': 'media',
  'media-audio': 'media',
  'media-youtube': 'media',
  'feature-grid': 'features',
  'logo-cloud': 'logos',
  'service-selector': 'services',
  metrics: 'metrics',
  comparison: 'comparison',
  testimonials: 'testimonials',
  faq: 'faq',
  footer: 'footer',
  'cta-band': 'footer',
  nav: 'nav',
  'webinar-widget': 'webinar',
  'studio-contact': 'footer',
  'photo-gallery': 'gallery',
  team: 'team',
  'product-grid': 'products',
  'category-grid': 'categories',
  story: 'intro',
  'form-embed': undefined,
}

export type LayoutConfig = {
  sections?: Record<string, { hidden?: boolean; order?: number }>
}

export type TemplateSection = {
  key: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

// Legacy shapes a page's content may still be persisted as (pre-migration rows) — normalized on
// hydrate via normalizeLegacyPageContent below, mirroring packages/db/src/content.ts exactly so
// client and server upgrade old rows identically.
type LegacySectionContent = Record<string, unknown> & { hidden?: boolean }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function legacySectionsToCanonical(sections: Record<string, unknown>): PageContent {
  const out: PageContent = {}
  for (const [key, raw] of Object.entries(sections)) {
    if (!isRecord(raw)) continue
    switch (key) {
      case 'hero':
        out.hero = {
          ...out.hero,
          headline: typeof raw.headline === 'string' ? raw.headline : out.hero?.headline,
          body: typeof raw.subheadline === 'string' ? raw.subheadline : out.hero?.body,
          primaryCta:
            typeof raw.ctaLabel === 'string' || typeof raw.ctaLink === 'string'
              ? {
                  label: raw.ctaLabel as string | undefined,
                  url: raw.ctaLink as string | undefined,
                }
              : out.hero?.primaryCta,
        }
        break
      case 'split':
        out.hero = {
          ...out.hero,
          headline: typeof raw.headline === 'string' ? raw.headline : out.hero?.headline,
          media: {
            assetId: typeof raw.assetId === 'string' ? raw.assetId : undefined,
            url: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
          },
        }
        break
      case 'image':
        out.media = {
          kind: 'image',
          assetId: typeof raw.assetId === 'string' ? raw.assetId : undefined,
          url: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
        }
        break
      case 'features':
        if (Array.isArray(raw.items)) out.features = { items: raw.items as FeatureItem[] }
        break
      case 'footer':
        out.footer = {
          ...out.footer,
          body: typeof raw.text === 'string' ? raw.text : out.footer?.body,
        }
        break
      default:
        break
    }
  }
  return out
}

function legacyBlocksToCanonical(blocks: unknown[]): PageContent {
  const out: PageContent = {}
  for (const raw of blocks) {
    if (!isRecord(raw)) continue
    switch (raw._type) {
      case 'hero': {
        const ctas = Array.isArray(raw.ctas) ? (raw.ctas as Record<string, unknown>[]) : []
        const media = isRecord(raw.media) ? raw.media : undefined
        out.hero = {
          headline: typeof raw.headline === 'string' ? raw.headline : undefined,
          body: typeof raw.subheadline === 'string' ? raw.subheadline : undefined,
          media: media
            ? {
                url: typeof media.url === 'string' ? media.url : undefined,
                alt: typeof media.alt === 'string' ? media.alt : undefined,
              }
            : undefined,
          primaryCta: ctas[0]
            ? { label: ctas[0].label as string | undefined, url: ctas[0].url as string | undefined }
            : undefined,
          badges: Array.isArray(raw.badges) ? (raw.badges as string[]) : undefined,
        }
        break
      }
      case 'logo_cloud':
        out.logos = {
          title: typeof raw.title === 'string' ? raw.title : undefined,
          items: Array.isArray(raw.logos) ? (raw.logos as LogoItem[]) : [],
        }
        break
      case 'service_selector':
        out.services = { items: Array.isArray(raw.services) ? (raw.services as ServiceItem[]) : [] }
        break
      case 'metrics':
        out.metrics = { items: Array.isArray(raw.metrics) ? (raw.metrics as MetricItem[]) : [] }
        break
      case 'feature_grid':
        out.features = {
          items: Array.isArray(raw.features)
            ? (raw.features as Record<string, unknown>[]).map((f) => ({
                title: String(f.title ?? ''),
                body: String(f.description ?? ''),
                icon: typeof f.icon === 'string' ? f.icon : undefined,
              }))
            : [],
        }
        break
      case 'comparison':
        out.comparison = {
          title: typeof raw.title === 'string' ? raw.title : undefined,
          items: Array.isArray(raw.items) ? (raw.items as ComparisonItem[]) : [],
        }
        break
      case 'testimonials':
        out.testimonials = {
          items: Array.isArray(raw.testimonials) ? (raw.testimonials as TestimonialItem[]) : [],
        }
        break
      case 'faq':
        out.faq = {
          items: Array.isArray(raw.questions)
            ? (raw.questions as Record<string, unknown>[]).map((q) => ({
                question: String(q.question ?? ''),
                answer: String(q.answer ?? ''),
              }))
            : [],
        }
        break
      case 'cta':
        out.footer = {
          headline: typeof raw.headline === 'string' ? raw.headline : undefined,
          body: typeof raw.subheadline === 'string' ? raw.subheadline : undefined,
          cta: isRecord(raw.cta)
            ? { label: raw.cta.label as string | undefined, url: raw.cta.url as string | undefined }
            : undefined,
        }
        break
      default:
        break
    }
  }
  return out
}

export function normalizeLegacyPageContent(raw: unknown): PageContent {
  if (!isRecord(raw)) return {}
  const hasLegacySections = isRecord(raw.sections)
  const hasLegacyBlocks = Array.isArray(raw.blocks)
  if (!hasLegacySections && !hasLegacyBlocks) return raw as PageContent

  const fromSections = hasLegacySections
    ? legacySectionsToCanonical(raw.sections as Record<string, LegacySectionContent>)
    : {}
  const fromBlocks = hasLegacyBlocks ? legacyBlocksToCanonical(raw.blocks as unknown[]) : {}
  return {
    ...fromBlocks,
    ...fromSections,
    ...(isRecord(raw.browser) ? { browser: raw.browser as PageBrowserSettings } : {}),
  }
}
