import Fastify from 'fastify'
import cors from '@fastify/cors'
import { registerRoutes } from './routes'
import { publicRateLimit } from './plugins/publicRateLimit'
import { db, cleanupExpiredRateLimitBuckets } from '@project/db'

const server = Fastify({ logger: true })

async function main() {
  // Open CORS — unlike apps/server (only the LOOPIE web app calls it), this server's routes are
  // embedded on arbitrary third-party pages (ad units, tracking pixels).
  await server.register(cors, { origin: true })

  server.addHook('onRequest', publicRateLimit)

  server.setErrorHandler((error, _request, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode) {
      return reply.status(statusCode).send({ error: error.message })
    }
    if ((error as { code?: string }).code === 'P2025') {
      return reply.status(404).send({ error: 'Not found' })
    }
    server.log.error(error)
    return reply.status(500).send({ error: 'Internal server error' })
  })

  registerRoutes(server)

  server.get('/health', async () => ({ status: 'ok' }))

  // Sweeps expired RateLimitBucket rows (see publicRateLimit.ts) — shared with apps/server, safe
  // to run from either or both processes. No queue/worker infra exists anywhere in this repo, so
  // this matches the plain-setInterval pattern already used for apps/server's pollers.
  if (process.env.NODE_ENV !== 'test') {
    const rateLimitCleanupIntervalMs = Number(
      process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS ?? 10 * 60_000,
    )
    setInterval(() => {
      cleanupExpiredRateLimitBuckets(db).catch((err) => server.log.error(err))
    }, rateLimitCleanupIntervalMs)
  }

  await server.listen({
    port: Number(process.env.AD_SERVER_PORT ?? 3002),
    host: '0.0.0.0',
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
