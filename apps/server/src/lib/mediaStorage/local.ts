import { mkdir, writeFile, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { resolve, extname } from 'path'

export const MAX_BYTES = 4 * 1024 * 1024

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

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
}

export function uploadDir() {
  return process.env.UPLOAD_DIR ?? resolve(process.cwd(), 'uploads')
}

export function assertSafeKey(filename: string) {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw { statusCode: 400, message: 'Invalid filename' }
  }
}

export function mimeForKey(filename: string) {
  return MIME_BY_EXT[extname(filename)] ?? 'application/octet-stream'
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
