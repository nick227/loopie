import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { resolve, extname } from 'path'
import type { FastifyInstance } from 'fastify'
import { uploadDir } from './saveUpload'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
}

export async function registerUploadStatic(server: FastifyInstance) {
  server.get('/uploads/:filename', async (request, reply) => {
    const filename = (request.params as { filename: string }).filename
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw { statusCode: 400, message: 'Invalid filename' }
    }
    const path = resolve(uploadDir(), filename)
    try {
      await stat(path)
    } catch {
      throw { statusCode: 404, message: 'Not found' }
    }
    const type = MIME[extname(filename)] ?? 'application/octet-stream'
    return reply.type(type).send(createReadStream(path))
  })
}
