import { renderBusinessProfile, getBusinessProfileJson } from '../lib/renderBusinessProfile'
import { resolveOptionalViewer } from '../lib/riverViewer'
import { InternalMessagingService } from '../services/InternalMessagingService'
import { db } from '@project/db'

const internalMessaging = new InternalMessagingService()

// Content negotiation, not two endpoints — same convention as handlers/river.ts's wantsJson: the
// rendered page has no fetch()-driven caller (it's a plain navigation), so it never sends
// `Accept: application/json`; the SPA's own /b/:slug route explicitly does and gets the JSON
// shape instead. See the "Business profiles: redesign + fold into the app shell" plan doc.
function wantsJson(request: any): boolean {
  return Boolean(request.headers.accept?.includes('application/json'))
}

// Public — no request.user (the { data } JSON envelope doesn't apply to the HTML branch, mirrors
// servePublishedLandingPage in handlers/landingPages.ts; the JSON branch does use { data }, same
// as every other JSON operation). resolveOptionalViewer (slice 2) is the same cookie-on-
// PUBLIC_SERVER_URL recognition GET /river uses — see the slice-4 plan doc.
export async function servePublicBusinessProfile(request: any, reply: any) {
  const viewer = await resolveOptionalViewer(request)
  if (wantsJson(request)) {
    const data = await getBusinessProfileJson(request.params.slug, {
      viewerBusinessId: viewer?.businessId,
    })
    return reply.send({ data })
  }
  const html = await renderBusinessProfile(request.params.slug, {
    viewerBusinessId: viewer?.businessId,
    viewerSlug: viewer?.businessSlug,
    currentUrl: request.url,
    cursor: request.query.cursor,
  })
  return reply.type('text/html').send(html)
}

// Optional auth by design: a recognized viewer becomes the sender of a replyable site
// conversation; an anonymous visitor creates a one-way guest inbox item.
export async function sendBusinessProfileMessage(request: any, reply: any) {
  const viewer = await resolveOptionalViewer(request)
  const business = await db.business.findUnique({
    where: { slug: request.params.slug },
    select: { id: true },
  })
  if (!business) throw { statusCode: 404, message: 'Business not found' }
  const data = await internalMessaging.sendToBusiness({
    recipientBusinessId: business.id,
    senderBusinessId: viewer?.businessId,
    body: request.body.body,
  })
  return reply.status(201).send({ data: { threadId: data.threadId, sentAt: data.sentAt } })
}
