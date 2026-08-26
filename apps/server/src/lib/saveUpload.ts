import { mkdir, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { resolve } from 'path'

const MAX_BYTES = 4 * 1024 * 1024
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
}

export function uploadDir() {
  return process.env.UPLOAD_DIR ?? resolve(process.cwd(), 'uploads')
}

function decodeBase64(data: string) {
  const raw = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  return Buffer.from(raw, 'base64')
}

export async function saveMediaFile(input: { mimeType: string; data: string }) {
  const ext = MIME_EXT[input.mimeType]
  if (!ext) throw { statusCode: 400, message: 'Unsupported file type' }
  const buffer = decodeBase64(input.data)
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw { statusCode: 400, message: 'File must be between 1 byte and 4 MB' }
  }
  const filename = `${randomUUID()}${ext}`
  const dir = uploadDir()
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, filename), buffer)
  return {
    filename,
    mimeType: input.mimeType,
    sizeBytes: buffer.length,
    url: `/uploads/${filename}`,
  }
}
