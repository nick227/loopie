import { AssistantService } from '../services/AssistantService'

const assistantService = new AssistantService()

export async function getNextStep(request: any, reply: any) {
  const data = await assistantService.getNextStep(request.user.businessId)
  return reply.send({ data })
}
