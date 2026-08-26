import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function createAsset(body: Record<string, unknown>) {
  const res = await app.inject({
    method: 'POST',
    url: '/assets',
    headers: asAuth(testUserId),
    payload: body,
  })
  expect(res.statusCode).toBe(201)
  return res.json().data
}

describe('media library', () => {
  it('records platform specs and placement fit', async () => {
    const asset = await createAsset({
      type: 'IMAGE',
      name: 'Feed portrait',
      url: 'https://example.com/feed.jpg',
      widthPx: 1080,
      heightPx: 1350,
      mimeType: 'image/jpeg',
      sizeBytes: 240_000,
    })

    expect(asset.aspectRatio).toBe('4:5')
    expect(asset.placements).toEqual(['PORTRAIT'])
    expect(asset.widthPx).toBe(1080)
    expect(asset.heightPx).toBe(1350)
    expect(asset.usedInAds).toBe(0)
    expect(asset.usedInTemplates).toBe(0)
  })

  it('counts usage on ads and searches by name', async () => {
    const asset = await createAsset({
      type: 'IMAGE',
      name: 'Bay doors story',
      widthPx: 1080,
      heightPx: 1920,
    })
    const decoy = await createAsset({
      type: 'IMAGE',
      name: 'Unrelated square',
      widthPx: 1080,
      heightPx: 1080,
    })

    await db.creative.create({
      data: {
        businessId: testBusinessId,
        name: 'Story ad',
        assets: { create: [{ assetId: asset.id }] },
      },
    })

    const listed = await app.inject({
      method: 'GET',
      url: '/assets?q=bay',
      headers: asAuth(testUserId),
    })
    expect(listed.statusCode).toBe(200)
    const rows = listed.json().data
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(asset.id)
    expect(rows[0].usedInAds).toBe(1)
    expect(rows[0].placements).toEqual(['STORY'])

    const missed = await app.inject({
      method: 'GET',
      url: `/assets/${decoy.id}`,
      headers: asAuth(testUserId),
    })
    expect(missed.json().data.usedInAds).toBe(0)
  })

  it('saves an uploaded file and isolates tenants', async () => {
    const asset = await createAsset({
      type: 'IMAGE',
      name: 'Pixel',
      widthPx: 1,
      heightPx: 1,
      file: { filename: 'pixel.png', mimeType: 'image/png', data: PNG_1X1 },
    })
    expect(asset.url).toMatch(/^\/uploads\/.+\.png$/)
    expect(asset.mimeType).toBe('image/png')
    expect(asset.sizeBytes).toBeGreaterThan(0)
    expect(asset.placements).toEqual(['SQUARE'])

    const other = await app.inject({
      method: 'GET',
      url: `/assets/${asset.id}`,
      headers: asAuth(testOtherUserId),
    })
    expect(other.statusCode).toBe(404)
  })
})
