import { CalendarService } from '../services/CalendarService'

const calendarService = new CalendarService()

export async function getCalendarBoard(request: any, reply: any) {
  const data = await calendarService.getBoard(
    request.user.businessId,
    Number(request.query?.utcOffsetMinutes ?? 0),
  )
  return reply.send(data)
}

export async function listCalendarGoalsInRange(request: any, reply: any) {
  const data = await calendarService.listGoalsInRange(
    request.user.businessId,
    new Date(request.query.from),
    new Date(request.query.to),
  )
  return reply.send(data)
}

export async function createGoalIdea(request: any, reply: any) {
  const data = await calendarService.createIdea(request.user.businessId, request.body?.title)
  return reply.status(201).send(data)
}

export async function scheduleGoalIdea(request: any, reply: any) {
  const data = await calendarService.scheduleIdea(
    request.user.businessId,
    request.params.templateId,
    request.body ?? {},
  )
  return reply.status(201).send(data)
}

export async function dismissGoalIdea(request: any, reply: any) {
  const data = await calendarService.dismissIdea(request.user.businessId, request.params.templateId)
  return reply.send(data)
}

export async function updateScheduledGoal(request: any, reply: any) {
  const data = await calendarService.updateGoal(
    request.user.businessId,
    request.params.goalId,
    request.body ?? {},
  )
  return reply.send(data)
}
