import { db } from '@project/db'
import type { TimeEntry } from '@prisma/client'
import { isUniqueConflict } from '../lib/prismaError'

function toDTO(entry: TimeEntry, businessName: string) {
  return {
    id: entry.id,
    businessId: entry.businessId,
    businessName,
    scheduledGoalId: entry.scheduledGoalId,
    description: entry.description,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt?.toISOString() ?? null,
  }
}

export class TimeEntryService {
  // The caller's own running entry, globally — not scoped to the active business. See
  // schema.prisma's TimeEntry doc comment for why this is a global, not per-business, invariant.
  async getCurrent(userId: string) {
    const entry = await db.timeEntry.findFirst({
      where: { runningForUserId: userId },
      include: { business: { select: { name: true } } },
    })
    return { data: entry ? toDTO(entry, entry.business.name) : null }
  }

  async start(
    businessId: string,
    userId: string,
    input: { description?: unknown; scheduledGoalId?: string | null },
  ) {
    const description = typeof input.description === 'string' ? input.description.trim() : ''
    if (!description) throw { statusCode: 400, message: 'Say what you are working on' }
    if (description.length > 500) throw { statusCode: 400, message: 'Keep it under 500 characters' }

    if (input.scheduledGoalId) {
      const goal = await db.scheduledGoal.findFirst({
        where: { id: input.scheduledGoalId, businessId },
      })
      if (!goal) throw { statusCode: 404, message: 'Task not found' }
    }

    try {
      const entry = await db.timeEntry.create({
        data: {
          businessId,
          userId,
          scheduledGoalId: input.scheduledGoalId || undefined,
          description,
          runningForUserId: userId,
        },
        include: { business: { select: { name: true } } },
      })
      return { data: toDTO(entry, entry.business.name) }
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
      // Someone (this request, or a second tab racing it) already won — the DB unique index on
      // runningForUserId is the real enforcement, not this check. Surface whichever entry is
      // actually running; never silently stop it or retry as a new one.
      const existing = await db.timeEntry.findFirst({
        where: { runningForUserId: userId },
        include: { business: { select: { name: true } } },
      })
      if (!existing) throw error
      throw {
        statusCode: 409,
        message: 'You already have a running timer',
        code: 'ACTIVE_TIME_ENTRY_EXISTS' as const,
        activeEntry: toDTO(existing, existing.business.name),
      }
    }
  }

  async stop(userId: string, input: { endedAt?: string }) {
    const entry = await db.timeEntry.findFirst({ where: { runningForUserId: userId } })
    if (!entry) throw { statusCode: 404, message: 'Nothing is running' }

    // startedAt is immutable — only endedAt is ever correctable, and only within these bounds.
    let endedAt = new Date()
    if (input.endedAt) {
      const parsed = new Date(input.endedAt)
      if (Number.isNaN(parsed.getTime())) throw { statusCode: 400, message: 'Invalid end time' }
      if (parsed <= entry.startedAt) {
        throw { statusCode: 400, message: 'End time must be after it started' }
      }
      if (parsed > new Date()) {
        throw { statusCode: 400, message: 'End time cannot be in the future' }
      }
      endedAt = parsed
    }

    const updated = await db.timeEntry.update({
      where: { id: entry.id },
      data: { endedAt, runningForUserId: null },
      include: { business: { select: { name: true } } },
    })
    return { data: toDTO(updated, updated.business.name) }
  }
}
