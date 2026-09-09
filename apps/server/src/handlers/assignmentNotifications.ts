import { db } from '@project/db'

export async function listAssignmentNotifications(request: any, reply: any) {
  const where = { businessId: request.user.businessId, recipientUserId: request.user.id }
  const [rows, unreadCount] = await db.$transaction([
    db.assignmentNotification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      include: { goal: { select: { scheduledFor: true } } },
    }),
    db.assignmentNotification.count({ where: { ...where, readAt: null } }),
  ])
  return reply.send({
    data: rows.map(({ goal, ...row }) => ({
      ...row,
      scheduledFor: row.scheduledFor?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      taskScheduledFor: goal.scheduledFor?.toISOString() ?? null,
    })),
    unreadCount,
  })
}

export async function markAssignmentNotificationRead(request: any, reply: any) {
  const where = {
    id: request.params.notificationId,
    businessId: request.user.businessId,
    recipientUserId: request.user.id,
  }
  const row = await db.assignmentNotification.findFirst({ where })
  if (!row) return reply.status(404).send({ error: 'Assignment notification not found' })
  await db.assignmentNotification.updateMany({
    where: { ...where, readAt: null },
    data: { readAt: new Date() },
  })
  return reply.status(204).send()
}
