import { mkdir, writeFile, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { resolve, extname } from 'path'

export const MAX_BYTES = 4 * 1024 * 1024
export const BODY_LIMIT_BYTES = 7 * 1024 * 1024

export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
}

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime]),
)

const UUID_STEM = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
/** Content-addressed thumbnail cache keys — `thumb-{sha256}.jpg`. */
const THUMB_STEM = 'thumb-[0-9a-f]{32,64}'
const KEY_PATTERN = new RegExp(
  `^(${UUID_STEM}|${THUMB_STEM})(${Object.values(EXT_BY_MIME)
    .map((ext) => ext.replace('.', '\\.'))
    .join('|')})$`,
  'i',
)

export function uploadDir() {
  return process.env.UPLOAD_DIR ?? resolve(process.cwd(), 'uploads')
}

export function assertSafeKey(filename: string) {
  if (!KEY_PATTERN.test(filename)) {
    throw { statusCode: 400, message: 'Invalid filename' }
  }
}

export function mimeForKey(filename: string) {
  return MIME_BY_EXT[extname(filename).toLowerCase()] ?? 'application/octet-stream'
}

export function localPath(filename: string) {
  assertSafeKey(filename)
  return resolve(uploadDir(), filename)
}

export async function writeLocal(filename: string, buffer: Buffer) {
  const dir = uploadDir()
  await mkdir(dir, { recursive: true })
  await writeFile(localPath(filename), buffer)
}

export async function localExists(filename: string) {
  try {
    await stat(localPath(filename))
    return true
  } catch {
    return false
  }
}

export function streamLocal(filename: string) {
  return createReadStream(localPath(filename))
}
