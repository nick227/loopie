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
import { runDueAutomations } from './services/AutomationExecutorService'
import { runDuePayouts } from './services/AffiliatePayoutService'
import { db, cleanupExpiredRateLimitBuckets } from '@project/db'

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

  await server.register(async (stripeApp) => {
    stripeApp.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, body, done) => {
        done(null, body)
      },
    )
    stripeApp.post('/stripe/webhook', async (request, reply) => {
      const { StripeWebhookService } = await import('./services/StripeWebhookService')
      const { getStripe } = await import('./lib/stripe')
      const secret = process.env.STRIPE_WEBHOOK_SECRET
      if (!secret) throw { statusCode: 503, message: 'Stripe is not configured' }
      const signature = request.headers['stripe-signature']
      if (typeof signature !== 'string')
        throw { statusCode: 400, message: 'Missing Stripe-Signature' }
      const raw = request.body
      if (!Buffer.isBuffer(raw)) throw { statusCode: 400, message: 'Webhook body must be raw' }
      let event
      try {
        event = getStripe().webhooks.constructEvent(raw, signature, secret)
      } catch {
        throw { statusCode: 400, message: 'Invalid Stripe signature' }
      }
      await new StripeWebhookService().handleVerifiedEvent(event)
      return reply.send({ received: true })
    })
  })

  // Automation execution poller — no queue/worker infra exists, so this is a plain interval on
  // the one server process (matches the existing single-process Railway deployment). Guarded
  // out of NODE_ENV=test so tests (which don't import this file at all today, but might via a
  // future full-app harness) never get a background timer racing their own DB assertions.
  if (process.env.NODE_ENV !== 'test') {
    const intervalMs = Number(process.env.AUTOMATION_POLL_INTERVAL_MS ?? 60_000)
    setInterval(() => {
      runDueAutomations().catch((err) => server.log.error(err))
    }, intervalMs)

    const payoutIntervalMs = Number(process.env.AFFILIATE_PAYOUT_POLL_INTERVAL_MS ?? 60 * 60_000)
    setInterval(() => {
      runDuePayouts().catch((err) => server.log.error(err))
    }, payoutIntervalMs)

    // Sweeps expired RateLimitBucket rows (see publicRateLimit.ts) — shared with apps/ad-server,
    // safe to run from either or both processes.
    const rateLimitCleanupIntervalMs = Number(
      process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS ?? 10 * 60_000,
    )
    setInterval(() => {
      cleanupExpiredRateLimitBuckets(db).catch((err) => server.log.error(err))
    }, rateLimitCleanupIntervalMs)
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
