import { ActivitySavedViewService } from '../services/ActivitySavedViewService'

const activitySavedViewService = new ActivitySavedViewService()

export async function getActivitySavedViews(request: any, reply: any) {
  const data = await activitySavedViewService.getSavedViews(
    request.user.businessId,
    request.user.id,
  )
  return reply.send({ data })
}

export async function createActivitySavedView(request: any, reply: any) {
  const data = await activitySavedViewService.createSavedView(
    request.user.businessId,
    request.user.id,
    request.body.name,
    request.body.filters,
  )
  return reply.status(201).send({ data })
}

export async function updateActivitySavedView(request: any, reply: any) {
  const data = await activitySavedViewService.updateSavedView(
    request.params.viewId,
    request.user.businessId,
    request.user.id,
    request.body.name,
  )
  return reply.send({ data })
}

export async function deleteActivitySavedView(request: any, reply: any) {
  await activitySavedViewService.deleteSavedView(
    request.params.viewId,
    request.user.businessId,
    request.user.id,
  )
  return reply.send({})
}
