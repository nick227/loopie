import type { TemplateSchema } from '../leadGenTemplate'
import { DEFAULT_PAGE_FAVICON_URL, type PageContent } from '../content'

export const SYSTEM_STORE_TEMPLATE_ID = 'system-template-store'

// Fifth "rich" renderer family — product-first, for retail, apparel, makers, food products, and
// small catalogs who want visitors buying quickly. The two genuinely new section types this
// template introduces — 'product-grid' (priced items, a buy/shop CTA per card) and 'category-grid'
// (image tiles, no price) — are shared, generic types any future template can reuse, not
// Store-specific hacks. LOOPIE has no cart/checkout of its own (see CLAUDE.md's parking lot); each
// product/category item's own `cta.url` is expected to point wherever the business actually
// transacts (an external storefront) or to this page's own attached inquiry form via `#contact`,
// same pattern as every other template's CTAs. See apps/web/.../templates/Store.tsx for the
// visual language: rounder chrome and bolder CTAs than Portfolio/Studio, price-forward cards.
export const storeTitle = 'Store — Product-First Catalog'
export const storeDescription =
  'A product-first storefront for retail, apparel, makers, and small catalogs — featured products, categories, and a fast path to buying.'

export const storeSchema: TemplateSchema = {
  renderer: 'store',
  sections: [
    { key: 'nav', type: 'nav', order: -1, hideable: false, editable: ['brand', 'links'] },
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['badges', 'headline', 'body', 'media', 'primaryCta'],
    },
    {
      key: 'products',
      type: 'product-grid',
      order: 1,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    {
      key: 'categories',
      type: 'category-grid',
      order: 2,
      hideable: true,
      editable: ['headline', 'items'],
    },
    {
      key: 'intro',
      type: 'story',
      order: 3,
      hideable: true,
      editable: ['headline', 'body', 'media'],
    },
    { key: 'logos', type: 'logo-cloud', order: 4, hideable: true, editable: ['title', 'items'] },
    {
      key: 'testimonials',
      type: 'testimonials',
      order: 5,
      hideable: true,
      editable: ['items'],
    },
    // studio-contact, not cta-band — a Store page can still have a Form attached (e.g. a "10% off"
    // email-capture), which cta-band would never render. Restyled in the 'store' renderer as a
    // compact promo strip (headline/body/cta beside an inline email field), not the big dark
    // two-column block Studio/Corporate Professional use for it.
    {
      key: 'footer',
      type: 'studio-contact',
      order: 6,
      hideable: false,
      editable: ['headline', 'body', 'cta'],
    },
  ],
  themeTokens: [],
}

export const storeStarterContent: PageContent = {
  browser: {
    title: storeTitle,
    faviconUrl: DEFAULT_PAGE_FAVICON_URL,
  },
  nav: {
    brand: 'Amble Coffee',
    links: [{ label: 'Shop', url: '#products' }],
  },
  hero: {
    badges: ['Free shipping over $40', 'Roasted to order, every Tuesday'],
    headline: 'Coffee, roasted the week you drink it.',
    body: 'Small-batch beans from five family farms, roasted in Portland three days before your bag ships — not three months.',
    media: {
      url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1600',
      alt: 'Bag of freshly roasted coffee beans with beans scattered nearby',
    },
    primaryCta: { label: 'Shop coffee', url: '#products' },
  },
  products: {
    headline: 'Featured this week',
    items: [
      {
        id: 'cloudline',
        name: 'Cloudline — Light Roast',
        price: '$19',
        badge: 'Best seller',
        media: {
          url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=900',
          alt: 'Bag of Cloudline light roast coffee',
        },
        cta: { label: 'Shop now', url: '#' },
      },
      {
        id: 'basin',
        name: 'Basin — Medium Roast',
        price: '$19',
        media: {
          url: 'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?auto=format&fit=crop&q=80&w=900',
          alt: 'Bag of Basin medium roast coffee',
        },
        cta: { label: 'Shop now', url: '#' },
      },
      {
        id: 'night-watch',
        name: 'Night Watch — Dark Roast',
        price: '$19',
        badge: 'New',
        media: {
          url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=900',
          alt: 'Bag of Night Watch dark roast coffee',
        },
        cta: { label: 'Shop now', url: '#' },
      },
      {
        id: 'origin-trio',
        name: 'Origin Trio Sampler',
        price: '$42',
        media: {
          url: 'https://images.unsplash.com/photo-1442550528053-c431ecb55509?auto=format&fit=crop&q=80&w=900',
          alt: 'Close-up of roasted coffee beans',
        },
        cta: { label: 'Shop now', url: '#' },
      },
    ],
  },
  categories: {
    headline: 'Shop by category',
    items: [
      {
        label: 'Whole bean',
        url: '#',
        media: {
          url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=800',
          alt: 'Whole coffee beans',
        },
      },
      {
        label: 'Ground',
        url: '#',
        media: {
          url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800',
          alt: 'Ground coffee and whole beans on a wooden board',
        },
      },
      {
        label: 'Subscriptions',
        url: '#',
        media: {
          url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800',
          alt: 'Coffee bags packed for shipping',
        },
      },
      {
        label: 'Merch',
        url: '#',
        media: {
          url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=800',
          alt: 'Branded mug and tote bag',
        },
      },
    ],
  },
  intro: {
    headline: 'Small farms, short chain.',
    body: 'We buy directly from five farms we visit every year — no importers, no blending, no beans older than a season. If a harvest is thin, we sell less coffee. We don’t stretch it with something else.',
    media: {
      url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&q=80&w=1400',
      alt: 'A customer holding a latte with hand-poured art',
    },
  },
  logos: {
    title: 'As seen in',
    items: [
      { name: 'Sprudge' },
      { name: 'Food & Wine' },
      { name: 'Eater' },
      { name: 'Bon Appétit' },
    ],
  },
  testimonials: {
    items: [
      {
        quote:
          'The freshest coffee I have ever had delivered. You can genuinely taste the roast date.',
        author: 'Devin M.',
        role: 'Subscriber since 2023',
      },
      {
        quote: 'Origin Trio is how I finally figured out what roast I actually like.',
        author: 'Anh T.',
        role: 'Repeat customer',
      },
    ],
  },
  footer: {
    headline: 'Get 10% off your first order.',
    body: 'Join the list for new roasts and restock alerts — or skip straight to the shop.',
    cta: { label: 'Shop the full collection', url: '#products' },
  },
}
