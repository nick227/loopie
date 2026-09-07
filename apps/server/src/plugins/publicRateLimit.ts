import type { FastifyReply, FastifyRequest } from 'fastify'
import { db, consumeRateLimit } from '@project/db'

const WINDOW_MS = 60_000
const MAX = 60

const PUBLIC_WRITES: Array<{ method: string; pattern: RegExp }> = [
  { method: 'POST', pattern: /^\/landing-pages\/[^/]+\/submissions$/ },
  { method: 'POST', pattern: /^\/landing-pages\/[^/]+\/form-start$/ },
  { method: 'POST', pattern: /^\/attribution\/form-submit$/ },
  { method: 'POST', pattern: /^\/t\/events$/ },
  { method: 'GET', pattern: /^\/t\/session$/ },
  { method: 'POST', pattern: /^\/site-inquiries$/ },
  { method: 'POST', pattern: /^\/b\/[^/]+\/messages$/ },
  // Registration is unauthenticated by nature and, since the referral program shipped, does a
  // user-controlled DB lookup keyed on `referralCode` — without a limit here that lookup is a
  // free enumeration oracle for valid referral codes, on top of plain signup-spam risk.
  { method: 'POST', pattern: /^\/auth\/register$/ },
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
  const TIGHT_LIMIT_PATHS = new Set(['/site-inquiries', '/auth/register'])
  const { allowed } = await consumeRateLimit(db, bucketKey, {
    windowMs: WINDOW_MS,
    max: TIGHT_LIMIT_PATHS.has(path) ? 5 : MAX,
  })
  if (!allowed) {
    return reply.status(429).send({ error: 'Too many requests' })
  }
}
