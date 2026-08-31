import { BusinessService } from '../services/BusinessService'

const businessService = new BusinessService()

export async function getBusiness(request: any, reply: any) {
  const data = await businessService.get(request.user.businessId)
  return reply.send({ data })
}

export async function updateBusiness(request: any, reply: any) {
  const data = await businessService.update(request.user.businessId, request.body)
  return reply.send({ data })
}
