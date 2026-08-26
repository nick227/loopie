import { MessageService } from '../services/MessageService'

const messageService = new MessageService()

export async function listMessages(request: any, reply: any) {
  const data = await messageService.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function createMessage(request: any, reply: any) {
  const message = await messageService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: message })
}

export async function getMessage(request: any, reply: any) {
  const message = await messageService.get(request.user.businessId, request.params.messageId)
  return reply.send({ data: message })
}

export async function updateMessage(request: any, reply: any) {
  const message = await messageService.update(request.user.businessId, request.params.messageId, request.body)
  return reply.send({ data: message })
}

export async function deleteMessage(request: any, reply: any) {
  await messageService.delete(request.user.businessId, request.params.messageId)
  return reply.send({ data: null })
}

export async function sendMessage(request: any, reply: any) {
  const message = await messageService.send(request.user.businessId, request.params.messageId)
  return reply.send({ data: message })
}

export async function testSendMessage(request: any, reply: any) {
  await messageService.testSend(request.user.businessId, request.params.messageId, request.body)
  return reply.send({ data: null })
}

export async function getMessagePerformance(request: any, reply: any) {
  const data = await messageService.performance(request.user.businessId, request.params.messageId)
  return reply.send({ data })
}
