import type { FastifyInstance } from 'fastify'
import fs from 'fs'
import path from 'path'
import { AdServeService } from './services/AdServeService'
import { EmbedServingService } from './services/EmbedServingService'

const adServeService = new AdServeService()
const embedServingService = new EmbedServingService()

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

  // --- V1 Embed Endpoints ---

  // Serve the v1.js loader
  server.get('/v1.js', (request, reply) => {
    try {
      const v1JsPath = path.join(__dirname, '../public/v1.js')
      const content = fs.readFileSync(v1JsPath, 'utf-8')
      reply
        .header('Cache-Control', 'public, max-age=31536000')
        .type('application/javascript')
        .send(content)
    } catch (e) {
      reply.code(404).send('Not found')
    }
  })

  // Authorize and issue bootstrap token
  server.post('/v1/embeds/:publicId/authorize', async (request, reply) => {
    const { publicId } = request.params as { publicId: string }
    const { url, referrer } = request.body as { url: string; referrer?: string }
    const origin = url ? new URL(url).origin : request.headers.origin || ''
    const data = await embedServingService.getBootstrapMetadata(publicId, origin)
    reply
      .header('Access-Control-Allow-Origin', '*')
      .header('Cache-Control', 'no-store')
      .send({ data })
  })

  // Iframe renderer
  server.get('/e/:publicId', async (request, reply) => {
    const { publicId } = request.params as { publicId: string }
    const { token } = request.query as { token?: string }
    const html = await embedServingService.renderIframe(publicId, token)
    reply
      .header('Cache-Control', 'no-store')
      .header(
        'Content-Security-Policy',
        'sandbox allow-scripts allow-top-navigation-by-user-activation allow-same-origin allow-forms allow-popups;',
      )
      .type('text/html')
      .send(html)
  })

  // Redeem token for instance
  server.post('/v1/embed-instances/redeem', async (request, reply) => {
    const { publicId } = request.query as { publicId: string } // Or in body, but let's assume it's part of identity
    // Implement token redemption (currently handled partially in renderIframe or impression)
    reply.header('Access-Control-Allow-Origin', '*').code(200).send({ success: true })
  })

  // Embed Events
  server.post('/v1/embed-events', async (request, reply) => {
    const { publicId, instanceId, eventType } = request.body as any
    if (eventType === 'ad_impression' || eventType === 'page_viewed') {
      await embedServingService.recordImpression(publicId, instanceId)
    }
    reply.header('Access-Control-Allow-Origin', '*').code(204).send()
  })

  server.get('/v1/embed/:publicId/click', async (request, reply) => {
    const { publicId } = request.params as { publicId: string }
    const { instanceId, sid } = request.query as { instanceId: string; sid?: string }
    const { redirectUrl } = await embedServingService.recordClick(publicId, instanceId, sid)
    reply.header('Cache-Control', 'no-store').redirect(302, redirectUrl)
  })

  server.post('/v1/embed/:publicId/submit', async (request, reply) => {
    const { publicId } = request.params as { publicId: string }
    const { instanceId } = request.query as { instanceId: string }
    const { data } = request.body as { data: any }
    if (!instanceId) {
      return reply.code(400).send({ error: 'instanceId is required' })
    }
    try {
      await embedServingService.recordSubmission(publicId, instanceId, data)
      reply.header('Access-Control-Allow-Origin', '*').code(200).send({ success: true })
    } catch (error: any) {
      if (error.message && error.message.includes('Validation failed')) {
        return reply.code(400).send({ error: error.message })
      }
      throw error
    }
  })
}
