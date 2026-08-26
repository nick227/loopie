import type { PrismaClient } from '@prisma/client'

export type RateLimitResult = { allowed: boolean; count: number; limit: number }

// Fixed-window counter backed by the shared database, so the limit is enforced correctly across
// every process hitting this same DB (multiple Railway instances, a restart) — not just whichever
// process happened to receive a given request, unlike a process-local in-memory Map. Windows are
// aligned to wall-clock boundaries (a request at 12:00:05 and one at 12:00:55 share a window; one
// at 12:01:05 does not) rather than sliding per-key from first-hit, so the window boundary can be
// baked directly into the bucket's key — a single `upsert` is then all that's needed per request,
// with no read-then-write race between concurrent requests for the same key (MySQL's underlying
// INSERT ... ON DUPLICATE KEY UPDATE is atomic per row).
export async function consumeRateLimit(
  db: PrismaClient,
  bucketKey: string,
  opts: { windowMs: number; max: number },
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = Math.floor(now / opts.windowMs) * opts.windowMs
  const key = `${bucketKey}:${windowStart}`
  // Kept one extra window past its own so the cleanup sweep below can't delete a bucket while
  // a request in its tail end is still about to increment it.
  const expiresAt = new Date(windowStart + opts.windowMs * 2)

  const bucket = await db.rateLimitBucket.upsert({
    where: { key },
    create: { key, count: 1, expiresAt },
    update: { count: { increment: 1 } },
  })

  return { allowed: bucket.count <= opts.max, count: bucket.count, limit: opts.max }
}

// Periodic sweep for expired windows, called from a setInterval in each service's index.ts (same
// pattern as this repo's other pollers — AutomationExecutorService/AffiliatePayoutService). Safe
// to run from either or both services concurrently since they share this one table.
export async function cleanupExpiredRateLimitBuckets(db: PrismaClient): Promise<number> {
  const result = await db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  return result.count
}
