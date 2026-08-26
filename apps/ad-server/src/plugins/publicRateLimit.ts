import type { FastifyReply, FastifyRequest } from 'fastify'
import { db, consumeRateLimit } from '@project/db'

const WINDOW_MS = 60_000
const MAX = 120

const PUBLIC_WRITES = [/^\/impression\/[^/]+$/, /^\/click\/[^/]+$/, /^\/embed\/[^/]+$/]

// DB-backed (see @project/db#consumeRateLimit) so the limit holds across every instance of this
// service, not just whichever one a given request happens to land on — a plain in-memory Map
// (the previous implementation) silently stops working the moment there's more than one process.
export async function publicRateLimit(request: FastifyRequest, reply: FastifyReply) {
  if (process.env.VITEST) return
  const path = request.url.split('?')[0] ?? request.url
  if (!PUBLIC_WRITES.some((pattern) => pattern.test(path))) return

  const bucketKey = `ad-server:${request.method}:${path}:${request.ip}`
  const { allowed } = await consumeRateLimit(db, bucketKey, { windowMs: WINDOW_MS, max: MAX })
  if (!allowed) {
    return reply.status(429).send({ error: 'Too many requests' })
  }
}
