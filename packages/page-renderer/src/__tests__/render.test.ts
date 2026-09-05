import { describe, it, expect } from 'vitest'
import { renderLandingPageHtml } from '../renderLandingPage'

describe('renderLandingPageHtml', () => {
  it('renders deterministically for the same snapshot payload', () => {
    const payload = {
      pageName: 'Test Page',
      templateSchema: { sections: [{ type: 'hero', order: 0, contentKey: 'hero-1' }] },
      content: { 'hero-1': { headline: 'Hello World' } },
      theme: { colorText: '#000' },
      layoutConfig: {},
      form: null as any,
      submitActionUrl: '/submit',
      adSlots: [],
      injectedHeadScripts: '<script>console.log("ready")</script>',
    }

    const html1 = renderLandingPageHtml(payload)
    const html2 = renderLandingPageHtml(payload)

    // Using string matching to ensure they are EXACTLY the same
    expect(html1).toStrictEqual(html2)
    expect(html1).toContain('<script>console.log("ready")</script>')
    expect(html1).toContain('Now booking')
  })

  it('publishes the rich renderer identity and the visual content used by its editor', () => {
    const html = renderLandingPageHtml({
      pageName: 'Nexus',
      templateSchema: {
        renderer: 'corporate-professional',
        sections: [
          { key: 'nav', type: 'nav', order: -1 },
          { key: 'hero', type: 'hero', order: 0 },
          { key: 'features', type: 'feature-grid', order: 1 },
        ],
      },
      content: {
        nav: { brand: 'Nexus', links: [{ label: 'Work', url: '#work' }] },
        hero: {
          eyebrow: 'Enterprise strategy',
          headline: 'Build what lasts',
          body: 'A clearer operating model.',
          media: { url: 'https://example.com/hero.jpg', alt: 'Team at work' },
        },
        features: {
          headline: 'The advantage',
          body: 'Three practical principles.',
          items: [{ title: 'Clarity', body: 'Decide what matters.' }],
        },
      },
      theme: { radius: '1rem' },
      layoutConfig: {},
      form: null,
      submitActionUrl: '/submit',
    })

    expect(html).toContain('class="lp-template-corporate-professional"')
    expect(html).toContain('--lp-radius: 1rem')
    expect(html).toContain('class="lp-nav"')
    expect(html).toContain('Enterprise strategy')
    expect(html).toContain('https://example.com/hero.jpg')
    expect(html).toContain('The advantage')
  })

  it('renders layout-independent page title and favicon settings', () => {
    const html = renderLandingPageHtml({
      pageName: 'Internal campaign name',
      templateSchema: { sections: [] },
      content: {
        browser: {
          title: 'Customer-facing title & offer',
          favicon: { src: 'https://cdn.example.com/icon.png?size=32&theme=dark' },
        },
      },
      theme: {},
      form: null,
      submitActionUrl: '/submit',
    })

    expect(html).toContain('<title>Customer-facing title &amp; offer</title>')
    expect(html).toContain(
      '<link rel="icon" href="https://cdn.example.com/icon.png?size=32&amp;theme=dark" />',
    )
    expect(html).not.toContain('<title>Internal campaign name</title>')
  })

  it('uses browser metadata defaults for existing pages', () => {
    const html = renderLandingPageHtml({
      pageName: 'Existing page',
      templateSchema: { sections: [] },
      content: {},
      theme: {},
      form: null,
      submitActionUrl: '/submit',
    })

    expect(html).toContain('<title>Existing page</title>')
    expect(html).toContain('<link rel="icon" href="/favicon.png" />')
  })

  it('bakes success feedback and posts form-start on first focus', () => {
    const html = renderLandingPageHtml({
      pageName: 'Capture',
      templateSchema: {
        sections: [{ key: 'form', type: 'form-embed', order: 0 }],
      },
      content: {},
      theme: {},
      form: {
        id: 'form-1',
        submitLabel: 'Book now',
        successMessage: 'Got it — talk soon.',
        fields: [
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, options: null },
        ],
      },
      submitActionUrl: 'https://app.example/landing-pages/page-1/submissions',
    })

    expect(html).toContain('class="lp-form-el"')
    expect(html).toContain('Book now')
    expect(html).toContain('Got it — talk soon.')
    expect(html).toContain("replace(/\\/submissions\\/?$/, '/form-start')")
    expect(html).toContain("addEventListener('focusin'")
  })

  it('emits section anchors and keeps a mobile nav ask', () => {
    const html = renderLandingPageHtml({
      pageName: 'Anchors',
      templateSchema: {
        renderer: 'corporate-professional',
        sections: [
          { key: 'nav', type: 'nav', order: -1 },
          { key: 'services', type: 'service-selector', order: 0 },
          { key: 'features', type: 'feature-grid', order: 1 },
          { key: 'testimonials', type: 'testimonials', order: 2 },
          { key: 'products', type: 'product-grid', order: 3 },
          { key: 'footer', type: 'studio-contact', order: 4 },
        ],
      },
      content: {
        nav: {
          brand: 'Nexus',
          links: [
            { label: 'Services', url: '#services' },
            { label: 'Our Approach', url: '#features' },
            { label: 'Get in Touch', url: '#contact' },
          ],
        },
        services: {
          title: 'Practices',
          items: [
            {
              label: 'Strategy',
              description: 'Plan the work.',
              cta: { label: 'Talk about strategy', url: '#contact' },
            },
          ],
        },
        features: {
          headline: 'Approach',
          items: [{ title: 'Clarity', body: 'Decide what matters.' }],
        },
        testimonials: {
          headline: 'Clients',
          items: [{ quote: 'Excellent.', author: 'Ada' }],
        },
        products: {
          headline: 'Featured',
          items: [{ name: 'Starter', cta: { label: 'Shop now', url: '#contact' } }],
        },
        footer: { headline: 'Ready?' },
      },
      theme: {},
      form: {
        id: 'form-1',
        submitLabel: 'Send',
        fields: [
          { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, options: null },
        ],
      },
      submitActionUrl: '/submit',
    })

    expect(html).toContain('id="services"')
    expect(html).toContain('id="features"')
    expect(html).toContain('id="testimonials"')
    expect(html).toContain('id="products"')
    expect(html).toContain('id="contact"')
    expect(html).toContain('class="lp-nav-cta"')
    expect(html).toContain('href="#contact">Get in Touch</a>')
    expect(html).toContain('Talk about strategy')
    expect(html).not.toContain("url: '#'")
    expect(html).not.toContain('href="#" class="lp-cta"')
  })
})

