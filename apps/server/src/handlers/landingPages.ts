import { LandingPageTemplateService } from '../services/LandingPageTemplateService'
import { LandingPageService } from '../services/LandingPageService'
import { LandingPageAdSlotService } from '../services/LandingPageAdSlotService'
import { LandingPageSubmissionService } from '../services/LandingPageSubmissionService'
import { LandingPageRenderService } from '../services/LandingPageRenderService'
import { PageThumbnailService } from '../services/PageThumbnailService'

const templateService = new LandingPageTemplateService()
const landingPageService = new LandingPageService()
const slotService = new LandingPageAdSlotService()
const submissionService = new LandingPageSubmissionService()
const renderService = new LandingPageRenderService()

export async function listLandingPageTemplates(request: any, reply: any) {
  const data = await templateService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function getLandingPageTemplate(request: any, reply: any) {
  const template = await templateService.get(request.user.businessId, request.params.templateId)
  return reply.send({ data: template })
}

export async function listLandingPages(request: any, reply: any) {
  const data = await landingPageService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createLandingPage(request: any, reply: any) {
  const page = await landingPageService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: page })
}

export async function getLandingPage(request: any, reply: any) {
  const page = await landingPageService.get(request.user.businessId, request.params.landingPageId)
  return reply.send({ data: page })
}

export async function updateLandingPage(request: any, reply: any) {
  const page = await landingPageService.update(
    request.user.businessId,
    request.params.landingPageId,
    request.body,
  )
  return reply.send({ data: page })
}

export async function deleteLandingPage(request: any, reply: any) {
  await landingPageService.delete(request.user.businessId, request.params.landingPageId)
  return reply.send({ data: null })
}

export async function replaceLandingPageAdSlots(request: any, reply: any) {
  const page = await slotService.replace(
    request.user.businessId,
    request.params.landingPageId,
    request.body.slots,
  )
  return reply.send({ data: page })
}

export async function publishLandingPage(request: any, reply: any) {
  const version = await landingPageService.publish(
    request.user.businessId,
    request.params.landingPageId,
    request.user.id,
  )
  return reply.status(201).send({ data: version })
}

export async function refreshLandingPageThumbnail(request: any, reply: any) {
  const data = await new PageThumbnailService().refreshForLandingPage(
    request.user.businessId,
    request.params.landingPageId,
  )
  return reply.status(202).send({ data })
}

export async function listLandingPageVersions(request: any, reply: any) {
  const data = await landingPageService.listVersions(
    request.user.businessId,
    request.params.landingPageId,
    request.query,
  )
  return reply.send(data)
}

export async function previewLandingPage(request: any, reply: any) {
  const result = await landingPageService.export(
    request.user.businessId,
    request.params.landingPageId,
  )
  return reply.header('Cache-Control', 'no-store').type('text/html').send(result.html)
}

export async function exportLandingPage(request: any, reply: any) {
  const result = await landingPageService.export(
    request.user.businessId,
    request.params.landingPageId,
  )
  return reply.send({ data: result })
}

export async function getLandingPagePerformance(request: any, reply: any) {
  const data = await landingPageService.performance(
    request.user.businessId,
    request.params.landingPageId,
  )
  return reply.send({ data })
}

// Public — no request.user.
export async function recordLandingPageFormStart(request: any, reply: any) {
  await submissionService.recordFormStart(request.params.landingPageId)
  return reply.send({ data: null })
}

// Public — no request.user.
export async function submitLandingPageForm(request: any, reply: any) {
  const result = await submissionService.submit(request.params.landingPageId, request.body)
  return reply.status(201).send({ data: result })
}

// Public — no request.user. Returns raw HTML, not the { data } JSON envelope.
export async function servePublishedLandingPage(request: any, reply: any) {
  const htmlResult = await renderService.serve(request.params.slug, {
    sessionId: request.query.sid ?? request.cookies?.lp_sid,
    referrer: request.headers.referer,
    utmSource: request.query.utm_source,
    utmMedium: request.query.utm_medium,
    utmCampaign: request.query.utm_campaign,
  })
  reply.setCookie('lp_sid', htmlResult.sidToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return reply.type('text/html').send(htmlResult.html)
}
