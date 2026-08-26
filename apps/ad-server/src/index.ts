import Fastify from 'fastify'
import cors from '@fastify/cors'
import { registerRoutes } from './routes'
import { publicRateLimit } from './plugins/publicRateLimit'

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

  await server.listen({
    port: Number(process.env.AD_SERVER_PORT ?? 3002),
    host: '0.0.0.0',
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
