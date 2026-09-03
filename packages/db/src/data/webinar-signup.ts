import type { TemplateSchema } from '../leadGenTemplate'
import { DEFAULT_PAGE_FAVICON_URL, type PageContent } from '../content'

export const SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID = 'system-template-webinar-signup'

// Second "rich" renderer family alongside Corporate Professional — same {sections:
// TemplateSection[]} schema shape, same canonical PageContent, its own visual component
// (apps/web/src/components/landing-pages/templates/WebinarSignup.tsx). The event-details widget
// (countdown, seats-filled, host, signup form) is one integrated visual block, not a separate
// form-embed section — the form is threaded in as props, same as every other template.
export const webinarSignupTitle = 'Scale Your Growth Engine — Free Live Masterclass'
export const webinarSignupDescription =
  'A studio-quality live-webinar signup page: countdown, real seats-filled progress, host bio, and an inline signup form.'

export const webinarSignupSchema: TemplateSchema = {
  renderer: 'webinar-signup',
  sections: [
    {
      key: 'hero',
      type: 'hero',
      order: 0,
      hideable: false,
      editable: ['eyebrow', 'headline', 'body', 'media', 'primaryCta'],
    },
    {
      key: 'widget',
      type: 'webinar-widget',
      order: 1,
      hideable: false,
      editable: [
        'eventDate',
        'durationMinutes',
        'seatsTotal',
        'hostName',
        'hostTitle',
        'hostAvatarUrl',
        'hostBio',
      ],
    },
    {
      key: 'features',
      type: 'feature-grid',
      order: 2,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    {
      key: 'testimonials',
      type: 'testimonials',
      order: 3,
      hideable: true,
      editable: ['headline', 'body', 'items'],
    },
    { key: 'faq', type: 'faq', order: 4, hideable: true, editable: ['headline', 'body', 'items'] },
    {
      key: 'footer',
      type: 'cta-band',
      order: 5,
      hideable: true,
      editable: ['headline', 'body', 'cta'],
    },
  ],
  themeTokens: [],
}

export const webinarSignupStarterContent: PageContent = {
  browser: {
    title: webinarSignupTitle,
    favicon: { url: DEFAULT_PAGE_FAVICON_URL },
  },
  hero: {
    eyebrow: 'Free Live Masterclass',
    headline: 'Scale Your Growth Engine Without Scaling Headcount',
    body: 'Join a live, 60-minute session on the exact playbook fast-growing teams use to compound pipeline — no fluff, just the system, live Q&A, and a recording if you can’t make it.',
    media: {
      url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&q=80&w=1600',
      alt: 'Presenter hosting a live virtual masterclass',
    },
    primaryCta: { label: 'Save My Seat', url: '#signup' },
  },
  webinar: {
    eventDate: '2026-09-15T17:00:00.000Z',
    durationMinutes: 60,
    seatsTotal: 500,
    hostName: 'Dana Whitfield',
    hostTitle: 'Head of Growth Strategy',
    hostAvatarUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400',
    hostBio:
      'Dana has run growth for three venture-backed startups through Series C and has taught this exact framework to over 4,000 marketers.',
  },
  features: {
    headline: 'What you’ll walk away with',
    body: 'This isn’t a highlight reel — it’s the actual system, step by step.',
    items: [
      {
        title: 'The compounding-pipeline framework',
        body: 'The exact three-stage model we use to turn one campaign into a repeatable growth loop.',
      },
      {
        title: 'A live teardown',
        body: 'We’ll break down a real funnel live, mistakes and all, so you can see the thinking in action.',
      },
      {
        title: 'Templates you can reuse',
        body: 'Leave with the worksheets and scoring rubric — usable the same afternoon.',
      },
    ],
  },
  testimonials: {
    headline: 'From past attendees',
    body: '',
    items: [
      {
        quote:
          'I’ve sat through a lot of webinars that were just a pitch in disguise. This one actually taught me something I used the next day.',
        author: 'Priya Nair',
        role: 'Marketing Lead, Fenwick & Co.',
      },
      {
        quote:
          'The live teardown alone was worth an hour of my time. Concrete, specific, no filler.',
        author: 'Marcus Ude',
        role: 'Founder, Ude Studio',
      },
    ],
  },
  faq: {
    headline: 'Before you save your seat',
    body: '',
    items: [
      {
        question: 'Is this actually free?',
        answer:
          'Yes — no credit card, no catch. We keep a short pitch for our own product to about 5 minutes at the end.',
      },
      {
        question: 'Will there be a recording?',
        answer:
          'Yes, every registrant gets the replay and slides by email, whether or not you can attend live.',
      },
      {
        question: 'Is there time for questions?',
        answer: 'Live Q&A runs for the last 15 minutes — bring your specific situation.',
      },
    ],
  },
  footer: {
    headline: 'Seats are limited — save yours now',
    body: 'Registration closes when the room fills or the event starts, whichever comes first.',
    cta: { label: 'Reserve My Seat', url: '#signup' },
  },
}
