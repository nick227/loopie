import { CreativeService } from '../services/CreativeService'

const creativeService = new CreativeService()

export async function listCreatives(request: any, reply: any) {
  const data = await creativeService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createCreative(request: any, reply: any) {
  const creative = await creativeService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: creative })
}

export async function getCreative(request: any, reply: any) {
  const creative = await creativeService.get(request.user.businessId, request.params.creativeId)
  return reply.send({ data: creative })
}

export async function updateCreative(request: any, reply: any) {
  const creative = await creativeService.update(request.user.businessId, request.params.creativeId, request.body)
  return reply.send({ data: creative })
}

export async function deleteCreative(request: any, reply: any) {
  await creativeService.delete(request.user.businessId, request.params.creativeId)
  return reply.send({ data: null })
}
