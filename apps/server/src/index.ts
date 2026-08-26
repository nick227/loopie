import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import openapiGlue from 'fastify-openapi-glue'
import { load } from 'js-yaml'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as handlers from './handlers'
import * as security from './plugins/security'
import { mapErrorToReply } from './plugins/errorHandler'
import { publicRateLimit } from './plugins/publicRateLimit'
import { runDuePayouts } from './services/AffiliatePayoutService'

const server = Fastify({ logger: true })

const specPath = resolve(__dirname, '../../../packages/api-spec/openapi.yaml')
const spec = load(readFileSync(specPath, 'utf-8')) as object

async function main() {
  // CORS — must be first so preflight OPTIONS requests are handled before routing
  // credentials: true required for httpOnly cookie auth across origins
  // In production set CORS_ORIGIN to the deployed frontend URL (e.g. https://yourapp.vercel.app)
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })

  // cookies — must register before glue so request.cookies is populated
  await server.register(cookie)

  if (process.env.NODE_ENV !== 'production') {
    await server.register(swagger, { openapi: spec })
    await server.register(swaggerUi, { routePrefix: '/docs' })
  }

  server.addHook('onRequest', publicRateLimit)

  server.setErrorHandler((error, request, reply) => mapErrorToReply(error, reply, request.log))

  // spec-driven routing — operationId → handler export, security scheme → handler
  await server.register(openapiGlue, {
    specification: specPath,
    service: handlers,
    securityHandlers: security,
    noAdditional: true,
  } as any)

  // health check — not in spec, always public
  server.get('/health', async () => ({ status: 'ok' }))

  // Automation execution poller — no queue/worker infra exists, so this is a plain interval on
  // the one server process (matches the existing single-process Railway deployment). Guarded
  // out of NODE_ENV=test so tests (which don't import this file at all today, but might via a
  // future full-app harness) never get a background timer racing their own DB assertions.
  if (process.env.NODE_ENV !== 'test') {
    const payoutIntervalMs = Number(process.env.AFFILIATE_PAYOUT_POLL_INTERVAL_MS ?? 60 * 60_000)
    setInterval(() => {
      runDuePayouts().catch((err) => server.log.error(err))
    }, payoutIntervalMs)
  }

  await server.listen({
    port: Number(process.env.PORT ?? 3001),
    host: '0.0.0.0',
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
