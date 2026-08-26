import { AdUnitService } from '../services/AdUnitService'

const adUnitService = new AdUnitService()

export async function listAdUnits(request: any, reply: any) {
  const data = await adUnitService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createAdUnit(request: any, reply: any) {
  const adUnit = await adUnitService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: adUnit })
}

export async function getAdUnit(request: any, reply: any) {
  const adUnit = await adUnitService.get(request.user.businessId, request.params.adUnitId)
  return reply.send({ data: adUnit })
}

export async function updateAdUnit(request: any, reply: any) {
  const adUnit = await adUnitService.update(request.user.businessId, request.params.adUnitId, request.body)
  return reply.send({ data: adUnit })
}
