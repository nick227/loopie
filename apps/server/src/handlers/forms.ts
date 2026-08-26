import { FormService } from '../services/FormService'

const formService = new FormService()

export async function listForms(request: any, reply: any) {
  const data = await formService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createForm(request: any, reply: any) {
  const form = await formService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: form })
}

export async function getForm(request: any, reply: any) {
  const form = await formService.get(request.user.businessId, request.params.formId)
  return reply.send({ data: form })
}

export async function updateForm(request: any, reply: any) {
  const form = await formService.update(request.user.businessId, request.params.formId, request.body)
  return reply.send({ data: form })
}

export async function deleteForm(request: any, reply: any) {
  await formService.delete(request.user.businessId, request.params.formId)
  return reply.send({ data: null })
}
