import { STARTER_AD_IMAGES } from './starterImages'

// 2026-09-10 — grown from 5 to 8, mirroring Pages' 8-item starter catalog (including a Blank
// entry). Social proof and brand awareness are genuinely new purposes, not relabels; blank is a
// deliberate no-assumption starting point, matching Pages' own General/Blank Page Type.
//
// 2026-09-10 correction — a Type's "layout" is one of the product's actual 4 ad formats (Meta
// Feed / Instagram Story / Google Display / River — the same 4 the Ad Editor's own review-preview
// tabs already use, see apps/web/src/components/ads/preview/), not an invented internal concept.
// Each Type has exactly one format, chosen at creation, never swapped — matching
// docs/strategy/ads-catalog-and-rendition-model.md's already-decided "no compatibility evaluator"
// model. 7 of the 8 types also ship a real illustration (starterImages.ts) so the starter catalog
// is genuinely image + text prefilled, not text-only; Blank stays deliberately empty — the one
// starter with no image and no content beyond the business's own name.
//
// 2026-09-10 second correction — the starter catalog no longer renders its own flat "ad creative"
// HTML to produce thumbnails (that whole server-side screenshot pipeline, `AdCatalogPreviewService`
// + this module's old `renderStarterAd`/`AdCatalogStyleKey`/`style` field, is deleted). A starter's
// thumbnail on the Advertising list is now the *real* MetaFeedPreview/InstagramStoryPreview/
// GoogleDisplayPreview/RiverPreview component — the exact same ones the Ad Editor's own preview
// tabs use — rendered live client-side (`AdCatalogStartRow.tsx`), so the picker can never visually
// drift from what the editor actually shows. `style`/`AD_CATALOG_STYLES` accordingly dropped
// entirely — those preview components aren't themeable, they're fixed platform-chrome mockups.
export const AD_CATALOG_FORMATS = {
  'meta-feed': { label: 'Meta Feed' },
  'instagram-story': { label: 'Instagram Story' },
  'google-display': { label: 'Google Display' },
  river: { label: 'River' },
} as const
export type AdCatalogFormatKey = keyof typeof AD_CATALOG_FORMATS

export type AdPurpose =
  | 'introduction'
  | 'contact'
  | 'spotlight'
  | 'offer'
  | 'event'
  | 'testimonial'
  | 'awareness'
  | 'blank'
export type AdObjective = 'AWARENESS' | 'TRAFFIC'
export type StarterBusiness = {
  name: string
  tagline?: string
  description?: string
  location?: string
  destinationUrl?: string
  mediaUrl?: string
  mediaAlt?: string
}
export type StarterFacts = {
  spotlight?: {
    name: string
    benefit: string
    price?: string
    mediaUrl?: string
    mediaAlt?: string
  }
  offer?: { headline: string; terms: string; expiry?: string }
  event?: {
    name: string
    date: string
    time: string
    timezone: string
    venue: string
    destinationUrl?: string
  }
  // Real quote and attribution only — never invented. See `testimonial`'s `missing()` below;
  // this is exactly the field the original 5-item proposal deferred until a business supplies one.
  testimonial?: { quote: string; author: string; role?: string }
}
type StarterContext = { business: StarterBusiness; facts: StarterFacts }

/** Prefill content for one starter draft — matches what CreateAdPage.tsx's form fields need. */
export type StarterAdContent = {
  businessName: string
  eyebrow: string
  headline: string
  body?: string
  detail?: string
  footer?: string
  ctaLabel?: string
  mediaUrl?: string
  mediaAlt?: string
}

type AdTypeDefinition = {
  label: string
  objective: AdObjective
  format: AdCatalogFormatKey
  placements: readonly string[]
  requiredFacts: readonly string[]
  bind: (context: StarterContext) => Partial<StarterAdContent> & { headline: string }
  missing: (context: StarterContext) => string[]
}
const blank = (value?: string) => !value?.trim()
const needed = (fields: Record<string, string | undefined>) =>
  Object.entries(fields)
    .filter(([, value]) => blank(value))
    .map(([key]) => key)

