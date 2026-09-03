import { describe, it, expect } from 'vitest'
import { renderLandingPageHtml } from '../renderLandingPage'

function render(renderer: string, sections: unknown[], content: Record<string, unknown>) {
  return renderLandingPageHtml({
    pageName: 'Parity',
    templateSchema: { renderer: renderer as 'standard', sections: sections as never },
    content,
    theme: {},
    form: {
      id: 'form-1',
      submitLabel: 'Send',
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, options: null }],
    },
    submitActionUrl: '/submit',
  })
}

describe('editor ↔ published parity', () => {
  it('publishes Corporate service tabs, not a static grid of all services', () => {
    const html = render(
      'corporate-professional',
      [
        { key: 'services', type: 'service-selector', order: 0 },
        { key: 'metrics', type: 'metrics', order: 1 },
        { key: 'footer', type: 'studio-contact', order: 2 },
      ],
      {
        services: {
          title: 'Practices',
          items: [
            {
              label: 'Strategy',
              headline: 'Navigate',
              description: 'Plan the work.',
              cta: { label: 'Talk', url: '#contact' },
              media: { url: 'https://example.com/a.jpg' },
            },
            {
              label: 'Digital',
              headline: 'Modernize',
              description: 'Ship systems.',
              cta: { label: 'Talk', url: '#contact' },
            },
          ],
        },
        metrics: { items: [{ value: '10x', label: 'Lift' }] },
        footer: { headline: 'Ready?', cta: { label: 'Get in Touch', url: '#contact' } },
      },
    )

    expect(html).toContain('data-lp-service-tabs')
    expect(html).toContain('role="tab"')
    expect(html).toContain('data-lp-tab="1"')
    expect(html).toContain('data-lp-panel="0"')
    expect(html).toContain('hidden')
    expect(html).toContain('data-lp-tab')
    expect(html).toContain('--lp-ink')
    expect(html).toMatch(
      /\.lp-template-corporate-professional \.lp-metrics[^}]*background: var\(--lp-ink\)/,
    )
    expect(html).toContain('Get in Touch')
    expect(html).toContain('data-lp-service-tabs')
    expect(html).toContain('lp-service-tab')
    expect(html).not.toContain('class="lp-service-grid"')
  })

  it('publishes Studio carousel testimonials, stacked work, and logo marquee', () => {
    const html = render(
      'studio',
      [
        { key: 'logos', type: 'logo-cloud', order: 0 },
        { key: 'services', type: 'service-selector', order: 1 },
        { key: 'testimonials', type: 'testimonials', order: 2 },
      ],
      {
        logos: { title: 'Trusted by', items: [{ name: 'Acme' }, { name: 'Globex' }] },
        services: {
          title: 'Selected work',
          items: [
            { label: 'Strategy', headline: 'North star', description: 'Clarity first.' },
            { label: 'Identity', headline: 'Mark', description: 'A real mark.' },
          ],
        },
        testimonials: {
          headline: 'Clients',
          items: [
            { quote: 'Excellent.', author: 'Ada', role: 'Founder' },
            { quote: 'Superb.', author: 'Bea', role: 'CEO' },
          ],
        },
      },
    )

    expect(html).toContain('data-lp-carousel')
    expect(html).toContain('data-lp-slide="1"')
    expect(html).toContain('data-lp-carousel-next')
    expect(html).toContain('lp-logo-marquee')
    expect(html).toContain('lp-logo-marquee-track')
    expect(html).toContain('lp-service-index')
    expect(html).toContain('01')
    expect(html).toContain('02')
    expect(html).toMatch(/\.lp-template-studio \.lp-testimonials[^}]*background: var\(--lp-ink\)/)
    expect(html).toContain('prefers-reduced-motion')
  })

  it('publishes Portfolio testimonial carousel', () => {
    const html = render('portfolio', [{ key: 'testimonials', type: 'testimonials', order: 0 }], {
      testimonials: {
        headline: 'Kind words',
        items: [
          { quote: 'Quiet work.', author: 'Cam' },
          { quote: 'Honest photos.', author: 'Dee' },
        ],
      },
    })

    expect(html).toContain('data-lp-carousel')
    expect(html).toContain('data-lp-carousel-prev')
    expect(html).not.toContain('class="lp-testimonial-grid"')
  })

  it('publishes Store logo marquee and Webinar reassurance copy', () => {
    const store = render('store', [{ key: 'logos', type: 'logo-cloud', order: 0 }], {
      logos: { title: 'As seen in', items: [{ name: 'Sprudge' }] },
    })
    expect(store).toContain('lp-logo-marquee')

    const webinar = render(
      'webinar-signup',
      [{ key: 'webinar', type: 'webinar-widget', order: 0 }],
      { webinar: { eventDate: '2030-01-01T18:00:00.000Z', hostName: 'Host' } },
    )
    expect(webinar).toContain('Free to attend')
    expect(webinar).toContain('lp-form-reassure')
  })

  it('publishes Email Outreach chip and footer strip', () => {
    const html = render(
      'email-outreach',
      [
        { key: 'nav', type: 'nav', order: -1 },
        { key: 'footer', type: 'studio-contact', order: 0 },
      ],
      {
        nav: { brand: 'Loopie' },
        footer: { headline: 'Book a call' },
      },
    )

    expect(html).toContain('First note')
    expect(html).toContain('lp-email-chip')
    expect(html).toContain('Sent with care')
    expect(html).toContain('lp-email-foot')
  })

  it('ships service-tab and carousel scripts for published interactivity', () => {
    const html = render('corporate-professional', [], {})
    expect(html).toContain("querySelectorAll('[data-lp-service-tabs]')")
    expect(html).toContain("querySelectorAll('[data-lp-carousel]')")
  })
})
