import type { TemplateSchema } from '../leadGenTemplate'
import { DEFAULT_PAGE_FAVICON_URL, type PageContent } from '../content'

export const SYSTEM_EMAIL_OUTREACH_TEMPLATE_ID = 'system-template-email-outreach'

// Email Outreach is a rich renderer shaped like a polished HTML email: constrained ~560px column,
// letter-style hierarchy, single CTA path. Same canonical PageContent as every other template —
// only the visual component differs (apps/web/.../templates/EmailOutreach.tsx). No nav bar; the
// brand lives in a thin email header, matching content.ts's note that Sales/Email skip site nav.
export const emailOutreachTitle = 'Outreach page'
export const emailOutreachDescription =
  'Narrow, letter-style page for first-contact links — one offer, proof, and a reply form.'

export const emailOutreachSchema: TemplateSchema = {
  renderer: 'email-outreach',
  sections: [
    { key: 'nav', type: 'nav', order: -1, hideable: false, editable: ['brand'] },
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['eyebrow', 'headline', 'body', 'media', 'primaryCta'],
    },
    {
      key: 'features',
      type: 'feature-grid',
      order: 1,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    { key: 'metrics', type: 'metrics', order: 2, hideable: true, editable: ['items'] },
    {
      key: 'testimonials',
      type: 'testimonials',
      order: 3,
      hideable: true,
      editable: ['headline', 'items'],
    },
    { key: 'faq', type: 'faq', order: 4, hideable: true, editable: ['headline', 'items'] },
    // Editorial metadata, not an independent render node — 'studio-contact' (below) renders the
    // attached Form's fields nested inside its own contact block, never as a standalone section.
    // Exists only so the Content tab can order/hide/delete it like every other section.
    { key: 'form', type: 'form-embed', order: 4.5, hideable: true, editable: [] },
    {
      key: 'footer',
      type: 'studio-contact',
      order: 5,
      hideable: false,
      editable: ['headline', 'body', 'cta'],
    },
  ],
  themeTokens: [],
}

export const emailOutreachStarterContent: PageContent = {
  browser: {
    title: 'A short note from Northline',
    favicon: { url: DEFAULT_PAGE_FAVICON_URL },
  },
  nav: {
    brand: 'Northline',
  },
  hero: {
    eyebrow: 'A first note — not a pitch deck',
    headline:
      'Most small businesses don’t need more marketing. They need a clearer path to the next ten customers.',
    body: 'Your work is already good. What’s usually missing is a simple system that gets the right people to see it, reply, and buy — one page, one message, one follow-up. No retainers dressed up as strategy.',
    media: {
      url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=1600',
      alt: 'Two people reviewing a plan at a quiet workspace',
    },
    primaryCta: { label: 'Book a 20-minute intro', url: '#contact' },
  },
  features: {
    headline: 'What this looks like in practice',
    body: 'The same spine works whether you sell a service, a product, or a membership — swap the offer, keep the discipline.',
    items: [
      {
        title: 'A page that sells when you’re busy',
        body: 'One hosted page with a clear offer, proof, and a form. Visitors leave a name; you get a lead you can actually follow up.',
      },
      {
        title: 'A first message people finish reading',
        body: 'Short outreach copy that names the problem, the outcome, and the next step — written once, reused for email and text.',
      },
      {
        title: 'Follow-up that doesn’t rely on memory',
        body: 'Two automatic steps after a new lead: a same-day reply and a polite check-in. Nothing more complex until the basics work.',
      },
    ],
  },
  metrics: {
    items: [
      {
        value: '20 min',
        label: 'Intro call',
        description: 'Enough to see if the fit is real. No discovery theater.',
      },
      {
        value: '1 page',
        label: 'One offer focus',
        description: 'We start with a single offer worth selling well — not a catalog.',
      },
      {
        value: '2 steps',
        label: 'Follow-up max',
        description: 'Automatic, source-agnostic, and short enough you’ll actually keep it.',
      },
    ],
  },
  testimonials: {
    headline: 'Owners who wanted less noise, more reply',
    items: [
      {
        quote:
          'We stopped posting five times a week and started sending one clear note with a real page behind it. Same week we booked three jobs we would have missed.',
        author: 'Elena Ruiz',
        role: 'Owner, Bright Line Interiors',
      },
      {
        quote:
          'The copy didn’t sound like an agency. It sounded like us on a good day — specific, calm, and easy to answer.',
        author: 'Marcus Adeyemi',
        role: 'Founder, Adeyemi Supply Co.',
      },
    ],
  },
  faq: {
    headline: 'Straight answers before you reply',
    items: [
      {
        question: 'Is this only for a certain industry?',
        answer:
          'No. The structure is the same for clinics, contractors, shops, studios, and B2B services. The offer and proof change; the discipline doesn’t.',
      },
      {
        question: 'Do we have to move our whole website?',
        answer:
          'No. This page sits beside what you already have. Many clients keep their site as-is and use this as the link in outreach and ads.',
      },
      {
        question: 'What happens on the intro call?',
        answer:
          'We look at how you get customers today, pick one offer worth focusing on, and decide whether a page-plus-message system is the right next step. If it isn’t, we’ll say so.',
      },
    ],
  },
  footer: {
    headline: 'If this sounds useful, take twenty minutes.',
    body: 'Leave your name and the best way to reach you. We’ll reply the same business day with two times that work — or a short note if we’re not the right fit.',
    cta: { label: 'Request an intro', url: '#contact' },
  },
}