/** Types describe business purpose; format describes which real ad placement it targets. */
export const AD_TYPE_REGISTRY = {
  introduction: {
    label: 'Meet the business',
    objective: 'AWARENESS',
    format: 'meta-feed',
    placements: ['river-feed', 'meta-feed', 'owned-site'],
    requiredFacts: [],
    bind: ({ business }) => ({
      headline: business.tagline || `Meet ${business.name}.`,
      body: business.description,
      eyebrow: 'Hello, neighbor',
    }),
    missing: () => [],
  },
  contact: {
    label: 'Let’s talk',
    objective: 'TRAFFIC',
    format: 'meta-feed',
    placements: ['river-feed', 'meta-feed', 'linkedin-feed', 'owned-site'],
    requiredFacts: ['destinationUrl'],
    bind: ({ business }) => ({
      headline: 'Let’s talk.',
      body: business.description || `Get in touch with ${business.name}.`,
      eyebrow: 'Here to help',
      ctaLabel: 'Contact us',
    }),
    missing: ({ business }) => needed({ destinationUrl: business.destinationUrl }),
  },
  spotlight: {
    label: 'Featured product or service',
    objective: 'TRAFFIC',
    format: 'instagram-story',
    placements: ['river-feed', 'meta-feed'],
    requiredFacts: ['spotlight.name', 'spotlight.benefit', 'destinationUrl'],
    bind: ({ facts }) => ({
      headline: facts.spotlight?.name || 'Your featured product or service',
      body: facts.spotlight?.benefit || 'Add what makes it useful to your customers.',
      detail: facts.spotlight?.price,
      eyebrow: 'In the spotlight',
      ctaLabel: 'Find out more',
      ...(facts.spotlight?.mediaUrl
        ? { mediaUrl: facts.spotlight.mediaUrl, mediaAlt: facts.spotlight.mediaAlt }
        : {}),
    }),
    missing: ({ business, facts }) =>
      needed({
        'spotlight.name': facts.spotlight?.name,
        'spotlight.benefit': facts.spotlight?.benefit,
        destinationUrl: business.destinationUrl,
      }),
  },
  offer: {
    label: 'Current special',
    objective: 'TRAFFIC',
    format: 'google-display',
    placements: ['river-feed', 'meta-feed', 'owned-site'],
    requiredFacts: ['offer.headline', 'offer.terms', 'destinationUrl'],
    bind: ({ facts }) => ({
      headline: facts.offer?.headline || 'Your next special',
      body: facts.offer?.terms || 'Add your actual offer and its terms.',
      detail: facts.offer?.expiry ? `Available through ${facts.offer.expiry}` : undefined,
      eyebrow: 'Something special',
      ctaLabel: 'View offer',
    }),
    missing: ({ business, facts }) =>
      needed({
        'offer.headline': facts.offer?.headline,
        'offer.terms': facts.offer?.terms,
        destinationUrl: business.destinationUrl,
      }),
  },
  event: {
    label: 'What’s coming up',
    objective: 'AWARENESS',
    format: 'river',
    placements: ['river-feed', 'meta-feed', 'owned-site'],
    requiredFacts: ['event.name', 'event.date', 'event.time', 'event.timezone', 'event.venue'],
    bind: ({ facts }) => ({
      headline: facts.event?.name || 'Your next event',
      body: facts.event
        ? [facts.event.date, facts.event.time, facts.event.timezone].filter(Boolean).join(' · ')
        : 'Add the date, time, and timezone.',
      detail: facts.event?.venue || 'Add a venue or online location.',
      eyebrow: 'You’re invited',
      ctaLabel: facts.event?.destinationUrl ? 'Event details' : undefined,
    }),
    missing: ({ facts }) =>
      needed({
        'event.name': facts.event?.name,
        'event.date': facts.event?.date,
        'event.time': facts.event?.time,
        'event.timezone': facts.event?.timezone,
        'event.venue': facts.event?.venue,
      }),
  },
  testimonial: {
    label: 'Social proof',
    objective: 'AWARENESS',
    format: 'river',
    placements: ['river-feed', 'meta-feed', 'owned-site'],
    requiredFacts: ['testimonial.quote', 'testimonial.author'],
    bind: ({ facts }) => ({
      headline: facts.testimonial?.quote
        ? `“${facts.testimonial.quote}”`
        : 'Your next great review',
      body: facts.testimonial
        ? [facts.testimonial.author, facts.testimonial.role].filter(Boolean).join(', ')
        : 'Add a real customer quote and who said it.',
      eyebrow: 'What customers say',
    }),
    // Deliberately never fabricated — the whole point of this type. A missing quote/author keeps
    // this an explicit completion field, exactly like offer/event's real facts.
    missing: ({ facts }) =>
      needed({
        'testimonial.quote': facts.testimonial?.quote,
        'testimonial.author': facts.testimonial?.author,
      }),
  },
  awareness: {
    label: 'Brand awareness',
    objective: 'AWARENESS',
    // instagram-story (not introduction's meta-feed) — a real visual difference, not a relabel.
    format: 'instagram-story',
    placements: ['river-feed', 'meta-feed', 'owned-site'],
    requiredFacts: [],
    bind: ({ business }) => ({
      headline: business.tagline || business.name,
      body: business.description,
      eyebrow: 'Been here a while',
    }),
    missing: () => [],
  },
  blank: {
    label: 'Blank',
    objective: 'AWARENESS',
    // Meta Feed with nothing prefilled beyond the business name — the one starter with no image
    // and no copy, a deliberate no-assumption starting point (matches Pages' Blank Page Type).
    format: 'meta-feed',
    placements: [],
    requiredFacts: [],
    // A real headline is still required by the editor's preview — the business name is the one
    // fact guaranteed non-empty, same spirit as Pages' Blank Page Type still needing *a* renderer
    // even with genuinely empty starter content. No mediaUrl here, and none is applied as a
    // fallback below — Blank is the one type STARTER_AD_IMAGES deliberately has no entry for.
    bind: ({ business }) => ({ headline: business.name, eyebrow: '', mediaUrl: undefined }),
    missing: () => [],
  },
} satisfies Record<AdPurpose, AdTypeDefinition>

