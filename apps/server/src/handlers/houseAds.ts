import { HouseAdService } from '../services/HouseAdService'

const houseAdsService = new HouseAdService()

function assertSiteAdmin(request: any) {
  if (request.user?.platformRole !== 'SITE_ADMIN' && request.user?.platformRole !== 'SUPER_ADMIN') {
    throw new Error('Forbidden: Site Admin only')
  }
}

export async function adminListHouseAds(request: any, reply: any) {
  assertSiteAdmin(request)
  const data = await houseAdsService.list(request.query)
  return reply.send({ data })
}

export async function adminSearchAdvertisements(request: any, reply: any) {
  assertSiteAdmin(request)
  const query = request.query.query || ''
  const data = await houseAdsService.searchAdvertisements(query)
  return reply.send({ data })
}

export async function adminCreateHouseAd(request: any, reply: any) {
  assertSiteAdmin(request)
  const ad = await houseAdsService.create(request.body)
  return reply.status(201).send({ data: ad })
}

export async function adminUpdateHouseAd(request: any, reply: any) {
  assertSiteAdmin(request)
  const ad = await houseAdsService.update(request.params.id, request.body)
  return reply.send({ data: ad })
}

export async function adminDeleteHouseAd(request: any, reply: any) {
  assertSiteAdmin(request)
  await houseAdsService.delete(request.params.id)
  return reply.send({})
}

export async function serveHouseAd(request: any, reply: any) {
  const ad = await houseAdsService.serveAd(request.query.zone)
  return reply.send({ data: ad })
}

export async function trackHouseAdMetric(request: any, reply: any) {
  await houseAdsService.trackMetric(request.params.id, request.body.zone, request.body.type)
  return reply.send({})
}
