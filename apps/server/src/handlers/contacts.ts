import { ContactService } from '../services/ContactService'

const contactService = new ContactService()

export async function listContacts(request: any, reply: any) {
  const data = await contactService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createContact(request: any, reply: any) {
  const contact = await contactService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: contact })
}

export async function importContacts(request: any, reply: any) {
  const result = await contactService.importMany(request.user.businessId, request.body.contacts)
  return reply.send({ data: result })
}

export async function getContact(request: any, reply: any) {
  const contact = await contactService.get(request.user.businessId, request.params.contactId)
  return reply.send({ data: contact })
}

export async function updateContact(request: any, reply: any) {
  const contact = await contactService.update(request.user.businessId, request.params.contactId, request.body)
  return reply.send({ data: contact })
}

export async function deleteContact(request: any, reply: any) {
  await contactService.delete(request.user.businessId, request.params.contactId)
  return reply.send({ data: null })
}

export async function listContactInteractions(request: any, reply: any) {
  const data = await contactService.listInteractions(request.user.businessId, request.params.contactId, request.query)
  return reply.send(data)
}
