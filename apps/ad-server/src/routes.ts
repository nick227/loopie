import type { FastifyInstance } from 'fastify'
import { AdServeService } from './services/AdServeService'

const adServeService = new AdServeService()

export function registerRoutes(server: FastifyInstance) {
  // JSON payload for custom embed rendering (a JS SDK, or any non-iframe integration).
  server.get('/serve/:adUnitId', async (request, reply) => {
    const { adUnitId } = request.params as { adUnitId: string }
    const payload = await adServeService.getServePayload(adUnitId)
    reply.send({ data: payload })
  })

  // Self-contained HTML snippet, suitable for an <iframe src="...">.
  server.get('/embed/:adUnitId', async (request, reply) => {
    const { adUnitId } = request.params as { adUnitId: string }
    const { sid } = request.query as { sid?: string }
    const html = await adServeService.renderEmbed(adUnitId, sid)
    reply.type('text/html').send(html)
  })

  // Classic tracking-pixel pattern: <img src="/impression/:adUnitId">.
  server.get('/impression/:adUnitId', async (request, reply) => {
    const { adUnitId } = request.params as { adUnitId: string }
    await adServeService.recordImpression(adUnitId)
    reply.code(204).send()
  })

  // Click + redirect.
  server.get('/click/:adUnitId', async (request, reply) => {
    const { adUnitId } = request.params as { adUnitId: string }
    const { sid } = request.query as { sid?: string }
    const { redirectUrl } = await adServeService.recordClick(adUnitId, sid)
    reply.redirect(302, redirectUrl)
  })
}
