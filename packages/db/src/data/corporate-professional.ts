import type { TemplateSchema } from '../leadGenTemplate'
import { DEFAULT_PAGE_FAVICON_URL, type PageContent } from '../content'

export const SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID = 'system-template-corporate-professional'

// Corporate Professional is a richer *renderer* than the plain lead-gen templates, but it shares
// the exact same schema shape ({sections: TemplateSection[]}) and reads the exact same canonical
// PageContent — see packages/db/src/content.ts. "Blocks-schema" as a distinct content shape no
// longer exists; only the visual component that renders each slot type differs
// (apps/web/src/components/landing-pages/templates/CorporateProfessional.tsx).
export const corporateProfessionalTitle = 'Homepage'
export const corporateProfessionalDescription =
  'Multi-section company homepage with services, proof, FAQ, and a contact form.'

export const corporateProfessionalSchema: TemplateSchema = {
  renderer: 'corporate-professional',
  sections: [
    { key: 'nav', type: 'nav', order: -1, hideable: false, editable: ['brand', 'links'] },
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['eyebrow', 'headline', 'body', 'media', 'primaryCta', 'badges'],
    },
    { key: 'logos', type: 'logo-cloud', order: 1, hideable: true, editable: ['title', 'items'] },
    {
      key: 'services',
      type: 'service-selector',
      order: 2,
      hideable: true,
      editable: ['title', 'body', 'items'],
    },
    { key: 'metrics', type: 'metrics', order: 3, hideable: true, editable: ['items'] },
    {
      key: 'features',
      type: 'feature-grid',
      order: 4,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    {
      key: 'comparison',
      type: 'comparison',
      order: 5,
      hideable: true,
      editable: ['title', 'items'],
    },
    {
      key: 'testimonials',
      type: 'testimonials',
      order: 6,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    { key: 'faq', type: 'faq', order: 7, hideable: true, editable: ['headline', 'body', 'items'] },
    // Editorial metadata, not an independent render node — 'studio-contact' (below) renders the
    // attached Form's fields nested inside its own contact block, never as a standalone section of
    // its own. This entry exists only so the Content tab can order/hide/delete it like every other
    // section; deleting/hiding it does not remove the footer, only the form fields within it (see
    // LandingPage.tsx's `hasForm` computation).
    { key: 'form', type: 'form-embed', order: 7.5, hideable: true, editable: [] },
    // Real lead capture, not a dead cta-band link — mirrors studio.ts's own 'footer' section.
    // Every nav/hero/footer CTA in this template's starter content already points at #contact
    // (studio-contact is the one section type that renders that id and the attached Form), so no
    // starter-content href changes were needed alongside this section-type swap.
    {
      key: 'footer',
      type: 'studio-contact',
      order: 8,
      hideable: false,
      editable: ['headline', 'body', 'cta'],
    },
  ],
  themeTokens: [],
}

export const corporateProfessionalStarterContent: PageContent = {
  browser: {
    title: 'Brightline',
    favicon: { url: DEFAULT_PAGE_FAVICON_URL },
  },
  nav: {
    brand: 'Brightline',
    links: [
      { label: 'Services', url: '#services' },
      { label: 'How we work', url: '#features' },
      { label: 'Clients', url: '#testimonials' },
      { label: 'Contact', url: '#contact' },
    ],
  },
  hero: {
    badges: ['Taking on new clients'],
    headline: 'Clear work. Reliable results.',
    body: 'We help businesses plan, deliver, and improve the work that matters — with honest scopes, real timelines, and people you can reach.',
    media: {
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000',
      alt: 'Bright, open workspace',
    },
    primaryCta: { label: 'Get in touch', url: '#contact' },
  },
  logos: {
    title: 'Trusted by teams we work with again',
    items: [
      { name: 'Northbound', icon: 'Globe' },
      { name: 'Halcyon', icon: 'Briefcase' },
      { name: 'Ledger & Co.', icon: 'Building' },
      { name: 'Meridian', icon: 'BarChart' },
      { name: 'Alder', icon: 'PieChart' },
    ],
  },
  services: {
    title: 'What we do',
    body: 'Three ways in, depending on what you already have figured out.',
    items: [
      {
        id: 'plan',
        label: 'Plan',
        headline: 'Get the scope right before anyone starts.',
        description:
          'We map the work, the owners, and the timeline — so you know the cost and the finish line before you commit.',
        icon: 'Compass',
        media: {
          url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=800',
          alt: 'Planning session',
        },
        cta: { label: 'Talk about planning', url: '#contact' },
      },
      {
        id: 'deliver',
        label: 'Deliver',
        headline: 'Build it with the same team that scoped it.',
        description:
          'No handoff to a junior bench. The people who write the plan are the people who ship the work.',
        icon: 'Cpu',
        media: {
          url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
          alt: 'Team delivering work',
        },
        cta: { label: 'Talk about delivery', url: '#contact' },
      },
      {
        id: 'improve',
        label: 'Improve',
        headline: 'Tighten what already works.',
        description:
          'Process, tools, and follow-through for teams that are busy — small changes that remove friction without a rebuild.',
        icon: 'TrendingUp',
        media: {
          url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
          alt: 'Reviewing results',
        },
        cta: { label: 'Talk about improvements', url: '#contact' },
      },
    ],
  },
  metrics: {
    items: [
      {
        value: '12 yrs',
        label: 'In practice',
        description: 'Same ownership since day one — no revolving account managers.',
      },
      {
        value: '180+',
        label: 'Projects shipped',
        description: 'Scoped, delivered, and closed out with a clear handoff.',
      },
      {
        value: '94%',
        label: 'Clients who return',
        description: 'Most of our work comes from people we have already helped.',
      },
    ],
  },
  features: {
    headline: 'How we work',
    body: 'Simple rules we follow on every engagement.',
    items: [
      {
        title: 'Clear scopes',
        body: 'You get a written plan with a price and a finish date before we start. No padding later.',
        icon: 'BarChart3',
      },
      {
        title: 'Senior people',
        body: 'You work with the people doing the work — not a relay of junior staff.',
        icon: 'Users',
      },
      {
        title: 'Real follow-through',
        body: 'We stay reachable after launch. Questions get answered; fixes get scheduled.',
        icon: 'Zap',
      },
    ],
  },
  comparison: {
    title: 'Working with us vs. a typical agency',
    items: [
      { feature: 'Who you talk to', us: 'The team doing the work', them: 'Account manager relay' },
      { feature: 'Pricing', us: 'Fixed scope, written up front', them: 'Hourly, open-ended' },
      { feature: 'Timeline', us: 'Dated milestones', them: 'Best-effort estimates' },
      { feature: 'After launch support', us: true, them: false },
      { feature: 'Written handoff', us: true, them: false },
    ],
  },
  testimonials: {
    headline: 'What clients say',
    body: 'Short notes from people we have worked with more than once.',
    items: [
      {
        quote:
          'They gave us a clear plan, stuck to the date, and answered the phone when something broke. That alone put them ahead of the last three firms we tried.',
        author: 'Sarah Jenkins',
        role: 'Owner, Northbound',
        avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      },
      {
        quote:
          'No buzzword deck. Just a scope, a price, and weekly updates we could show the rest of the team.',
        author: 'Marcus Chen',
        role: 'Ops lead, Halcyon',
        avatarUrl:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
      },
    ],
  },
  faq: {
    headline: 'Common questions',
    body: 'Straight answers before you reach out.',
    items: [
      {
        question: 'How do projects usually start?',
        answer:
          'A short kickoff call, then a written scope with price and timeline. We only start once you approve that document.',
      },
      {
        question: 'Who is this a good fit for?',
        answer:
          'Owner-led teams and growing companies that want clear delivery — not a long retainership with vague “strategy” hours.',
      },
      {
        question: 'How do you price the work?',
        answer:
          'Fixed scopes for defined projects. If the work changes, we rewrite the scope before anything extra starts.',
      },
    ],
  },
  footer: {
    headline: 'Ready to talk?',
    body: 'Tell us what you need. We reply within one business day with next steps — or a clear no if we are not the right fit.',
    cta: { label: 'Get in touch', url: '#contact' },
  },
}
