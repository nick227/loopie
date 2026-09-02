import type { TemplateSchema } from '../leadGenTemplate'
import { DEFAULT_PAGE_FAVICON_URL, type PageContent } from '../content'

export const SYSTEM_STUDIO_TEMPLATE_ID = 'system-template-studio'

// Third "rich" renderer family. Reuses almost every existing canonical slot group — the
// distinctiveness is mostly in its visual language (apps/web/.../templates/Studio.tsx): oversized
// editorial typography, no card chrome, hairline rules instead of shadows/borders, asymmetric
// grids. Two new section *types*: 'studio-contact' (a plain footer-slot renderer that also
// carries the real signup form, same pattern as webinar-widget) and 'photo-gallery' (a pure
// visual image wall, backing the new canonical `gallery` slot group in content.ts).
//
// Reordered and extended (see CLAUDE.md's Portfolio/Studio/Store pass): section order now follows
// Hero -> What we do (services) -> Selected work (gallery, a light-touch proof wall rather than a
// full case-study treatment) -> How we work (features/process) -> About/Team (new 'team' type) ->
// Testimonials -> FAQ -> Contact, matching the brief's "explain services clearly, feature selected
// work as proof without making the whole page a portfolio, and make the team feel human and
// credible."
export const studioTitle = 'Studio — Bold, Editorial Portfolio'
export const studioDescription =
  'An editorial, trust-building landing page for creative and marketing studios — oversized typography, a selected-work grid, and a real project-inquiry form.'

