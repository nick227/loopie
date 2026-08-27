import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import Fastify from 'fastify'
import { db } from '@project/db'
import { mapErrorToReply } from '../plugins/errorHandler'
import { AssetService } from '../services/AssetService'

const send = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send(command: unknown, options?: unknown) {
      return send(command, options)
    }
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  HeadObjectCommand: class {
    constructor(public input: unknown) {}
  },
}))

import { r2Enabled, registerUploadStatic, saveMediaFile } from '../lib/mediaStorage'
import { assertSafeKey } from '../lib/mediaStorage/local'

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const R2_ENV = {
  R2_ENDPOINT: 'https://abc.r2.cloudflarestorage.com',
  R2_ACCESS_KEY_ID: 'id',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'media',
  R2_PUBLIC_URL: 'https://cdn.test',
}

function stuffR2(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...env, ...R2_ENV }
}

function enableR2() {
  vi.stubEnv('NODE_ENV', 'production')
  for (const [key, value] of Object.entries(R2_ENV)) vi.stubEnv(key, value)
}

function timeoutErr() {
  const err = new Error('The operation was aborted')
  err.name = 'TimeoutError'
  return err
}

async function serveApp() {
  const app = Fastify()
  app.setErrorHandler((error, request, reply) => mapErrorToReply(error, reply, request.log))
  await registerUploadStatic(app)
  return app
}

describe('media storage', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-uploads-'))
    vi.stubEnv('UPLOAD_DIR', dir)
    send.mockReset()
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await rm(dir, { recursive: true, force: true })
  })

  it('ignores R2 vars unless NODE_ENV is production', () => {
    expect(r2Enabled(stuffR2({ NODE_ENV: 'test' }))).toBe(false)
    expect(r2Enabled(stuffR2({ NODE_ENV: 'development' }))).toBe(false)
    expect(r2Enabled(stuffR2({ NODE_ENV: 'production' }))).toBe(true)
    expect(r2Enabled({ NODE_ENV: 'production' })).toBe(false)
  })

  it('always writes a local file', async () => {
    const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const bytes = await readFile(join(dir, saved.filename))
    expect(saved.url).toBe(`/uploads/${saved.filename}`)
    expect(bytes.length).toBeGreaterThan(0)
    expect(send).not.toHaveBeenCalled()
  })

  it('still writes local when R2 put throws', async () => {
    enableR2()
    send.mockRejectedValue(new Error('R2 down'))

    const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const bytes = await readFile(join(dir, saved.filename))
    expect(bytes.length).toBeGreaterThan(0)
    expect(send).toHaveBeenCalled()
  })

  it('still creates an Asset when R2 put times out', async () => {
    enableR2()
    send.mockRejectedValue(timeoutErr())
    const business = await db.business.create({ data: { name: 'R2 timeout biz' } })

    const asset = await new AssetService().create(business.id, {
      type: 'IMAGE',
      name: 'Pixel',
      file: { filename: 'pixel.png', mimeType: 'image/png', data: PNG_1X1 },
    })

    expect(asset.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/)
    expect(send.mock.calls[0]?.[1]).toMatchObject({ abortSignal: expect.any(AbortSignal) })
  })

  it('streams from disk when R2 is disabled', async () => {
    const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const app = await serveApp()
    const res = await app.inject({ method: 'GET', url: `/uploads/${saved.filename}` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/image\/png/)
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.rawPayload.length).toBeGreaterThan(0)
    await app.close()
  })

  it('redirects to R2 when the object exists, and streams disk when R2 errors', async () => {
    enableR2()
    send.mockResolvedValueOnce({})

    const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const app = await serveApp()

    send.mockResolvedValueOnce({})
    const redirected = await app.inject({ method: 'GET', url: `/uploads/${saved.filename}` })
    expect(redirected.statusCode).toBe(302)
    expect(redirected.headers.location).toBe(`https://cdn.test/${saved.filename}`)

    send.mockRejectedValueOnce(new Error('R2 down'))
    const fallback = await app.inject({ method: 'GET', url: `/uploads/${saved.filename}` })
    expect(fallback.statusCode).toBe(200)
    expect(fallback.rawPayload.length).toBeGreaterThan(0)
    await app.close()
  })

  it('falls back to disk when R2 HEAD times out', async () => {
    enableR2()
    send.mockResolvedValueOnce({})
    const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const app = await serveApp()

    send.mockRejectedValueOnce(timeoutErr())
    const res = await app.inject({ method: 'GET', url: `/uploads/${saved.filename}` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(res.rawPayload.length).toBeGreaterThan(0)
    expect(send.mock.calls.at(-1)?.[1]).toMatchObject({ abortSignal: expect.any(AbortSignal) })
    await app.close()
  })

  it('rejects malformed upload keys including "."', async () => {
    for (const key of [
      '.',
      '..',
      `${'-'.repeat(36)}.png`,
      'not-a-uuid.png',
      `${'0'.repeat(32)}.png`,
    ]) {
      try {
        assertSafeKey(key)
        expect.fail(`expected ${key} to be rejected`)
      } catch (err) {
        expect(err).toMatchObject({ statusCode: 400 })
      }
    }

    const app = await serveApp()
    const missing = await app.inject({
      method: 'GET',
      url: '/uploads/11111111-1111-1111-1111-111111111111.png',
    })
    expect(missing.statusCode).toBe(404)
    for (const key of ['.', `${'-'.repeat(36)}.png`, 'not-a-uuid.png']) {
      const res = await app.inject({ method: 'GET', url: `/uploads/${encodeURIComponent(key)}` })
      expect(res.statusCode, key).toBeGreaterThanOrEqual(400)
      expect(res.statusCode, key).toBeLessThan(500)
    }
    await app.close()
  })
})
