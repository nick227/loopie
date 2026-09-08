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

export async function createPlatformClass(
  request: FastifyRequest<{ Body: { name: string; defaultDealId?: string } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.createClass(request.body)
  reply.status(201).send(result)
}

export async function updatePlatformClass(
  request: FastifyRequest<{ Params: { id: string }; Body: { defaultDealId?: string | null } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.updateClass(request.params.id, request.body)
  reply.send(result)
}

export async function setDefaultPlatformClass(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.setDefaultClass(request.params.id)
  reply.send(result)
}

export async function listPlatformAffiliateAttributions(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.listAttributions()
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
  request: FastifyRequest<{
    Params: { businessId: string }
    Body: { affiliateId: string; force?: boolean }
  }>,
  reply: FastifyReply,
) {
  const user = (request as any).user as AuthUser
  requireSiteAdmin(user)
  const result = await service.setBusinessAttribution(
    request.params.businessId,
    request.body.affiliateId,
    { actor: user, force: request.body.force },
  )
  reply.send(result)
}

// Every authenticated user has (or is lazily given) their own PlatformAffiliate record — see
// PlatformAffiliateService.getOrCreateForUser. This is no longer gated to platformRole=AFFILIATE,
// which remains a separate, affiliate-only account flavor with its own portal.
export async function getMyPlatformAffiliate(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user as AuthUser
  const affiliate = await service.getOrCreateForUser(user)
  reply.send({ data: affiliate })
}

export async function getPlatformAffiliateOverview(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user as AuthUser
  const result = await service.getAffiliateOverview(user)
  reply.send(result)
}

export async function getPlatformAffiliateClients(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user as AuthUser
  const result = await service.getAffiliateClients(user)
  reply.send(result)
}

export async function getMyPlatformAffiliateLedger(
  request: FastifyRequest<{ Querystring: { cursor?: string; limit?: number } }>,
  reply: FastifyReply,
) {
  const user = (request as any).user as AuthUser
  const result = await service.getAffiliateLedger(user, request.query)
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

export async function adminFailPlatformAffiliatePayout(
  request: FastifyRequest<{
    Params: { id: string }
    Body: { outcome: 'FAILED' | 'REVERSED'; reason?: string }
  }>,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.failPayout(
    request.params.id,
    request.body.outcome,
    request.body.reason,
  )
  reply.send(result)
}

export async function adminGetPlatformAffiliateReconciliation(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  requireSiteAdmin((request as any).user)
  const result = await service.getReconciliation()
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
