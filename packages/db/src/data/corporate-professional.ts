import type { TemplateSchema } from '../leadGenTemplate'
import type { PageContent } from '../content'

export const SYSTEM_CORPORATE_PROFESSIONAL_TEMPLATE_ID = 'system-template-corporate-professional'

// Corporate Professional is a richer *renderer* than the plain lead-gen templates, but it shares
// the exact same schema shape ({sections: TemplateSection[]}) and reads the exact same canonical
// PageContent — see packages/db/src/content.ts. "Blocks-schema" as a distinct content shape no
// longer exists; only the visual component that renders each slot type differs
// (apps/web/src/components/landing-pages/templates/CorporateProfessional.tsx).
export const corporateProfessionalTitle = 'Nexus Consulting | Strategic Growth Solutions'
export const corporateProfessionalDescription =
  'We partner with enterprise leaders to drive digital transformation, scale operations, and accelerate revenue growth globally.'

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
    {
      key: 'footer',
      type: 'cta-band',
      order: 8,
      hideable: true,
      editable: ['headline', 'body', 'cta'],
    },
  ],
  themeTokens: [],
}

export const corporateProfessionalStarterContent: PageContent = {
  nav: {
    brand: 'Nexus',
    links: [
      { label: 'Services', url: '#services' },
      { label: 'Our Approach', url: '#approach' },
      { label: 'Testimonials', url: '#testimonials' },
      { label: 'Contact', url: '#contact' },
    ],
  },
  hero: {
    badges: ['Award-winning Consultancy 2026'],
    headline: 'Transforming complexity into competitive advantage.',
    body: 'We partner with ambitious leaders to redefine their industries. Leverage our deep expertise in strategy, operations, and digital innovation.',
    media: {
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000',
      alt: 'Modern corporate office',
    },
    primaryCta: { label: 'Schedule a Consultation', url: '#contact' },
  },
  logos: {
    title: 'Trusted by global industry leaders',
    items: [
      { name: 'Acme Corp', icon: 'Globe' },
      { name: 'Stark Industries', icon: 'Briefcase' },
      { name: 'Wayne Enterprises', icon: 'Building' },
      { name: 'Massive Dynamic', icon: 'BarChart' },
      { name: 'Globex', icon: 'PieChart' },
    ],
  },
  services: {
    title: 'Our Core Practices',
    body: 'Comprehensive solutions tailored to your unique business challenges.',
    items: [
      {
        id: 'strategy',
        label: 'Strategy & Operations',
        headline: 'Navigate uncertainty with confidence',
        description:
          'We help executives align their vision with actionable operational models, ensuring sustainable growth and market dominance in an ever-shifting landscape.',
        icon: 'Compass',
        media: {
          url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=800',
          alt: 'Strategy meeting',
        },
        cta: { label: 'Learn More', url: '#' },
      },
      {
        id: 'digital',
        label: 'Digital Transformation',
        headline: 'Modernize your technological core',
        description:
          'From migrating legacy systems to implementing AI-driven workflows, we future-proof your organization for the next decade of digital evolution.',
        icon: 'Cpu',
        media: {
          url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
          alt: 'Digital network',
        },
        cta: { label: 'View Capabilities', url: '#' },
      },
      {
        id: 'finance',
        label: 'M&A Advisory',
        headline: 'Maximize shareholder value',
        description:
          'End-to-end guidance through complex mergers, acquisitions, and restructuring. We handle the due diligence so you can focus on integration.',
        icon: 'TrendingUp',
        media: {
          url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
          alt: 'Financial charts',
        },
        cta: { label: 'Consult our Experts', url: '#' },
      },
    ],
  },
  metrics: {
    items: [
      {
        value: '$2.4B+',
        label: 'Value Created',
        description: 'Measurable enterprise value added for our clients over the past decade.',
      },
      {
        value: '450+',
        label: 'Global Projects',
        description: 'Successful engagements spanning across 30+ countries and major industries.',
      },
      {
        value: '98%',
        label: 'Client Retention',
        description:
          'Our commitment to excellence ensures lasting partnerships and recurring engagements.',
      },
    ],
  },
  features: {
    headline: 'The Nexus Advantage',
    body: 'What sets us apart is not just what we do, but how we do it. Our methodologies guarantee results.',
    items: [
      {
        title: 'Data-Driven Insights',
        body: 'We don’t guess. Every recommendation is backed by rigorous quantitative analysis and market intelligence.',
        icon: 'BarChart3',
      },
      {
        title: 'Senior Expertise',
        body: 'You get direct access to seasoned partners, not just junior analysts. Experience matters.',
        icon: 'Users',
      },
      {
        title: 'Rapid Execution',
        body: 'We move at the speed of modern business. We design strategies that can be implemented in weeks, not years.',
        icon: 'Zap',
      },
    ],
  },
  comparison: {
    title: 'Our Approach vs Traditional Consulting',
    items: [
      { feature: 'Implementation Support', us: 'End-to-end', them: 'Hand-off strategy only' },
      { feature: 'Fee Structure', us: 'Value-based', them: 'Hourly billing' },
      { feature: 'Team Composition', us: 'Specialized experts', them: 'Generalist pool' },
      { feature: 'Technology Integration', us: true, them: false },
      { feature: 'Knowledge Transfer', us: true, them: false },
    ],
  },
  testimonials: {
    headline: 'Client Success Stories',
    body: 'Don’t just take our word for it. Hear from the leaders we’ve partnered with.',
    items: [
      {
        quote:
          "Nexus didn't just give us a strategy; they walked with us through the entire implementation. Our revenue has grown 40% year-over-year since our engagement.",
        author: 'Sarah Jenkins',
        role: 'CEO, TechNova Solutions',
        avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      },
      {
        quote:
          'The depth of their operational knowledge is unmatched. They identified efficiencies that saved us millions in the first quarter alone.',
        author: 'Marcus Chen',
        role: 'COO, Global Logistics Inc.',
        avatarUrl:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
      },
    ],
  },
  faq: {
    headline: 'Frequently Asked Questions',
    body: 'Common questions about our consulting process and engagement models.',
    items: [
      {
        question: 'How do you structure your engagements?',
        answer:
          'We typically begin with a 2-4 week diagnostic phase, followed by a detailed implementation plan. Engagements range from 3 to 18 months depending on the scope of transformation.',
      },
      {
        question: 'Do you work with startups?',
        answer:
          'We primarily partner with mid-market and enterprise organizations (Series C and beyond) where complex organizational and operational challenges exist.',
      },
      {
        question: 'How is your fee structure determined?',
        answer:
          'We utilize a value-based pricing model, often tying a portion of our fees directly to the measurable financial impact we create for your business.',
      },
    ],
  },
  footer: {
    headline: 'Ready to redefine your industry?',
    body: 'Schedule a confidential consultation with one of our senior partners to discuss your strategic objectives.',
    cta: { label: 'Get in Touch', url: '#contact' },
  },
}
