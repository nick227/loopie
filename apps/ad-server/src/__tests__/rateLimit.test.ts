// Filled-in integration test (not a generated stub) for closing the "process-local rate limits
// don't survive multiple instances" production-ops gap, apps/ad-server side. The shared
// DB-backed counter itself is already exhaustively tested in apps/server's rateLimit.test.ts
// (both apps import the exact same @project/db#consumeRateLimit) — this test proves this
// service's own Fastify hook wires it up correctly for its own routes/limits.
import { describe, it, expect, afterEach } from 'vitest'
import Fastify from 'fastify'
import { db } from '@project/db'
import { publicRateLimit } from '../plugins/publicRateLimit'

describe('publicRateLimit plugin (ad-server)', () => {
  const originalVitestEnv = process.env.VITEST
  afterEach(async () => {
    process.env.VITEST = originalVitestEnv
    await db.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'ad-server:' } } })
  })

  it('rate-limits /impression/:id but leaves non-listed routes alone', async () => {
    delete process.env.VITEST // the hook no-ops entirely under VITEST — see publicRateLimit.ts
    const app = Fastify()
    app.addHook('onRequest', publicRateLimit)
    app.get('/impression/:adUnitId', () => ({ ok: true }))
    app.get('/health', () => ({ ok: true }))
    await app.ready()

    const ip = '203.0.113.2' // TEST-NET-3, distinct per test run's bucket key
    const inject = () =>
      app.inject({ method: 'GET', url: '/impression/test-unit', remoteAddress: ip })

    let sawTooManyRequests = false
    for (let i = 0; i < 125; i++) {
      const res = await inject()
      if (res.statusCode === 429) {
        sawTooManyRequests = true
        break
      }
      expect(res.statusCode).toBe(200)
    }
    expect(sawTooManyRequests).toBe(true)

    const health = await app.inject({ method: 'GET', url: '/health', remoteAddress: ip })
    expect(health.statusCode).toBe(200)

    await app.close()
  })

  // Regression test for a real gap: the v1 embed surface (publicly embeddable on third-party
  // pages) was added after PUBLIC_WRITES was first written and never added to it, leaving
  // /v1/embed/:publicId/submit — which writes a real FormSubmission/Lead per request — completely
  // unthrottled. See publicRateLimit.ts's V1_EMBED_ROUTES.
  it('rate-limits /v1/embed/:publicId/submit', async () => {
    delete process.env.VITEST
    const app = Fastify()
    app.addHook('onRequest', publicRateLimit)
    app.post('/v1/embed/:publicId/submit', () => ({ success: true }))
    await app.ready()

    const ip = '203.0.113.3' // TEST-NET-3, distinct per test run's bucket key
    const inject = () =>
      app.inject({
        method: 'POST',
        url: '/v1/embed/test-public-id/submit?instanceId=test-instance',
        remoteAddress: ip,
      })

    let sawTooManyRequests = false
    for (let i = 0; i < 125; i++) {
      const res = await inject()
      if (res.statusCode === 429) {
        sawTooManyRequests = true
        break
      }
      expect(res.statusCode).toBe(200)
    }
    expect(sawTooManyRequests).toBe(true)

    await app.close()
  })
})
