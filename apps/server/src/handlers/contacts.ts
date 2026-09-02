import { ContactService } from '../services/ContactService'
import { ContactNoteService } from '../services/ContactNoteService'
import { SaleService } from '../services/SaleService'
import { ContactTagService } from '../services/ContactTagService'

const contactService = new ContactService()
const contactNoteService = new ContactNoteService()
const saleService = new SaleService()
const contactTagService = new ContactTagService()

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
  const contact = await contactService.update(
    request.user.businessId,
    request.params.contactId,
    request.body,
  )
  return reply.send({ data: contact })
}

export async function deleteContact(request: any, reply: any) {
  await contactService.delete(request.user.businessId, request.params.contactId)
  return reply.send({ data: null })
}

export async function listContactInteractions(request: any, reply: any) {
  const data = await contactService.listInteractions(
    request.user.businessId,
    request.params.contactId,
    request.query,
  )
  return reply.send(data)
}

export async function logContactActivity(request: any, reply: any) {
  const interaction = await contactService.logActivity(
    request.user.businessId,
    request.params.contactId,
    request.body,
  )
  return reply.status(201).send({ data: interaction })
}

export async function listContactNotes(request: any, reply: any) {
  const data = await contactNoteService.list(
    request.user.businessId,
    request.params.contactId,
    request.query,
  )
  return reply.send(data)
}

export async function createContactNote(request: any, reply: any) {
  const note = await contactNoteService.create(
    request.user.businessId,
    request.params.contactId,
    request.user.id,
    request.body.body,
  )
  return reply.status(201).send({ data: note })
}

export async function updateContactNote(request: any, reply: any) {
  const note = await contactNoteService.update(
    request.user.businessId,
    request.params.contactId,
    request.params.noteId,
    request.body,
  )
  return reply.send({ data: note })
}

export async function deleteContactNote(request: any, reply: any) {
  await contactNoteService.delete(
    request.user.businessId,
    request.params.contactId,
    request.params.noteId,
  )
  return reply.send({ data: null })
}

export async function listContactSales(request: any, reply: any) {
  const data = await saleService.listForContact(
    request.user.businessId,
    request.params.contactId,
    request.query,
  )
  return reply.send(data)
}

export async function listContactTags(request: any, reply: any) {
  const data = await contactTagService.list(request.user.businessId, request.query)
  return reply.send({ data })
}

export async function createContactTag(request: any, reply: any) {
  const tag = await contactTagService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: tag })
}

export async function updateContactTag(request: any, reply: any) {
  const tag = await contactTagService.update(
    request.user.businessId,
    request.params.tagId,
    request.body,
  )
  return reply.send({ data: tag })
}

export async function assignContactTag(request: any, reply: any) {
  const tag = await contactTagService.assign(
    request.user.businessId,
    request.params.contactId,
    request.body,
  )
  return reply.send({ data: tag })
}

export async function unassignContactTag(request: any, reply: any) {
  await contactTagService.unassign(
    request.user.businessId,
    request.params.contactId,
    request.params.tagId,
  )
  return reply.send({ data: null })
}
