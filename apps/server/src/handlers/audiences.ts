import { AudienceService } from '../services/AudienceService'

const audienceService = new AudienceService()

export async function listAudiences(request: any, reply: any) {
  const data = await audienceService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createAudience(request: any, reply: any) {
  const audience = await audienceService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: audience })
}

export async function getAudience(request: any, reply: any) {
  const audience = await audienceService.get(request.user.businessId, request.params.audienceId)
  return reply.send({ data: audience })
}

export async function updateAudience(request: any, reply: any) {
  const audience = await audienceService.update(request.user.businessId, request.params.audienceId, request.body)
  return reply.send({ data: audience })
}

export async function deleteAudience(request: any, reply: any) {
  await audienceService.delete(request.user.businessId, request.params.audienceId)
  return reply.send({ data: null })
}

export async function listAudienceContacts(request: any, reply: any) {
  const data = await audienceService.listContacts(request.user.businessId, request.params.audienceId, request.query)
  return reply.send(data)
}
