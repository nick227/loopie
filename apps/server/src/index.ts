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
import { BODY_LIMIT_BYTES, registerUploadStatic } from './lib/mediaStorage'
import { db, cleanupExpiredRateLimitBuckets } from '@project/db'

const server = Fastify({ logger: true, bodyLimit: BODY_LIMIT_BYTES })

const specPath = resolve(__dirname, '../../../packages/api-spec/openapi.yaml')
const spec = load(readFileSync(specPath, 'utf-8')) as object

async function main() {
  // CORS — must be first so preflight OPTIONS requests are handled before routing
  // credentials: true required for httpOnly cookie auth across origins
  // In production set CORS_ORIGIN to the deployed frontend URL (e.g. https://yourapp.vercel.app)
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim().replace(/\/$/, ''))
    : 'http://localhost:5173'

  await server.register(cors, {
    origin: corsOrigin,
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
  server.get('/loopie.js', async (_request, reply) => {
    const body = readFileSync(resolve(__dirname, 'public/loopie.js'), 'utf-8')
    return reply
      .header('Cache-Control', 'public, max-age=300')
      .header('Access-Control-Allow-Origin', '*')
      .type('application/javascript')
      .send(body)
  })
  await registerUploadStatic(server)

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

  await server.listen({
    port: Number(process.env.PORT ?? 3001),
    host: '0.0.0.0',
  })

  const shutdown = async () => {
    server.log.info('Shutting down server...')
    await server.close()
    process.exit(0)
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
