import type { FastifyReply, FastifyRequest } from 'fastify'

const WINDOW_MS = 60_000
const MAX = 120

const PUBLIC_WRITES = [/^\/impression\/[^/]+$/, /^\/click\/[^/]+$/, /^\/embed\/[^/]+$/]

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export async function publicRateLimit(request: FastifyRequest, reply: FastifyReply) {
  if (process.env.VITEST) return
  const path = request.url.split('?')[0] ?? request.url
  if (!PUBLIC_WRITES.some((pattern) => pattern.test(path))) return

  const key = `${request.ip}:${request.method}:${path}`
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  bucket.count += 1
  if (bucket.count > MAX) {
    return reply.status(429).send({ error: 'Too many requests' })
  }
}
