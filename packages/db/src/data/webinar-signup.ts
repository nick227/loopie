import type { TemplateSchema } from '../leadGenTemplate'
import { DEFAULT_PAGE_FAVICON_URL, type PageContent } from '../content'

export const SYSTEM_WEBINAR_SIGNUP_TEMPLATE_ID = 'system-template-webinar-signup'

// Second "rich" renderer family alongside Corporate Professional — same {sections:
// TemplateSection[]} schema shape, same canonical PageContent, its own visual component
// (apps/web/src/components/landing-pages/templates/WebinarSignup.tsx). The event-details widget
// (countdown, seats-filled, host, signup form) is one integrated visual block — the attached
// Form's fields are threaded into it as props (hasForm/formFields), not rendered as their own DOM
// section. The 'form' entry below exists purely so the Content tab can show/hide/order it like any
// other section; it has no independent render node of its own — see the 'form' entry's own comment.
export const webinarSignupTitle = 'Event signup'
export const webinarSignupDescription =
  'Live event page with countdown, seat progress, host bio, and a registration form.'

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
    // Editorial metadata, not an independent render node — the WebinarSignup component renders
    // the attached Form's fields inside the widget section above (hasForm/formFields props on
    // EventWidgetSection), never as a standalone block of its own. This entry exists only so the
    // Content tab can order/hide/delete it consistently with every other section.
    { key: 'form', type: 'form-embed', order: 1.5, hideable: true, editable: [] },
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
    title: 'How to get your next ten customers — live session',
    favicon: { url: DEFAULT_PAGE_FAVICON_URL },
  },
  hero: {
    eyebrow: 'Free live session · 60 minutes',
    headline: 'Join us live: how to get your next ten customers',
    body: 'A practical hour on the page, message, and follow-up that bring in real replies — with live Q&A and a recording if you cannot attend.',
    media: {
      url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&q=80&w=1600',
      alt: 'Presenter hosting a live virtual session',
    },
    primaryCta: { label: 'Save my seat', url: '#signup' },
  },
  webinar: {
    eventDate: '2026-09-15T17:00:00.000Z',
    durationMinutes: 60,
    seatsTotal: 500,
    hostName: 'Dana Whitfield',
    hostTitle: 'Operator and workshop host',
    hostAvatarUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400',
    hostBio:
      'Dana has helped owner-led teams set up a simple customer system — one page, one message, one follow-up — and has run this session for thousands of attendees.',
  },
  features: {
    headline: 'What you’ll walk away with',
    body: 'Concrete steps, not a highlight reel.',
    items: [
      {
        title: 'A simple three-step system',
        body: 'Page, outreach, and follow-up — the minimum that actually produces replies.',
      },
      {
        title: 'A live teardown',
        body: 'We break down a real example, mistakes included, so you can see the thinking.',
      },
      {
        title: 'Templates you can reuse',
        body: 'Worksheets and a short checklist you can use the same afternoon.',
      },
    ],
  },
  testimonials: {
    headline: 'From past attendees',
    body: '',
    items: [
      {
        quote:
          'I’ve sat through a lot of webinars that were just a pitch. This one taught me something I used the next day.',
        author: 'Priya Nair',
        role: 'Marketing lead, Fenwick & Co.',
      },
      {
        quote: 'The live teardown alone was worth the hour. Concrete, specific, no filler.',
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
          'Yes — no credit card. We keep a short pitch for our own product to about five minutes at the end.',
      },
      {
        question: 'Will there be a recording?',
        answer:
          'Yes. Every registrant gets the replay and slides by email, whether or not you attend live.',
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
    cta: { label: 'Save my seat', url: '#signup' },
  },
}
