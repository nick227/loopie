// Filled-in integration test (not a generated stub) for closing the "process-local rate limits
// don't survive multiple instances" production-ops gap. Two layers are tested: the shared
// DB-backed counter itself (@project/db#consumeRateLimit), and this app's Fastify hook that
// actually enforces it on public write routes.
import { describe, it, expect, vi, afterEach as vitestAfterEach } from 'vitest'
import Fastify from 'fastify'
import { db, consumeRateLimit, cleanupExpiredRateLimitBuckets } from '@project/db'
import { publicRateLimit } from '../plugins/publicRateLimit'

describe('consumeRateLimit', () => {
  it('allows up to max requests per window for a key, then rejects', async () => {
    const key = `test:consume:${crypto.randomUUID()}`
    const opts = { windowMs: 60_000, max: 3 }

    const first = await consumeRateLimit(db, key, opts)
    const second = await consumeRateLimit(db, key, opts)
    const third = await consumeRateLimit(db, key, opts)
    const fourth = await consumeRateLimit(db, key, opts)

    expect([first, second, third].map((r) => r.allowed)).toEqual([true, true, true])
    expect(fourth.allowed).toBe(false)
    expect(fourth.count).toBe(4)
  })

  it('tracks separate keys independently — a shared table is not the same as a shared counter', async () => {
    const opts = { windowMs: 60_000, max: 1 }
    const keyA = `test:consume:a:${crypto.randomUUID()}`
    const keyB = `test:consume:b:${crypto.randomUUID()}`

    const a1 = await consumeRateLimit(db, keyA, opts)
    const b1 = await consumeRateLimit(db, keyB, opts)
    const a2 = await consumeRateLimit(db, keyA, opts)

    expect(a1.allowed).toBe(true)
    expect(b1.allowed).toBe(true) // keyB's own first request, unaffected by keyA's count
    expect(a2.allowed).toBe(false) // keyA's second request in the same window
  })

  it('simulates two separate processes sharing one counter — the whole point of this fix', async () => {
    // Two independent calls with no shared in-memory state between them (as if from two
    // different server instances) still see and increment the same underlying count, because
    // the state lives in the database, not a process-local Map.
    const key = `test:consume:shared:${crypto.randomUUID()}`
    const opts = { windowMs: 60_000, max: 2 }

    const fromInstanceA = await consumeRateLimit(db, key, opts)
    const fromInstanceB = await consumeRateLimit(db, key, opts)
    const fromInstanceAAgain = await consumeRateLimit(db, key, opts)

    expect(fromInstanceA.count).toBe(1)
    expect(fromInstanceB.count).toBe(2)
    expect(fromInstanceAAgain.count).toBe(3)
    expect(fromInstanceAAgain.allowed).toBe(false)
  })

  it('a new wall-clock window resets the count', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      const key = `test:consume:window:${crypto.randomUUID()}`
      const opts = { windowMs: 60_000, max: 1 }

      const inWindowOne = await consumeRateLimit(db, key, opts)
      const stillWindowOne = await consumeRateLimit(db, key, opts)
      expect(inWindowOne.allowed).toBe(true)
      expect(stillWindowOne.allowed).toBe(false)

      vi.setSystemTime(new Date('2026-01-01T00:01:05.000Z')) // 65s later — a new 60s window
      const inWindowTwo = await consumeRateLimit(db, key, opts)
      expect(inWindowTwo.allowed).toBe(true)
      expect(inWindowTwo.count).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('cleanupExpiredRateLimitBuckets', () => {
  it('deletes only buckets past their expiry, leaving live ones alone', async () => {
    const liveKey = `test:cleanup:live:${crypto.randomUUID()}`
    const expiredKey = `test:cleanup:expired:${crypto.randomUUID()}`
    await db.rateLimitBucket.create({
      data: { key: liveKey, count: 1, expiresAt: new Date(Date.now() + 60_000) },
    })
    await db.rateLimitBucket.create({
      data: { key: expiredKey, count: 1, expiresAt: new Date(Date.now() - 1000) },
    })

    const deleted = await cleanupExpiredRateLimitBuckets(db)
    expect(deleted).toBeGreaterThanOrEqual(1)

    const remaining = await db.rateLimitBucket.findMany({
      where: { key: { in: [liveKey, expiredKey] } },
    })
    expect(remaining.map((r) => r.key)).toEqual([liveKey])
  })
})

describe('publicRateLimit plugin', () => {
  // buildTestApp() (used by every other test file) never registers this hook at all — it's a
  // bespoke minimal Fastify instance for exercising the OpenAPI-routed handlers, not index.ts's
  // real middleware stack. A small standalone app here proves the actual exported hook enforces
  // the limit end-to-end, not just the underlying consumeRateLimit helper it calls.
  const originalVitestEnv = process.env.VITEST
  vitestAfterEach(() => {
    process.env.VITEST = originalVitestEnv
  })

  it('returns 429 once a public write route exceeds its limit, and lets other routes through', async () => {
    delete process.env.VITEST // the hook no-ops entirely under VITEST — see publicRateLimit.ts
    const app = Fastify()
    app.addHook('onRequest', publicRateLimit)
    app.post('/attribution/form-submit', async () => ({ ok: true }))
    app.get('/health', async () => ({ ok: true }))
    await app.ready()

    const ip = '203.0.113.1' // TEST-NET-3, distinct per test run's bucket key
    const inject = () =>
      app.inject({
        method: 'POST',
        url: '/attribution/form-submit',
        remoteAddress: ip,
        payload: {},
      })

    let sawTooManyRequests = false
    for (let i = 0; i < 65; i++) {
      const res = await inject()
      if (res.statusCode === 429) {
        sawTooManyRequests = true
        break
      }
      expect(res.statusCode).toBe(200)
    }
    expect(sawTooManyRequests).toBe(true)

    // A non-public-write route is never rate-limited, even from the same IP.
    const health = await app.inject({ method: 'GET', url: '/health', remoteAddress: ip })
    expect(health.statusCode).toBe(200)

    await app.close()
  })
})
