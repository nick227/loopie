import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function createAsset() {
  return db.asset.create({
    data: {
      businessId: testBusinessId,
      type: 'IMAGE',
      name: 'Hero',
      url: 'https://example.com/hero.jpg',
    },
  })
}

describe('creative metrics rollup', () => {
  it('sums placement metrics across campaigns and keeps them after a new version', async () => {
    const asset = await createAsset()
    const createRes = await app.inject({
      method: 'POST',
      url: '/creatives',
      headers: asAuth(testUserId),
      payload: { name: 'Library Ad', assetIds: [asset.id] },
    })
    expect(createRes.statusCode).toBe(201)
    const creative = createRes.json().data as { id: string }

    const campaignA = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Campaign A',
        budget: 100,
        startDate: new Date(),
        platforms: ['META'],
        creativeLinks: { create: { creativeId: creative.id } },
      },
    })
    const campaignB = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Campaign B',
        budget: 200,
        startDate: new Date(),
        platforms: ['LOOPIE'],
        creativeLinks: { create: { creativeId: creative.id } },
      },
    })

    await db.deployment.create({
      data: {
        campaignId: campaignA.id,
        creativeId: creative.id,
        platform: 'META',
        status: 'ACTIVE',
        impressions: 1000,
        clicks: 40,
        conversions: 3,
        spend: 25.5,
      },
    })
    await db.adUnit.create({
      data: {
        businessId: testBusinessId,
        campaignId: campaignB.id,
        creativeId: creative.id,
        format: 'DISPLAY_BANNER',
        status: 'ACTIVE',
        impressions: 200,
        clicks: 10,
        conversions: 1,
      },
    })

    const getRes = await app.inject({
      method: 'GET',
      url: `/creatives/${creative.id}`,
      headers: asAuth(testUserId),
    })
    expect(getRes.statusCode).toBe(200)
    const detail = getRes.json().data as {
      impressions: number
      clicks: number
      conversions: number
      spend: number
      campaignCount: number
      campaigns: { id: string; name: string }[]
    }
    expect(detail.impressions).toBe(1200)
    expect(detail.clicks).toBe(50)
    expect(detail.conversions).toBe(4)
    expect(detail.spend).toBe(25.5)
    expect(detail.campaignCount).toBe(2)
    expect(detail.campaigns.map((row) => row.name).sort()).toEqual(['Campaign A', 'Campaign B'])

    const listRes = await app.inject({
      method: 'GET',
      url: '/creatives',
      headers: asAuth(testUserId),
    })
    expect(listRes.statusCode).toBe(200)
    const listed = (
      listRes.json().data as { id: string; impressions: number; campaigns?: unknown }[]
    )[0]
    expect(listed).toMatchObject({ id: creative.id, impressions: 1200 })
    expect(listed?.campaigns).toBeUndefined()

    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/creatives/${creative.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'Library Ad v2', assetIds: [asset.id] },
    })
    expect(updateRes.statusCode).toBe(200)
    const next = updateRes.json().data as {
      id: string
      impressions: number
      campaignCount: number
      campaigns: { name: string }[]
    }
    expect(next.id).not.toBe(creative.id)
    expect(next.impressions).toBe(1200)
    expect(next.campaignCount).toBe(2)
    expect(next.campaigns.map((row) => row.name).sort()).toEqual(['Campaign A', 'Campaign B'])

    const listAfter = await app.inject({
      method: 'GET',
      url: '/creatives',
      headers: asAuth(testUserId),
    })
    const heads = listAfter.json().data as { id: string }[]
    expect(heads).toHaveLength(1)
    expect(heads[0]?.id).toBe(next.id)
  })
})
