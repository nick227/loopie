import { ActivityService } from '../services/ActivityService'

const activityService = new ActivityService()

export async function getActivityStream(request: any, reply: any) {
  const data = await activityService.getActivityStream(request.user.businessId, request.query)
  return reply.send(data)
}

export async function getActivityHealth(request: any, reply: any) {
  const data = await activityService.getHealth(request.user.businessId)
  return reply.send(data)
}

export async function getActivityCheckpoint(request: any, reply: any) {
  const data = await activityService.getCheckpoint(request.user.businessId)
  return reply.send(data)
}

export async function getActivityItem(request: any, reply: any) {
  const data = await activityService.getActivityItem(
    request.user.businessId,
    request.params.activityId,
  )
  return reply.send({ data })
}

export async function updateAttentionItem(request: any, reply: any) {
  const data = await activityService.updateAttentionItem(
    request.user.businessId,
    request.params.attentionId,
    request.body,
  )
  return reply.send({ data })
}
