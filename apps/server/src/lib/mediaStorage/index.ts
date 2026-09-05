import { randomUUID } from 'crypto'
import type { FastifyInstance } from 'fastify'
import {
  BODY_LIMIT_BYTES,
  EXT_BY_MIME,
  MAX_BYTES,
  assertSafeKey,
  localExists,
  mimeForKey,
  streamLocal,
  writeLocal,
} from './local'
import { r2ObjectExists, r2PublicUrl, r2Put, readR2Config } from './r2'

export { BODY_LIMIT_BYTES, MAX_BYTES } from './local'

const DISK_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
}

export function r2Enabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === 'production' && readR2Config(env) !== null
}

function decodeBase64(data: string) {
  const raw = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  return Buffer.from(raw, 'base64')
}

export async function saveMediaFile(input: { mimeType: string; data: string }) {
  const ext = EXT_BY_MIME[input.mimeType]
  if (!ext) throw { statusCode: 400, message: 'Unsupported file type' }
  const buffer = decodeBase64(input.data)
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw { statusCode: 400, message: 'File must be between 1 byte and 4 MB' }
  }
  const filename = `${randomUUID()}${ext}`
  await writeLocal(filename, buffer)
  if (r2Enabled()) {
    try {
      await r2Put(filename, buffer, input.mimeType)
    } catch (err) {
      console.error('R2 put failed; local copy kept', err)
    }
  }
  return {
    filename,
    mimeType: input.mimeType,
    sizeBytes: buffer.length,
    url: `/uploads/${filename}`,
  }
}

/** Derived-cache screenshots — filename is content-addressed by sourceChecksum (immutable key). */
export async function saveThumbnailFile(input: { sourceChecksum: string; buffer: Buffer }) {
  if (!/^[0-9a-f]{32,64}$/i.test(input.sourceChecksum)) {
    throw { statusCode: 400, message: 'Invalid thumbnail checksum' }
  }
  if (input.buffer.length === 0 || input.buffer.length > MAX_BYTES) {
    throw { statusCode: 400, message: 'File must be between 1 byte and 4 MB' }
  }
  const mimeType = 'image/jpeg'
  const filename = `thumb-${input.sourceChecksum.toLowerCase()}.jpg`
  await writeLocal(filename, input.buffer)
  if (r2Enabled()) {
    try {
      await r2Put(filename, input.buffer, mimeType)
    } catch (err) {
      console.error('R2 put failed; local copy kept', err)
    }
  }
  return {
    filename,
    mimeType,
    sizeBytes: input.buffer.length,
    url: `/uploads/${filename}`,
  }
}

export async function registerUploadStatic(server: FastifyInstance) {
  server.get('/uploads/:filename', async (request, reply) => {
    const filename = (request.params as { filename: string }).filename
    assertSafeKey(filename)
    if (r2Enabled()) {
      try {
        if (await r2ObjectExists(filename)) {
          return reply.redirect(r2PublicUrl(filename))
        }
      } catch (err) {
        console.error('R2 lookup failed; serving local copy', err)
      }
    }
    if (!(await localExists(filename))) throw { statusCode: 404, message: 'Not found' }
    return reply.headers(DISK_HEADERS).type(mimeForKey(filename)).send(streamLocal(filename))
  })
}
