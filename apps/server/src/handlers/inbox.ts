import { InboxService } from '../services/InboxService'
import { InternalMessagingService } from '../services/InternalMessagingService'

const inbox = new InboxService()
const internalMessaging = new InternalMessagingService()

export async function listInboxThreads(request: any, reply: any) {
  const data = await inbox.list(request.user.businessId, request.query)
  return reply.send(data)
}

export async function getInboxThread(request: any, reply: any) {
  const data = await inbox.get(request.user.businessId, request.params.threadId)
  return reply.send({ data })
}

export async function markInboxThreadRead(request: any, reply: any) {
  const data = await inbox.markRead(request.user.businessId, request.params.threadId)
  return reply.send({ data })
}

export async function replyToInboxThread(request: any, reply: any) {
  const data = await internalMessaging.reply(
    request.user.businessId,
    request.params.threadId,
    request.body.body,
  )
  return reply.status(201).send({ data })
}
