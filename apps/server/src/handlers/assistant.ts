import { AssistantService } from '../services/AssistantService'

const assistantService = new AssistantService()

export async function getNextAction(request: any, reply: any) {
  const data = await assistantService.getNextAction(request.user.businessId)
  return reply.send({ data })
}
