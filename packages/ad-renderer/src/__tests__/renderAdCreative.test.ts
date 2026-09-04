import { describe, expect, it } from 'vitest'
import { renderAdCreativeDocument, renderAdCreativeFragment } from '../renderAdCreative'
import { resolveAdCreativeDesign } from '../presets'

describe('resolveAdCreativeDesign', () => {
  it('fills every field from the format default when nothing is set', () => {
    const design = resolveAdCreativeDesign('POSTER', {})
    expect(design).toEqual({
      format: 'POSTER',
      textPlacement: 'BOTTOM_LEFT',
      fontScale: 'OVERSIZED',
      textAlign: 'LEFT',
      overlay: 'DARK_GRADIENT',
      ctaPlacement: 'BENEATH_COPY',
      mediaFocal: 'CENTER',
    })
  })

  it('keeps explicit overrides and only fills the rest', () => {
    const design = resolveAdCreativeDesign('STORY', { overlay: 'NONE', fontScale: 'COMPACT' })
    expect(design.overlay).toBe('NONE')
    expect(design.fontScale).toBe('COMPACT')
    expect(design.textPlacement).toBe('BOTTOM_CENTER') // still the STORY default
  })
})

describe('renderAdCreativeFragment', () => {
  it('renders the same markup shape regardless of which surface calls it', () => {
    const input = {
      format: 'POSTER' as const,
      headline: 'Fall Sale',
      primaryText: '20% off everything',
      ctaLabel: 'Shop now',
      mediaUrl: 'https://example.com/poster.jpg',
      clickUrl: 'https://example.com/landing',
    }
    const a = renderAdCreativeFragment(input)
    const b = renderAdCreativeFragment(input)
    expect(a).toBe(b)
    expect(a).toContain('adc--poster')
    expect(a).toContain('Fall Sale')
    expect(a).toContain('Shop now')
    expect(a).toContain('href="https://example.com/landing"')
  })

  it('escapes user content', () => {
    const html = renderAdCreativeFragment({
      format: 'FEED_POST',
      headline: '<script>alert(1)</script>',
      clickUrl: 'https://example.com',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('rejects unsafe click URLs, falling back to #', () => {
    const html = renderAdCreativeFragment({
      format: 'STORY',
      clickUrl: 'javascript:alert(1)',
    })
    expect(html).toContain('href="#"')
  })

  it("allows a root-relative clickUrl (ad-server's own same-origin click route)", () => {
    const html = renderAdCreativeFragment({
      format: 'STORY',
      clickUrl: '/v1/embed/ad_123/click?instanceId=abc',
    })
    expect(html).toContain('href="/v1/embed/ad_123/click?instanceId=abc"')
  })

  it('rejects a protocol-relative clickUrl', () => {
    const html = renderAdCreativeFragment({
      format: 'STORY',
      clickUrl: '//evil.example.com',
    })
    expect(html).toContain('href="#"')
  })

  it('places the CTA per ctaPlacement', () => {
    const banner = renderAdCreativeFragment({
      format: 'POSTER',
      ctaLabel: 'Learn more',
      ctaPlacement: 'TOP_BANNER',
      clickUrl: 'https://example.com',
    })
    expect(banner).toContain('adc-cta-banner')

    const floating = renderAdCreativeFragment({
      format: 'STORY',
      ctaLabel: 'Learn more',
      ctaPlacement: 'FLOATING_BOTTOM',
      clickUrl: 'https://example.com',
    })
    expect(floating).toContain('adc-cta-floating')
  })
})

describe('renderAdCreativeDocument', () => {
  it('wraps the fragment in a standalone document with the stylesheet inlined', () => {
    const doc = renderAdCreativeDocument({
      format: 'FEED_POST',
      headline: 'Hello',
      clickUrl: 'https://example.com',
    })
    expect(doc).toContain('<!doctype html>')
    expect(doc).toContain('adc--feed_post')
    expect(doc).toContain('.adc-media-img')
  })
})
