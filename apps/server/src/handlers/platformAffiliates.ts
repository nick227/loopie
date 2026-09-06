import type { FastifyRequest, FastifyReply } from 'fastify'
import { requireSiteAdmin } from '../lib/membership'
import { PlatformAffiliateService } from '../services/PlatformAffiliateService'
import type { AuthUser } from '../lib/membership'

const service = new PlatformAffiliateService()

export async function listPlatformAffiliates(request: FastifyRequest, reply: FastifyReply) {
  requireSiteAdmin((request as any).user)
  const result = await service.listAffiliates()
  reply.send(result)
}

export async function getPlatformAffiliate(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.getAffiliate(request.params.id)
  reply.send(result)
}

export async function createPlatformAffiliate(
  request: FastifyRequest<{
    Body: {
      name: string
      email?: string
      referralCode?: string
      classId?: string
      dealId?: string
      managerId?: string
      userId?: string
    }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.createAffiliate(request.body)
  reply.status(201).send(result)
}

export async function updatePlatformAffiliate(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.updateAffiliate(request.params.id, request.body as any)
  reply.send(result)
}

export async function listPlatformDeals(request: FastifyRequest, reply: FastifyReply) {
  requireSiteAdmin((request as any).user)
  const result = await service.listDeals()
  reply.send(result)
}

export async function createPlatformDeal(
  request: FastifyRequest<{
    Body: { name: string; classId?: string; affiliateRateBps?: number; managerShareBps: number }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.createDeal(request.body)
  reply.status(201).send(result)
}

export async function listPlatformClasses(request: FastifyRequest, reply: FastifyReply) {
  requireSiteAdmin((request as any).user)
  const result = await service.listClasses()
  reply.send(result)
}

export async function getBusinessAttribution(
  request: FastifyRequest<{ Params: { businessId: string } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.getAttributionForBusiness(request.params.businessId)
  reply.send(result)
}

export async function setBusinessAttribution(
  request: FastifyRequest<{ Params: { businessId: string }; Body: { affiliateId: string } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.setBusinessAttribution(
    request.params.businessId,
    request.body.affiliateId,
  )
  reply.send(result)
}

export async function getMyPlatformAffiliate(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user as AuthUser
  if (user.platformRole !== 'AFFILIATE') throw { statusCode: 403, message: 'Forbidden' }
  // Look up by userId
  const affiliates = await service.listAffiliates()
  const myAffiliate = affiliates.data.find((a) => a.userId === user.id)
  if (!myAffiliate) throw { statusCode: 404, message: 'Platform affiliate not found' }
  reply.send({ data: myAffiliate })
}

export async function getPlatformAffiliateOverview(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user as AuthUser
  if (user.platformRole !== 'AFFILIATE') throw { statusCode: 403, message: 'Forbidden' }
  const result = await service.getAffiliateOverview(user.id)
  reply.send(result)
}

export async function getPlatformAffiliateClients(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user as AuthUser
  if (user.platformRole !== 'AFFILIATE') throw { statusCode: 403, message: 'Forbidden' }
  const result = await service.getAffiliateClients(user.id)
  reply.send(result)
}

export async function adminListPlatformAffiliatePayouts(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.listPayouts()
  reply.send(result)
}

export async function adminCreatePlatformAffiliatePayout(
  request: FastifyRequest<{ Body: { affiliateId: string; earningIds: string[] } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.createPayout(request.body)
  reply.status(201).send(result)
}

export async function adminSettlePlatformAffiliatePayout(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.settlePayout(request.params.id)
  reply.send(result)
}

export async function adminGetPayableEarningsSummary(request: FastifyRequest, reply: FastifyReply) {
  requireSiteAdmin((request as any).user)
  const result = await service.getPayableEarningsSummary()
  reply.send(result)
}

export async function adminGetMoneyFlowLedger(
  request: FastifyRequest<{ Querystring: { cursor?: string } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.getMoneyFlowLedger(request.query.cursor)
  reply.send(result)
}
