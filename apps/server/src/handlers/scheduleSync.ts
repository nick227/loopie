import { ScheduleSyncService } from '../services/ScheduleSyncService'

const scheduleSync = new ScheduleSyncService()

export async function getScheduleSyncTarget(request: any, reply: any) {
  return reply.send({
    data: await scheduleSync.get(request.user.businessId, request.params.integrationId),
  })
}

export async function createScheduleSyncTarget(request: any, reply: any) {
  return reply.send({
    data: await scheduleSync.create(
      request.user.businessId,
      request.params.integrationId,
      request.body,
    ),
  })
}

export async function deleteScheduleSyncTarget(request: any, reply: any) {
  await scheduleSync.delete(request.user.businessId, request.params.integrationId)
  return reply.status(204).send()
}

export async function syncScheduleNow(request: any, reply: any) {
  return reply.send({
    data: await scheduleSync.syncForBusiness(request.user.businessId, request.params.integrationId),
  })
}
