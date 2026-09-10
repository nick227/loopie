import { describe, expect, it } from 'vitest'
import {
  createStarterAds,
  AD_TYPE_REGISTRY,
  AD_CATALOG_FORMATS,
  type AdPurpose,
  type AdCatalogFormatKey,
} from '../index'

// The 4 real ad formats this product supports, and which one each of the 8 starter types uses —
// a mix, not all-the-same, and every format appears at least once among the 7 image+text
// templates. See CLAUDE.md's 2026-09-10 "advertising templates" correction.
const EXPECTED_FORMATS: Record<AdPurpose, AdCatalogFormatKey> = {
  introduction: 'meta-feed',
  contact: 'meta-feed',
  spotlight: 'instagram-story',
  offer: 'google-display',
  event: 'river',
  testimonial: 'river',
  awareness: 'instagram-story',
  blank: 'meta-feed',
}

describe('starter Ad catalog', () => {
  it('prepares eight honest drafts from just a business name', () => {
    const ads = createStarterAds({ name: 'Acme' })
    expect(ads).toHaveLength(8)
    expect(ads.find((ad) => ad.typeKey === 'introduction')?.missingFields).toEqual([])
    expect(ads.find((ad) => ad.typeKey === 'offer')?.missingFields).toEqual([
      'offer.headline',
      'offer.terms',
      'destinationUrl',
    ])
    expect(ads.find((ad) => ad.typeKey === 'event')?.missingFields).toContain('event.timezone')
    expect(ads.every((ad) => !ad.destinationUrl)).toBe(true)
    expect(JSON.stringify(ads)).not.toMatch(/discount|free|\$\d|2026/)
  })

  it('uses one of the 4 real ad formats per type, mixed across all 8 starters', () => {
    const ads = createStarterAds({ name: 'Acme' })
    for (const ad of ads) expect(ad.formatKey).toBe(EXPECTED_FORMATS[ad.typeKey])
    // Every one of the 4 formats is actually used, not just meta-feed everywhere.
    expect(new Set(ads.map((ad) => ad.formatKey))).toEqual(new Set(Object.keys(AD_CATALOG_FORMATS)))
  })

  it('prefills 7 of the 8 starters with a real image; Blank stays image-free', () => {
    const ads = createStarterAds({ name: 'Acme' })
    const withImages = ads.filter((ad) => ad.typeKey !== 'blank')
    expect(withImages).toHaveLength(7)
    for (const ad of withImages) {
      expect(ad.content.mediaUrl).toMatch(/^data:image\/png;base64,/)
    }
    const blank = ads.find((ad) => ad.typeKey === 'blank')!
    expect(blank.content.mediaUrl).toBeUndefined()
  })

  it('never fabricates a testimonial, and blank renders with only the business name', () => {
    const ads = createStarterAds({ name: 'Acme' })
    const testimonial = ads.find((ad) => ad.typeKey === 'testimonial')!
    expect(testimonial.missingFields).toEqual(['testimonial.quote', 'testimonial.author'])
    expect(testimonial.content.headline).not.toContain('Acme') // no invented quote

    const withQuote = createStarterAds(
      { name: 'Acme' },
      {
        testimonial: {
          quote: 'They fixed it in a day.',
          author: 'Jamie R.',
          role: 'Regular customer',
        },
      },
    ).find((ad) => ad.typeKey === 'testimonial')!
    expect(withQuote.missingFields).toEqual([])
    expect(withQuote.content.headline).toContain('They fixed it in a day.')
    expect(withQuote.content.body).toBe('Jamie R., Regular customer')

    const blank = ads.find((ad) => ad.typeKey === 'blank')!
    expect(blank.missingFields).toEqual([])
    expect(blank.content.headline).toBe('Acme')
  })

  it('gives Brand awareness a real visual difference from Business introduction, not a relabel', () => {
    const ads = createStarterAds({ name: 'Acme', tagline: 'Good work, every time.' })
    const introduction = ads.find((ad) => ad.typeKey === 'introduction')!
    const awareness = ads.find((ad) => ad.typeKey === 'awareness')!
    expect(introduction.formatKey).not.toBe(awareness.formatKey)
  })

  it('binds different content into the same format without changing purpose', () => {
    const ads = createStarterAds({ name: 'Acme', destinationUrl: 'https://example.com' })
    const introduction = ads.find((ad) => ad.typeKey === 'introduction')!
    const contact = ads.find((ad) => ad.typeKey === 'contact')!
    expect(introduction.formatKey).toBe(contact.formatKey) // both meta-feed
    expect(introduction.content.headline).not.toBe(contact.content.headline)
    expect(contact.content.headline).toBe('Let’s talk.')
    expect(contact.missingFields).toEqual([])
  })

  it('retains event facts and allows awareness without a destination or CTA', () => {
    const event = createStarterAds(
      { name: 'Acme' },
      {
        event: {
          name: 'Open house',
          date: 'October 10',
          time: '9 am',
          timezone: 'America/Chicago',
          venue: 'Our shop',
        },
      },
    ).find((ad) => ad.typeKey === 'event')!
    expect(event.objective).toBe('AWARENESS')
    expect(event.missingFields).toEqual([])
    expect(event.content.ctaLabel).toBeUndefined()
    expect(event.content.body).toBe('October 10 · 9 am · America/Chicago')
  })

  it('has an implemented AD_CATALOG_FORMATS entry for every registry entry', () => {
    for (const type of Object.values(AD_TYPE_REGISTRY)) {
      expect(AD_CATALOG_FORMATS[type.format]).toBeDefined()
    }
  })

  it("escapes nothing itself (that is the consuming UI/renderer's job) but never invents commercial facts", () => {
    const ad = createStarterAds({ name: '<img onerror="evil()">' })[1]!
    expect(ad.content.businessName).toBe('<img onerror="evil()">')
    expect(() => createStarterAds({ name: '  ' })).toThrow('business name')
  })
})
