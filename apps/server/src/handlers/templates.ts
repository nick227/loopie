import { TemplateService } from '../services/TemplateService'

const templateService = new TemplateService()

export async function listTemplates(request: any, reply: any) {
  const data = await templateService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createTemplate(request: any, reply: any) {
  const template = await templateService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: template })
}

export async function getTemplate(request: any, reply: any) {
  const template = await templateService.get(request.user.businessId, request.params.templateId)
  return reply.send({ data: template })
}

export async function updateTemplate(request: any, reply: any) {
  const template = await templateService.update(request.user.businessId, request.params.templateId, request.body)
  return reply.send({ data: template })
}

export async function deleteTemplate(request: any, reply: any) {
  await templateService.delete(request.user.businessId, request.params.templateId)
  return reply.send({ data: null })
}
