import type { TemplateSchema } from '../leadGenTemplate'
import { DEFAULT_PAGE_FAVICON_URL, type PageContent } from '../content'
import { PAGE_THEME_PRESETS } from '../pageThemes'

export const SYSTEM_PORTFOLIO_TEMPLATE_ID = 'system-template-portfolio'

// Fourth "rich" renderer family — visual-first and editorial, for photographers, filmmakers,
// designers, architects, builders, and solo/small creative practices who sell through the work
// itself. Distinct from Studio (which is brand-forward and typography-led, selling the *company*):
// here the hero and "Featured Work" sections are almost entirely image, copy stays minimal, and
// the closing section is quiet rather than a bold color block. Reuses the same section-type
// vocabulary as Studio/Corporate Professional (service-selector for curated work, feature-grid for
// a restrained services list, the new 'team' type for a single-person About) — see
// apps/web/.../templates/Portfolio.tsx for the visual language.
export const portfolioTitle = 'Portfolio'
export const portfolioDescription =
  'Image-led showcase of your work with a short bio and inquiry form.'

export const portfolioSchema: TemplateSchema = {
  renderer: 'portfolio',
  sections: [
    { key: 'nav', type: 'nav', order: -1, hideable: false, editable: ['brand', 'links'] },
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['eyebrow', 'headline', 'body', 'media', 'primaryCta'],
    },
    {
      key: 'services',
      type: 'service-selector',
      order: 1,
      hideable: true,
      editable: ['title', 'items'],
    },
    {
      key: 'features',
      type: 'feature-grid',
      order: 2,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    { key: 'team', type: 'team', order: 3, hideable: true, editable: ['items'] },
    { key: 'logos', type: 'logo-cloud', order: 4, hideable: true, editable: ['title', 'items'] },
    {
      key: 'testimonials',
      type: 'testimonials',
      order: 5,
      hideable: true,
      editable: ['items'],
    },
    // Editorial metadata, not an independent render node — 'studio-contact' (below) renders the
    // attached Form's fields nested inside its own contact block, never as a standalone section.
    // Exists only so the Content tab can order/hide/delete it like every other section.
    { key: 'form', type: 'form-embed', order: 5.5, hideable: true, editable: [] },
    {
      key: 'footer',
      type: 'studio-contact',
      order: 6,
      hideable: false,
      editable: ['headline', 'body', 'cta'],
    },
  ],
  themeTokens: [],
  themePresets: PAGE_THEME_PRESETS,
}

export const portfolioStarterContent: PageContent = {
  browser: {
    title: 'Corinne Vale',
    favicon: { url: DEFAULT_PAGE_FAVICON_URL },
  },
  nav: {
    brand: 'Corinne Vale',
    links: [{ label: 'Inquire', url: '#contact' }],
  },
  hero: {
    eyebrow: 'Photographer & visual storyteller',
    headline: 'Quiet, honest work.',
    body: 'Based on the Oregon coast — commissioned projects for people and publications who want images that hold up for years, not a week of likes.',
    media: {
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2400',
      alt: 'Couple walking along a coastal cliff at golden hour',
    },
    primaryCta: { label: 'Inquire', url: '#contact' },
  },
  services: {
    title: 'Featured work',
    items: [
      {
        id: 'cannon-beach',
        label: 'Project',
        headline: 'A quiet ceremony on Cannon Beach',
        description: 'Two families, one long table, and a coastline that did most of the work.',
        media: {
          url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&q=80&w=1800',
          alt: 'Intimate outdoor ceremony on a beach',
        },
        cta: { label: 'Inquire about a similar project', url: '#contact' },
      },
      {
        id: 'kinfolk-editorial',
        label: 'Editorial',
        headline: 'A slow-living feature for Kinfolk',
        description: 'Four days following a family of bakers through their last harvest season.',
        media: {
          url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1800',
          alt: 'Editorial portrait in warm natural light',
        },
        cta: { label: 'Inquire about a similar project', url: '#contact' },
      },
      {
        id: 'juniper-house',
        label: 'Series',
        headline: 'Two people, a ridge, and a Wednesday',
        description: 'No guest list. Just the two of them and about six miles of trail.',
        media: {
          url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&q=80&w=1800',
          alt: 'Couple embracing on a mountain ridge',
        },
        cta: { label: 'Inquire about a similar project', url: '#contact' },
      },
    ],
  },
  features: {
    headline: 'What I take on',
    body: 'Three kinds of work, one way of paying attention.',
    items: [
      {
        title: 'Events',
        body: 'Full-day coverage with no rigid shot list — I follow the day instead of directing it.',
      },
      {
        title: 'Editorial',
        body: 'Commissioned stories for print and digital publications, shot on location.',
      },
      {
        title: 'Portraits',
        body: 'A single afternoon, one location, a small set of images that actually look like you.',
      },
    ],
  },
  team: {
    items: [
      {
        name: 'Corinne Vale',
        role: 'Photographer',
        bio: 'I started shooting for friends because I could not afford to hire anyone good. Twelve years later it is still the only kind of work I want to do.',
        media: {
          url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80&w=800',
          alt: 'Portrait of Corinne Vale',
        },
      },
    ],
  },
  logos: {
    title: 'Featured in',
    items: [{ name: 'Kinfolk' }, { name: 'The Knot' }, { name: 'Cereal' }, { name: 'Rue' }],
  },
  testimonials: {
    items: [
      {
        quote:
          'She spent more time watching us than posing us. The photos feel like the day actually felt.',
        author: 'Priya & Tom',
        role: 'Cannon Beach project',
      },
      {
        quote: 'The calmest person on a very unmanageable day. The gallery made me cry, twice.',
        author: 'Naomi R.',
        role: 'Private commission',
      },
    ],
  },
  footer: {
    headline: 'Let’s talk about your project.',
    body: 'A few details about the date and the place is enough to start — I reply within two days.',
  },
}