export const studioSchema: TemplateSchema = {
  renderer: 'studio',
  sections: [
    { key: 'nav', type: 'nav', order: -1, hideable: false, editable: ['brand', 'links'] },
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['headline', 'body', 'media', 'primaryCta'],
    },
    { key: 'logos', type: 'logo-cloud', order: 1, hideable: true, editable: ['title', 'items'] },
    { key: 'metrics', type: 'metrics', order: 2, hideable: true, editable: ['items'] },
    {
      key: 'services',
      type: 'service-selector',
      order: 3,
      hideable: true,
      editable: ['title', 'body', 'items'],
    },
    {
      key: 'gallery',
      type: 'photo-gallery',
      order: 4,
      hideable: true,
      editable: ['title', 'items'],
    },
    {
      key: 'features',
      type: 'feature-grid',
      order: 5,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    {
      key: 'team',
      type: 'team',
      order: 6,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    {
      key: 'testimonials',
      type: 'testimonials',
      order: 7,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    { key: 'faq', type: 'faq', order: 8, hideable: true, editable: ['headline', 'body', 'items'] },
    {
      key: 'footer',
      type: 'studio-contact',
      order: 9,
      hideable: false,
      editable: ['headline', 'body', 'cta'],
    },
  ],
  themeTokens: [],
}

export const studioStarterContent: PageContent = {
  browser: {
    title: studioTitle,
    faviconUrl: DEFAULT_PAGE_FAVICON_URL,
  },
  nav: {
    brand: 'Fieldnote',
    links: [{ label: 'Start a project', url: '#contact' }],
  },
  hero: {
    headline: 'We build brands people actually remember.',
    body: 'Fieldnote is an independent studio for founders who want fewer, better decisions — strategy, identity, and digital design under one roof.',
    media: {
      url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=2400',
      alt: 'Studio workspace with design work in progress',
    },
    primaryCta: { label: 'Start a project', url: '#contact' },
  },
  logos: {
    title: 'Trusted by teams building something real',
    items: [
      { name: 'Northbound' },
      { name: 'Halcyon' },
      { name: 'Ledger & Co.' },
      { name: 'Meridian' },
      { name: 'Alder' },
    ],
  },
  metrics: {
    items: [
      { value: '11', label: 'Years in practice' },
      { value: '64', label: 'Brands launched' },
      { value: '92%', label: 'Clients who return' },
    ],
  },
  features: {
    headline: 'How we work',
    body: 'Three phases. No handoffs, no black box.',
    items: [
      {
        title: 'Discover',
        body: 'We spend two weeks in your business before we design anything — talking to your team, your customers, your competitors.',
      },
      {
        title: 'Design',
        body: 'Strategy becomes system: identity, voice, and the digital experience, built together so nothing feels bolted on.',
      },
      {
        title: 'Deliver',
        body: 'You leave with real files, real guidelines, and a team that still picks up the phone six months later.',
      },
    ],
  },
  services: {
    title: 'What we do',
    body: 'Three ways in, depending on how much of the problem is already solved.',
    items: [
      {
        id: 'strategy',
        label: 'Strategy',
        headline: 'Positioning, before anything gets designed.',
        description:
          'Who you’re for, what you’re actually selling, and the one thing competitors can’t say. Two weeks, one document, no deck theater.',
        media: {
          url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1600',
          alt: 'Strategy workshop with sticky notes and whiteboards',
        },
        cta: { label: 'Start with strategy', url: '#contact' },
      },
      {
        id: 'identity',
        label: 'Identity',
        headline: 'A system, not a logo file.',
        description:
          'Mark, type, color, and voice — built to survive a hundred people using it without you in the room.',
        media: {
          url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=1600',
          alt: 'Brand identity type and color proofs',
        },
        cta: { label: 'See identity work', url: '#contact' },
      },
      {
        id: 'digital',
        label: 'Digital',
        headline: 'The site and product, built by the same team.',
        description:
          'No handoff between the brand studio and the build team — one team, so nothing gets lost in translation.',
        media: {
          url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1600',
          alt: 'Digital product design on a laptop screen',
        },
        cta: { label: 'See digital work', url: '#contact' },
      },
    ],
  },
  gallery: {
    title: 'Selected work',
    items: [
      {
        url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200',
        alt: 'Studio hallway and workspace',
        caption: 'The studio, most Mondays',
      },
      {
        url: 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&q=80&w=1200',
        alt: 'Design team reviewing print samples',
        caption: 'Print review, Northbound',
      },
      {
        url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200',
        alt: 'Close-up of a color palette board',
        caption: 'Palette exploration',
      },
      {
        url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1200',
        alt: 'Studio desk with sketches',
        caption: 'Early sketches, Halcyon',
      },
      {
        url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=1200',
        alt: 'Printed brand guideline pages',
        caption: 'Finished guidelines',
      },
      {
        url: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&q=80&w=1200',
        alt: 'Team working around a table',
        caption: 'Studio, most Tuesdays',
      },
    ],
  },
  team: {
    headline: 'Who you’ll actually work with',
    body: 'A small studio on purpose — the people who pitch it are the people who make it.',
    items: [
      {
        name: 'Jules Okonkwo',
        role: 'Founder, Creative Director',
        bio: 'Eleven years leading brand work for founder-led companies, previously at a 40-person agency she left to keep the client list small.',
        media: {
          url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800',
          alt: 'Portrait of Jules Okonkwo',
        },
      },
      {
        name: 'Marcus Lindqvist',
        role: 'Head of Strategy',
        bio: 'Asks the harder questions first, so the design phase doesn’t have to answer them for the third time.',
        media: {
          url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
          alt: 'Portrait of Marcus Lindqvist',
        },
      },
      {
        name: 'Ada Reyes',
        role: 'Senior Designer',
        bio: 'Builds the systems that make a brand survivable past launch day — the part most studios skip.',
        media: {
          url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
          alt: 'Portrait of Ada Reyes',
        },
      },
    ],
  },
  testimonials: {
    headline: 'What it’s like to work with us',
    body: '',
    items: [
      {
        quote:
          'They asked harder questions about our business than our own board did. The brand that came out of it was the easy part.',
        author: 'Priya Anand',
        role: 'Founder, Northbound',
      },
      {
        quote:
          'No decks full of buzzwords. Just decisions, explained plainly, that turned out to be right.',
        author: 'Sam Okafor',
        role: 'CEO, Halcyon',
      },
    ],
  },
  faq: {
    headline: 'Before you reach out',
    body: '',
    items: [
      {
        question: 'What size clients do you take on?',
        answer:
          'Mostly founder-led companies between 5 and 200 people — early enough that brand decisions still compound, established enough to commit to them.',
      },
      {
        question: 'How long does an engagement run?',
        answer:
          'Most brand and identity engagements run 8–12 weeks. Ongoing digital work is scoped separately, month to month.',
      },
      {
        question: 'Do you work with agencies or only direct?',
        answer:
          'Both — about a third of our work comes through agency and VC referrals for portfolio companies.',
      },
    ],
  },
  footer: {
    headline: 'Tell us what you’re building.',
    body: 'A short note is enough to start — we reply within two business days, every time.',
    cta: { label: 'Send it', url: '#contact' },
  },
}
