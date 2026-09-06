import type { FastifyReply, FastifyRequest } from 'fastify'
import { db, consumeRateLimit } from '@project/db'

const WINDOW_MS = 60_000
const MAX = 120

// Legacy ad-serving routes.
const LEGACY_ROUTES = [
  /^\/impression\/[^/]+$/,
  /^\/click\/[^/]+$/,
  /^\/embed\/[^/]+$/,
  /^\/ads\/[^/]+\/embed$/,
]

// The v1 embed surface (Ad Designer, 2026-09-03) — publicly embeddable on third-party pages, so
// every route here is reachable by anyone who can load a page carrying the embed script, not just
// our own frontend. /v1/embed/:publicId/submit in particular writes a real FormSubmission/Lead per
// request, which makes it the single highest-value target in this list to keep rate-limited.
const V1_EMBED_ROUTES = [
  /^\/v1\/embeds\/[^/]+\/authorize$/,
  /^\/v1\/embed-instances\/redeem$/,
  /^\/v1\/embed-events$/,
  /^\/v1\/embed\/[^/]+\/click$/,
  /^\/v1\/embed\/[^/]+\/submit$/,
  /^\/e\/[^/]+$/,
]

const PUBLIC_WRITES = [...LEGACY_ROUTES, ...V1_EMBED_ROUTES]

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
