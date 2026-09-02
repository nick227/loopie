import { AdvertisementService } from '../services/AdvertisementService'
import { AdRunService } from '../services/AdRunService'

const advertisements = new AdvertisementService()
const adRuns = new AdRunService()

export async function listAdvertisements(request: any, reply: any) {
  const data = await advertisements.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createAdvertisement(request: any, reply: any) {
  const advertisement = await advertisements.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: advertisement })
}

export async function getAdvertisement(request: any, reply: any) {
  const advertisement = await advertisements.get(
    request.user.businessId,
    request.params.advertisementId,
  )
  return reply.send({ data: advertisement })
}

export async function updateAdvertisement(request: any, reply: any) {
  const advertisement = await advertisements.update(
    request.user.businessId,
    request.params.advertisementId,
    request.body,
  )
  return reply.send({ data: advertisement })
}

export async function deleteAdvertisement(request: any, reply: any) {
  await advertisements.delete(request.user.businessId, request.params.advertisementId)
  return reply.send({ data: null })
}

export async function publishAdvertisement(request: any, reply: any) {
  const version = await advertisements.publish(
    request.user.businessId,
    request.params.advertisementId,
    request.body,
    request.user.id,
  )
  return reply.send({ data: version })
}

export async function listAdRuns(request: any, reply: any) {
  const data = await adRuns.list(
    request.user.businessId,
    request.params.advertisementId,
    request.query,
  )
  return reply.send(data)
}

export async function createAdRun(request: any, reply: any) {
  const adRun = await adRuns.createAndProvision(
    request.user.businessId,
    request.params.advertisementId,
    request.body,
    request.user.id,
  )
  return reply.status(201).send({ data: adRun })
}

export async function getAdRun(request: any, reply: any) {
  const adRun = await adRuns.get(request.user.businessId, request.params.adRunId)
  return reply.send({ data: adRun })
}

export async function updateAdRun(request: any, reply: any) {
  const adRun = await adRuns.update(request.user.businessId, request.params.adRunId, request.body)
  return reply.send({ data: adRun })
}

export async function deleteAdRun(request: any, reply: any) {
  const data = await adRuns.delete(request.user.businessId, request.params.adRunId)
  return reply.send({ data })
}

export async function pauseAdRun(request: any, reply: any) {
  const adRun = await adRuns.pause(request.user.businessId, request.params.adRunId)
  return reply.send({ data: adRun })
}

export async function resumeAdRun(request: any, reply: any) {
  const adRun = await adRuns.resume(request.user.businessId, request.params.adRunId)
  return reply.send({ data: adRun })
}

export async function endAdRun(request: any, reply: any) {
  const adRun = await adRuns.end(request.user.businessId, request.params.adRunId)
  return reply.send({ data: adRun })
}

export async function syncAdRun(request: any, reply: any) {
  const adRun = await adRuns.sync(request.user.businessId, request.params.adRunId)
  return reply.send({ data: adRun })
}

export async function updateAdRunBudget(request: any, reply: any) {
  const adRun = await adRuns.updateBudget(
    request.user.businessId,
    request.params.adRunId,
    request.body,
    request.user.id,
  )
  return reply.send({ data: adRun })
}

export async function updateAdRunSchedule(request: any, reply: any) {
  const adRun = await adRuns.updateSchedule(
    request.user.businessId,
    request.params.adRunId,
    request.body,
    request.user.id,
  )
  return reply.send({ data: adRun })
}

export async function updateAdRunTargeting(request: any, reply: any) {
  const adRun = await adRuns.updateTargeting(
    request.user.businessId,
    request.params.adRunId,
    request.body,
    request.user.id,
  )
  return reply.send({ data: adRun })
}

export async function replaceAdRunCreative(request: any, reply: any) {
  const adRun = await adRuns.replaceCreative(
    request.user.businessId,
    request.params.adRunId,
    request.body ?? {},
    request.user.id,
  )
  return reply.code(201).send({ data: adRun })
}

export async function replaceAdRunDestination(request: any, reply: any) {
  const adRun = await adRuns.replaceDestination(
    request.user.businessId,
    request.params.adRunId,
    request.body,
    request.user.id,
  )
  return reply.code(201).send({ data: adRun })
}
