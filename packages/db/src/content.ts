/**
 * Canonical landing-page content model.
 *
 * Every LandingPageTemplate — regardless of how richly it renders — reads and writes the same
 * `PageContent` shape, keyed by semantic slot group (`hero`, `features`, `footer`, ...), not a
 * per-template content shape. A template's schema (see leadGenTemplate.ts's `TemplateSection[]`)
 * declares which slot groups it renders and in what order/visibility; it does not own a private
 * content shape. This is what lets a page's content survive switching templates: a slot group a
 * template doesn't use is simply not rendered by it, never deleted.
 *
 * Visibility/order (`hidden`, `order`) is presentation, not content — it lives in a separate
 * `LayoutConfig`, not here.
 */

export type MediaRef = {
  assetId?: string
  url?: string
  alt?: string
  /** Render-time URL added by withResolvedMedia; never required in persisted content. */
  src?: string
}

export type CtaRef = {
  label?: string
  url?: string
}

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
// Asset rows have no caption/alt field of their own (see packages/db/prisma/schema.prisma) — same
// reasoning as every other per-use media reference in this file, the caption lives on the item.
export type GalleryItem = { assetId?: string; url?: string; alt?: string; caption?: string }
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
  /** Visitor-facing browser-tab title. Independent from LandingPage.name, which is internal. */
  title?: string
  /** Site-media image used by the rendered page's <link rel="icon"> tag. */
  favicon?: MediaRef
  /** @deprecated Kept only so pages saved during the URL-field rollout continue to render. */
  faviconUrl?: string
}

export type PageContent = {
  // Layout-independent browser metadata. It lives in content so publish snapshots freeze it with
  // the rest of the page and draft preview/export use the exact same values as the hosted page.
  browser?: PageBrowserSettings
  // Page chrome (brand name, nav links) — a content hole like any other, not template-baked
  // static text. Sales/Email don't render a nav bar at all, so this is Corporate-Professional-
  // only today, same "only one current consumer" treatment as logos/services/etc.
  nav?: { brand?: string; links?: NavLink[] }
  hero?: {
    eyebrow?: string
    headline?: string
    body?: string
    media?: MediaRef
    primaryCta?: CtaRef
    badges?: string[]
  }
  // `media` is optional here — most consumers (a plain two-column intro) leave it unset; Store's
  // 'story' section type is the one consumer that pairs it with an image.
  intro?: { headline?: string; body?: string; media?: MediaRef }
  // A standalone media section (Sales page's "image" section, or a media-audio/media-youtube
  // section) — distinct from hero.media, which is the hero's own inline image.
  media?: {
    kind?: 'image' | 'audio' | 'youtube'
    assetId?: string
    url?: string
    youtubeUrl?: string
    alt?: string
  }
  features?: { headline?: string; body?: string; items: FeatureItem[] }
  services?: { title?: string; body?: string; items: ServiceItem[] }
  testimonials?: { headline?: string; body?: string; items: TestimonialItem[] }
  faq?: { headline?: string; body?: string; items: FaqItem[] }
  logos?: { title?: string; items: LogoItem[] }
  metrics?: { items: MetricItem[] }
  comparison?: { title?: string; items: ComparisonItem[] }
  footer?: { headline?: string; body?: string; cta?: CtaRef }
  // A pure-visual image wall (studio/behind-the-scenes photos, work samples with no case-study
  // copy) — distinct from `services`, which pairs each item with a headline/description/link.
  gallery?: { title?: string; body?: string; items: GalleryItem[] }
  // People, not case studies — Studio's "About/Team" and Portfolio's "About" (a single-item team
  // for a solo practitioner). Distinct from `testimonials` (quotes from clients, not the business's
  // own people) and from `services` (what's offered, not who does it).
  team?: { headline?: string; body?: string; items: TeamMemberItem[] }
  // Store's product listing — distinct slot from `services`/`features` because price/badge/buy-CTA
  // is genuinely different content shape, and because Store's Featured Products and Categories
  // sections must not collide on one shared slot (see SECTION_TYPE_TO_SLOT_GROUP's doc comment).
  products?: { headline?: string; body?: string; items: ProductItem[] }
  // Store's category tiles (image + label, no price) — kept separate from `products` for the same
  // no-slot-collision reason above; a page can carry both a Featured Products grid and a Categories
  // grid at once.
  categories?: { headline?: string; items: CategoryItem[] }
  // Event-specific config for webinar/event-signup templates — not editorial copy so much as a
  // few settings, but it fits the same canonical-slot-group model as everything else. The
  // "seats filled" figure itself is deliberately NOT stored here — it's a live, real count of
  // this page's own FormSubmission rows, computed at render time, never authored/edited content.
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

export type LayoutConfig = {
  sections?: Record<string, { hidden?: boolean; order?: number }>
}

export type SlotGroupKey = Exclude<keyof PageContent, 'browser'>

// A section's `type` (in a TemplateSection[] schema) declares which canonical slot group it
// renders. Several section types can share one slot group (e.g. both "hero" and Email's
// "split-capture" render `content.hero`) — the slot group is the content identity, the type is
// just which visual component renders it. `form-embed` intentionally maps to nothing: form
// content is a separate Form entity, not page content.
//
// The inverse must never happen: a single template's schema must never declare two sections whose
// *types* map to the same slot group (renderBody/ContentView key content purely by slot group, not
// by section key, so a second section of an already-used type would silently read/write the first
// section's content instead of getting its own). This is why, e.g., Store's Featured Products and
// Categories sections are two distinct types ('product-grid' -> products, 'category-grid' ->
// categories) even though they render visually similar item grids — and why a template wanting two
// differently-purposed "grid of things with a headline" sections must mint a new type/slot pair
// per purpose rather than reusing one type twice.
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
        // form-embed and unknown legacy section keys carry no canonical content.
        break
    }
  }
  return out
}

function legacyBlocksToCanonical(blocks: unknown[]): PageContent {
  const out: PageContent = {}
  for (const raw of blocks) {
    if (!isRecord(raw)) continue
    const type = raw._type
    switch (type) {
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
        // Dead/unused block types (pricing, timeline, ...) have no real renderer — no canonical mapping.
        break
    }
  }
  return out
}

/**
 * Reads content in whatever shape it was persisted in (already-canonical, or one of the two
 * pre-migration shapes — `{sections: {...}}` or `{blocks: [...]}` ) and always returns the
 * canonical `PageContent` shape. Applied transparently on every read (client hydrate, server
 * render) — there is no migration script and no dual-write; the next save always persists
 * canonical shape, so this only ever matters for rows that predate this model.
 */
export function normalizeLegacyPageContent(raw: unknown): PageContent {
  if (!isRecord(raw)) return {}
  const hasLegacySections = isRecord(raw.sections)
  const hasLegacyBlocks = Array.isArray(raw.blocks)
  if (!hasLegacySections && !hasLegacyBlocks) return raw as PageContent

  const fromSections = hasLegacySections
    ? legacySectionsToCanonical(raw.sections as Record<string, unknown>)
    : {}
  const fromBlocks = hasLegacyBlocks ? legacyBlocksToCanonical(raw.blocks as unknown[]) : {}
  // Sections-derived values win on overlap (e.g. both declare `hero`) — arbitrary but
  // deterministic; in practice a given legacy row only ever had one of the two shapes, so this
  // is really just `{...fromBlocks, ...fromSections}` with each side only contributing the keys
  // it actually produced.
  return {
    ...fromBlocks,
    ...fromSections,
    ...(isRecord(raw.browser) ? { browser: raw.browser as PageBrowserSettings } : {}),
  }
}
