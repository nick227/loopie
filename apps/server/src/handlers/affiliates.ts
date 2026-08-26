import { AffiliateService } from '../services/AffiliateService'
import { AffiliateEarningsService } from '../services/AffiliateEarningsService'
import { StripeConnectService } from '../services/StripeConnectService'
import { requireAdmin, requireAdminOrAffiliate, requireAffiliate } from '../lib/affiliateRoles'

const affiliateService = new AffiliateService()
const earningsService = new AffiliateEarningsService()
const connect = new StripeConnectService()

export async function listAffiliates(request: any, reply: any) {
  requireAdminOrAffiliate(request.user)
  const data = await affiliateService.list(request.user, request.query)
  return reply.send(data)
}

export async function createAffiliate(request: any, reply: any) {
  requireAdmin(request.user)
  const affiliate = await affiliateService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: affiliate })
}

export async function getMyAffiliate(request: any, reply: any) {
  requireAffiliate(request.user)
  const affiliate = await affiliateService.me(request.user)
  return reply.send({ data: affiliate })
}

export async function getAffiliate(request: any, reply: any) {
  requireAdminOrAffiliate(request.user)
  const affiliate = await affiliateService.get(request.user, request.params.affiliateId)
  return reply.send({ data: affiliate })
}

export async function updateAffiliate(request: any, reply: any) {
  requireAdminOrAffiliate(request.user)
  const affiliate = await affiliateService.update(request.user, request.params.affiliateId, request.body)
  return reply.send({ data: affiliate })
}

export async function pauseAffiliate(request: any, reply: any) {
  requireAdmin(request.user)
  const affiliate = await affiliateService.pause(request.user.businessId, request.params.affiliateId)
  return reply.send({ data: affiliate })
}

export async function resumeAffiliate(request: any, reply: any) {
  requireAdmin(request.user)
  const affiliate = await affiliateService.resume(request.user.businessId, request.params.affiliateId)
  return reply.send({ data: affiliate })
}

export async function getAffiliateEarnings(request: any, reply: any) {
  requireAdminOrAffiliate(request.user)
  const earnings = await earningsService.get(request.user, request.params.affiliateId)
  return reply.send({ data: earnings })
}

export async function createAffiliateConnectOnboarding(request: any, reply: any) {
  requireAdminOrAffiliate(request.user)
  const session = await connect.createOnboardingLink(request.user, request.params.affiliateId)
  return reply.status(201).send({ data: session })
}

export async function syncAffiliateConnect(request: any, reply: any) {
  requireAdminOrAffiliate(request.user)
  const affiliate = await connect.sync(request.user, request.params.affiliateId)
  return reply.send({ data: affiliate })
}
