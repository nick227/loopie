import { AutomationService } from '../services/AutomationService'

const automationService = new AutomationService()

export async function listAutomations(request: any, reply: any) {
  const data = await automationService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createAutomation(request: any, reply: any) {
  const automation = await automationService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: automation })
}

export async function getAutomation(request: any, reply: any) {
  const automation = await automationService.get(request.user.businessId, request.params.automationId)
  return reply.send({ data: automation })
}

export async function updateAutomation(request: any, reply: any) {
  const automation = await automationService.update(request.user.businessId, request.params.automationId, request.body)
  return reply.send({ data: automation })
}

export async function pauseAutomation(request: any, reply: any) {
  const automation = await automationService.pause(request.user.businessId, request.params.automationId)
  return reply.send({ data: automation })
}

export async function resumeAutomation(request: any, reply: any) {
  const automation = await automationService.resume(request.user.businessId, request.params.automationId)
  return reply.send({ data: automation })
}

export async function listAutomationLogs(request: any, reply: any) {
  const data = await automationService.logs(request.user.businessId, request.params.automationId, request.query)
  return reply.send(data)
}
