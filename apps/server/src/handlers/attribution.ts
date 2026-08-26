import { AttributionService } from '../services/AttributionService'

const attributionService = new AttributionService()

export async function trackDeploymentClick(request: any, reply: any) {
  const { redirectUrl } = await attributionService.trackClick(
    request.params.deploymentId,
    request.query.sid,
  )
  return reply.redirect(302, redirectUrl)
}

export async function trackAffiliateClick(request: any, reply: any) {
  const { redirectUrl } = await attributionService.trackAffiliateClick(
    request.params.affiliateId,
    request.query.sid,
  )
  return reply.redirect(302, redirectUrl)
}

export async function submitLeadForm(request: any, reply: any) {
  const result = await attributionService.submitForm(request.body)
  return reply.status(201).send({ data: result })
}
