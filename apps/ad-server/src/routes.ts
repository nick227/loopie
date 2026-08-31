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
    reply.header('Cache-Control', 'no-store').type('text/html').send(html)
  })

  // Classic tracking-pixel pattern: <img src="/impression/:adUnitId">.
  // Cache-Control: no-store is required, not cosmetic — RFC 7231 allows a 204 with no explicit
  // freshness directive to be cached, and a CDN/browser caching this pixel would silently
  // under-count every repeat impression it serves from cache instead of the origin.
  server.get('/impression/:adUnitId', async (request, reply) => {
    const { adUnitId } = request.params as { adUnitId: string }
    await adServeService.recordImpression(adUnitId)
    reply.header('Cache-Control', 'no-store').code(204).send()
  })

  // Click + redirect. no-store for the same reason as the impression pixel above — a cached 302
  // would replay a stale redirect without ever re-hitting recordClick.
  server.get('/click/:adUnitId', async (request, reply) => {
    const { adUnitId } = request.params as { adUnitId: string }
    const { sid, click_id } = request.query as { sid?: string; click_id?: string }
    const { redirectUrl } = await adServeService.recordClick(adUnitId, sid, click_id)
    reply.header('Cache-Control', 'no-store').redirect(302, redirectUrl)
  })
}
