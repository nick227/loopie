import type { FastifyReply, FastifyRequest } from 'fastify'
import { db, consumeRateLimit } from '@project/db'

const WINDOW_MS = 60_000
const MAX = 60

const PUBLIC_WRITES: Array<{ method: string; pattern: RegExp }> = [
  { method: 'POST', pattern: /^\/landing-pages\/[^/]+\/submissions$/ },
  { method: 'POST', pattern: /^\/landing-pages\/[^/]+\/form-start$/ },
  { method: 'POST', pattern: /^\/attribution\/form-submit$/ },
]

function isPublicWrite(method: string, url: string): boolean {
  const path = url.split('?')[0] ?? url
  return PUBLIC_WRITES.some((rule) => rule.method === method && rule.pattern.test(path))
}

// DB-backed (see @project/db#consumeRateLimit) so the limit holds across every instance of this
// service, not just whichever one a given request happens to land on — a plain in-memory Map
// (the previous implementation) silently stops working the moment there's more than one process.
export async function publicRateLimit(request: FastifyRequest, reply: FastifyReply) {
  if (process.env.VITEST) return
  if (!isPublicWrite(request.method, request.url)) return

  const path = request.url.split('?')[0] ?? request.url
  const bucketKey = `server:${request.method}:${path}:${request.ip}`
  const { allowed } = await consumeRateLimit(db, bucketKey, { windowMs: WINDOW_MS, max: MAX })
  if (!allowed) {
    return reply.status(429).send({ error: 'Too many requests' })
  }
}
