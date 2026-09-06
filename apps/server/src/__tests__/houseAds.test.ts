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

  it('serves the correct ad based on placement zone and weight', async () => {
    // Create two ads
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
      weight: 0, // Should theoretically never be chosen if competing against weight 10
      status: 'ACTIVE',
      placements: [{ zone: 'HOUSE_AD' }],
    })

    const servedAd = await service.serveAd('HOUSE_AD')
    expect(servedAd).toBeDefined()
    expect(servedAd?.id).toBe(ad1.id)
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
