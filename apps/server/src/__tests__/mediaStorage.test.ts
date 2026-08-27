import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import Fastify from 'fastify'

const send = vi.hoisted(() => vi.fn())

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send(command: unknown) {
      return send(command)
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
    vi.stubEnv('NODE_ENV', 'production')
    for (const [key, value] of Object.entries(R2_ENV)) vi.stubEnv(key, value)
    send.mockRejectedValue(new Error('R2 down'))

    const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const bytes = await readFile(join(dir, saved.filename))
    expect(bytes.length).toBeGreaterThan(0)
    expect(send).toHaveBeenCalled()
  })

  it('streams from disk when R2 is disabled', async () => {
    const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const app = Fastify()
    await registerUploadStatic(app)
    const res = await app.inject({ method: 'GET', url: `/uploads/${saved.filename}` })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/image\/png/)
    expect(res.rawPayload.length).toBeGreaterThan(0)
    await app.close()
  })

  it('redirects to R2 when the object exists, and streams disk when R2 errors', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    for (const [key, value] of Object.entries(R2_ENV)) vi.stubEnv(key, value)
    send.mockResolvedValueOnce({})

    const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const app = Fastify()
    await registerUploadStatic(app)

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
})
