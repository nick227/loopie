import { AffiliateCatalogService } from '../services/AffiliateCatalogService'
import { requireAdmin } from '../lib/affiliateRoles'

const catalog = new AffiliateCatalogService()

export async function listAffiliateClasses(request: any, reply: any) {
  requireAdmin(request.user)
  return reply.send(await catalog.listClasses(request.user.businessId, request.query))
}

export async function createAffiliateClass(request: any, reply: any) {
  requireAdmin(request.user)
  const row = await catalog.createClass(request.user.businessId, request.body)
  return reply.status(201).send({ data: row })
}

export async function getAffiliateClass(request: any, reply: any) {
  requireAdmin(request.user)
  return reply.send({ data: await catalog.getClass(request.user.businessId, request.params.classId) })
}

export async function updateAffiliateClass(request: any, reply: any) {
  requireAdmin(request.user)
  const row = await catalog.updateClass(request.user.businessId, request.params.classId, request.body)
  return reply.send({ data: row })
}

export async function listAffiliateDeals(request: any, reply: any) {
  requireAdminOrAffiliateForDeals(request.user)
  return reply.send(await catalog.listDeals(request.user.businessId, request.query))
}

export async function createAffiliateDeal(request: any, reply: any) {
  requireAdmin(request.user)
  const row = await catalog.createDeal(request.user.businessId, request.body)
  return reply.status(201).send({ data: row })
}

export async function getAffiliateDeal(request: any, reply: any) {
  requireAdmin(request.user)
  return reply.send({ data: await catalog.getDeal(request.user.businessId, request.params.dealId) })
}

export async function updateAffiliateDeal(request: any, reply: any) {
  requireAdmin(request.user)
  const row = await catalog.updateDeal(request.user.businessId, request.params.dealId, request.body)
  return reply.send({ data: row })
}

function requireAdminOrAffiliateForDeals(user: { role: string }) {
  if (user.role !== 'ADMIN' && user.role !== 'AFFILIATE') throw { statusCode: 403, message: 'Forbidden' }
}
