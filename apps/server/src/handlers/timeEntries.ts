import { TimeEntryService } from '../services/TimeEntryService'

const timeEntryService = new TimeEntryService()

export async function getCurrentTimeEntry(request: any, reply: any) {
  const data = await timeEntryService.getCurrent(request.user.id)
  return reply.send(data)
}

export async function startTimeEntry(request: any, reply: any) {
  try {
    const data = await timeEntryService.start(
      request.user.businessId,
      request.user.id,
      request.body ?? {},
    )
    return reply.status(201).send(data)
  } catch (error: any) {
    // The generic error handler only ever flattens a thrown error to { error: message } — this
    // one case needs a machine-readable code plus the conflicting entry, so it's shaped here
    // rather than by extending shared infra for a single caller (same local-catch precedent as
    // handlers/siteInbox.ts's duplicate-submission 409).
    if (error?.statusCode === 409 && error.activeEntry) {
      return reply
        .status(409)
        .send({ error: error.message, code: error.code, data: error.activeEntry })
    }
    throw error
  }
}

export async function stopCurrentTimeEntry(request: any, reply: any) {
  const data = await timeEntryService.stop(request.user.id, request.body ?? {})
  return reply.send(data)
}
