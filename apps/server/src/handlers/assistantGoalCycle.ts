import { AssistantGoalCycleService } from '../services/AssistantGoalCycleService'
import { flattenAssistantAction, type AssistantAction } from '../lib/assistantActions'

const assistantGoalCycleService = new AssistantGoalCycleService()

function toResponse(action: AssistantAction | null) {
  return { data: action ? flattenAssistantAction(action, null) : null }
}

export async function answerAssistantLearnQuestion(request: any, reply: any) {
  const data = await assistantGoalCycleService.answer(request.user.businessId, request.body)
  return reply.send(toResponse(data))
}

export async function scheduleAssistantPlan(request: any, reply: any) {
  const data = await assistantGoalCycleService.schedulePlan(
    request.user.businessId,
    request.body.cycleId,
  )
  return reply.send(toResponse(data))
}

export async function reviewAssistantGoalCycle(request: any, reply: any) {
  const data = await assistantGoalCycleService.review(
    request.user.businessId,
    request.body.cycleId,
    request.body.manualOutcome,
  )
  return reply.send(toResponse(data))
}

export async function growAssistantGoalCycle(request: any, reply: any) {
  const data = await assistantGoalCycleService.grow(
    request.user.businessId,
    request.body.cycleId,
    request.body.direction,
  )
  return reply.send(toResponse(data))
}

export async function dismissAssistantSignal(request: any, reply: any) {
  await assistantGoalCycleService.dismissSignal(
    request.user.businessId,
    request.body.cycleId,
    request.body.signalKey,
  )
  return reply.send({ data: { ok: true } })
}