export type StarterAd = {
  starterKey: AdPurpose
  typeKey: AdPurpose
  formatKey: AdCatalogFormatKey
  objective: AdObjective
  content: StarterAdContent
  destinationUrl?: string
  missingFields: string[]
}

/** Pure draft preparation: no DB writes, invented commercial facts, publishing, or spend. */
export function createStarterAds(business: StarterBusiness, facts: StarterFacts = {}): StarterAd[] {
  if (blank(business.name)) throw new Error('Starter Ads need a business name')
  const context = { business, facts }
  return (Object.keys(AD_TYPE_REGISTRY) as AdPurpose[]).map((typeKey) => {
    const type: AdTypeDefinition = AD_TYPE_REGISTRY[typeKey]
    return {
      starterKey: typeKey,
      typeKey,
      formatKey: type.format,
      objective: type.objective,
      content: {
        businessName: business.name,
        eyebrow: type.label,
        footer: business.location,
        // Generic shipped illustration by default; a real business photo (if ever supplied)
        // outranks it; a type's own fact-specific media (e.g. spotlight's own photo, or Blank's
        // deliberate `undefined`) has the final say — see each type's own `bind()` above.
        mediaUrl: STARTER_AD_IMAGES[typeKey],
        mediaAlt: `${type.label} illustration`,
        ...(business.mediaUrl ? { mediaUrl: business.mediaUrl, mediaAlt: business.mediaAlt } : {}),
        ...type.bind(context),
      },
      destinationUrl: typeKey === 'event' ? facts.event?.destinationUrl : business.destinationUrl,
      missingFields: type.missing(context),
    }
  })
}
