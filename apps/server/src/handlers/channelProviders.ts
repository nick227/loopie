import { ChannelProviderService } from '../services/ChannelProviderService'

const channelProviderService = new ChannelProviderService()

export async function listChannelProviders(request: any, reply: any) {
  const data = await channelProviderService.list(request.user.businessId, request.query)
  return reply.send({ data })
}

export async function createChannelProvider(request: any, reply: any) {
  const provider = await channelProviderService.create(request.user.businessId, request.body)
  return reply.status(201).send({ data: provider })
}

export async function updateChannelProvider(request: any, reply: any) {
  const provider = await channelProviderService.update(
    request.user.businessId,
    request.params.providerId,
    request.body,
  )
  return reply.send({ data: provider })
}
