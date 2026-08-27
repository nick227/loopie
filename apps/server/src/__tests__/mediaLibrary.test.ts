import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { MAX_BYTES } from '../lib/mediaStorage/local'

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

  describe('upload size through Fastify', () => {
    let dir: string

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'loopie-http-uploads-'))
      vi.stubEnv('UPLOAD_DIR', dir)
    })

    afterEach(async () => {
      vi.unstubAllEnvs()
      await rm(dir, { recursive: true, force: true })
    })

    it('accepts a file just under 4 MB', async () => {
      const data = Buffer.alloc(MAX_BYTES - 16).toString('base64')
      const res = await app.inject({
        method: 'POST',
        url: '/assets',
        headers: asAuth(testUserId),
        payload: {
          type: 'IMAGE',
          name: 'Near limit',
          file: { filename: 'near.png', mimeType: 'image/png', data },
        },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().data.url).toMatch(/^\/uploads\/.+\.png$/)
      expect(res.json().data.sizeBytes).toBe(MAX_BYTES - 16)
    }, 15_000)

    it('rejects a file over 4 MB with an application 400, not Fastify 413', async () => {
      const data = Buffer.alloc(MAX_BYTES + 1).toString('base64')
      const res = await app.inject({
        method: 'POST',
        url: '/assets',
        headers: asAuth(testUserId),
        payload: {
          type: 'IMAGE',
          name: 'Too big',
          file: { filename: 'big.png', mimeType: 'image/png', data },
        },
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error).toMatch(/4 MB/)
    }, 15_000)
  })
})