// Every template schema now declares exactly one 'form-embed' section so the Content tab can
// order/hide/delete it consistently — see packages/db's SECTION_TYPE_TO_SLOT_GROUP comment and
// each schema file's own 'form' entry comment. For the plain lead-gen templates it's still a real,
// independently-rendered block. For every rich template (this suite covers the studio-contact
// family; webinar-widget and split-capture share the exact same mechanism) it's editorial metadata
// only — the Form's fields actually render nested inside the section that owns them. These tests
// guard the two failure modes that gap creates if renderSection ever stops accounting for it: the
// form appearing twice, and hiding it in the Content tab not actually removing it from the page.
describe('form-embed as editorial metadata (rich templates)', () => {
  const form = {
    id: 'form-1',
    submitLabel: 'Send',
    fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, options: null }],
  }
  const sections = [
    { key: 'hero', type: 'hero', order: 0 },
    { key: 'faq', type: 'faq', order: 1 },
    { key: 'form', type: 'form-embed', order: 1.5, hideable: true },
    { key: 'footer', type: 'studio-contact', order: 2 },
  ]

  function render(layoutConfig: Record<string, unknown> = {}) {
    return renderLandingPageHtml({
      pageName: 'Metadata form',
      templateSchema: { renderer: 'corporate-professional', sections },
      content: { hero: { headline: 'Hi' }, footer: { headline: 'Talk to us' } },
      theme: {},
      layoutConfig: layoutConfig as never,
      form,
      submitActionUrl: '/submit',
    })
  }

  it('renders the form fields exactly once, nested in the real owner section', () => {
    const html = render()
    expect(html.match(/name="email"/g)).toHaveLength(1)
    expect(html).toContain('lp-studio-contact')
    // The metadata-only 'form-embed' section contributes no markup/id of its own.
    expect(html).not.toContain('class="lp-section lp-form"')
    expect(html).not.toContain('id="form"')
  })

  it('hiding the form-embed entry removes the form from the page, not just its own empty node', () => {
    const html = render({ sections: { form: { hidden: true } } })
    expect(html).not.toContain('name="email"')
    // The rest of the section it's nested in still renders.
    expect(html).toContain('Talk to us')
  })

  it('treats form-embed as metadata for split-capture too (the media lead-gen template)', () => {
    const html = renderLandingPageHtml({
      pageName: 'Split capture',
      templateSchema: {
        sections: [
          { key: 'split', type: 'split-capture', order: 0 },
          { key: 'form', type: 'form-embed', order: 0.5, hideable: true },
        ],
      },
      content: { hero: { headline: 'Hi' } },
      theme: {},
      layoutConfig: { sections: { form: { hidden: true } } } as never,
      form,
      submitActionUrl: '/submit',
    })
    expect(html).not.toContain('name="email"')

    const shown = renderLandingPageHtml({
      pageName: 'Split capture',
      templateSchema: {
        sections: [
          { key: 'split', type: 'split-capture', order: 0 },
          { key: 'form', type: 'form-embed', order: 0.5, hideable: true },
        ],
      },
      content: { hero: { headline: 'Hi' } },
      theme: {},
      layoutConfig: {},
      form,
      submitActionUrl: '/submit',
    })
    expect(shown.match(/name="email"/g)).toHaveLength(1)
    expect(shown).toContain('class="lp-split"')
    expect(shown).not.toContain('class="lp-section lp-form"')
  })

  it('leaves the real standalone form-embed section (plain lead-gen templates) untouched', () => {
    const html = renderLandingPageHtml({
      pageName: 'Real form-embed',
      templateSchema: {
        sections: [
          { key: 'hero', type: 'hero', order: 0 },
          { key: 'form', type: 'form-embed', order: 1, hideable: true },
        ],
      },
      content: { hero: { headline: 'Hi' } },
      theme: {},
      layoutConfig: {},
      form,
      submitActionUrl: '/submit',
    })
    expect(html.match(/name="email"/g)).toHaveLength(1)
    expect(html).toContain('class="lp-section lp-form"')
    expect(html).toContain('id="form"')
  })
})
