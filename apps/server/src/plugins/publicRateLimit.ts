import type { FastifyReply, FastifyRequest } from 'fastify'

const WINDOW_MS = 60_000
const MAX = 60

const PUBLIC_WRITES: Array<{ method: string; pattern: RegExp }> = [
  { method: 'POST', pattern: /^\/landing-pages\/[^/]+\/submissions$/ },
  { method: 'POST', pattern: /^\/landing-pages\/[^/]+\/form-start$/ },
  { method: 'POST', pattern: /^\/attribution\/form-submit$/ },
]

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function isPublicWrite(method: string, url: string): boolean {
  const path = url.split('?')[0] ?? url
  return PUBLIC_WRITES.some((rule) => rule.method === method && rule.pattern.test(path))
}

export async function publicRateLimit(request: FastifyRequest, reply: FastifyReply) {
  if (process.env.VITEST) return
  if (!isPublicWrite(request.method, request.url)) return

  const ip = request.ip
  const key = `${ip}:${request.method}:${request.url.split('?')[0] ?? request.url}`
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
