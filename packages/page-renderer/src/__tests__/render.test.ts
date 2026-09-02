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
          faviconUrl: 'https://cdn.example.com/icon.png?size=32&theme=dark',
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
})
