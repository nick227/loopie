import { describe, it, expect, beforeEach } from 'vitest'
import { HouseAdService } from '../services/HouseAdService'
import { db } from '@project/db'

describe('HouseAdService', () => {
  const service = new HouseAdService()

  beforeEach(async () => {
    await db.houseAdMetric.deleteMany()
    await db.houseAdPlacement.deleteMany()
    await db.houseAd.deleteMany()
  })

  it('never serves a zero-weight ad against a positive-weight competitor', async () => {
    // A real weight of 0 must carry zero selection probability, not "flaky, but usually not
    // picked" — serveAd's weighted draw uses `ad.weight ?? 1` (not `|| 1`), so an explicit 0 is
    // never coerced to a default of 1. That makes this genuinely deterministic, not a random
    // draw this test happens to assert on once: with total weight 10 (10 + 0), the draw can only
    // ever land in ad1's own span. Repeating the draw is cheap insurance against a future
    // regression back to `|| 1` reintroducing real (if small) odds for the zero-weight ad.
    const ad1 = await service.create({
      name: 'Ad 1',
      type: 'WORDPRESS_EMBED',
      scriptUrl: 'http://test.com',
      weight: 10,
      status: 'ACTIVE',
      placements: [{ zone: 'HOUSE_AD' }],
    })

    await service.create({
      name: 'Ad 2',
      type: 'INTERNAL',
      imageUrl: 'http://test.com/img',
      targetUrl: 'http://test.com',
      weight: 0,
      status: 'ACTIVE',
      placements: [{ zone: 'HOUSE_AD' }],
    })

    for (let i = 0; i < 20; i++) {
      const servedAd = await service.serveAd('HOUSE_AD')
      expect(servedAd?.id).toBe(ad1.id)
    }
  })

  it('serves ads proportionally to weight, not uniformly', async () => {
    // Not a single random draw (the actual source of the old flake) — statistically validates
    // the weighting algorithm itself over many draws instead. Ad1:Ad2 is 4:1 (expected 80%/20%
    // of draws). With n=200, the binomial standard deviation on ad1's count is
    // sqrt(200*0.8*0.2) ≈ 5.7, so the [60%, 95%] band below sits ~7 standard deviations from the
    // true mean on either side — wide enough that this should never legitimately flake, while
    // still clearly failing if the algorithm regressed to uniform (50%) or inverted selection.
    const ad1 = await service.create({
      name: 'Heavy Ad',
      type: 'INTERNAL',
      weight: 4,
      status: 'ACTIVE',
      placements: [{ zone: 'HOUSE_AD' }],
    })
    const ad2 = await service.create({
      name: 'Light Ad',
      type: 'INTERNAL',
      weight: 1,
      status: 'ACTIVE',
      placements: [{ zone: 'HOUSE_AD' }],
    })

    const draws = 200
    let ad1Count = 0
    for (let i = 0; i < draws; i++) {
      const served = await service.serveAd('HOUSE_AD')
      expect([ad1.id, ad2.id]).toContain(served?.id)
      if (served?.id === ad1.id) ad1Count++
    }

    const ad1Share = ad1Count / draws
    expect(ad1Share).toBeGreaterThan(0.6)
    expect(ad1Share).toBeLessThan(0.95)
  })

  it('does not serve paused or out-of-date ads', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await service.create({
      name: 'Paused Ad',
      type: 'INTERNAL',
      weight: 10,
      status: 'PAUSED',
      placements: [{ zone: 'HOUSE_AD' }],
    })

    await service.create({
      name: 'Expired Ad',
      type: 'INTERNAL',
      endDate: yesterday.toISOString(),
      weight: 10,
      status: 'ACTIVE',
      placements: [{ zone: 'HOUSE_AD' }],
    })

    const servedAd = await service.serveAd('HOUSE_AD')
    expect(servedAd).toBeNull()
  })

  it('tracks impressions and clicks', async () => {
    const ad = await service.create({
      name: 'Track Ad',
      type: 'WORDPRESS_EMBED',
      weight: 1,
      status: 'ACTIVE',
      placements: [{ zone: 'HOUSE_AD' }],
    })

    await service.trackMetric(ad.id, 'HOUSE_AD', 'view')
    await service.trackMetric(ad.id, 'HOUSE_AD', 'view')
    await service.trackMetric(ad.id, 'HOUSE_AD', 'click')

    const metrics = await db.houseAdMetric.findMany({ where: { houseAdId: ad.id } })
    expect(metrics.length).toBe(1)
    expect(metrics[0]!.impressions).toBe(2)
    expect(metrics[0]!.clicks).toBe(1)
  })
})
