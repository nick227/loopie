import { db } from '@project/db'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'

function toAutomationDTO(a: any) {
  return {
    id: a.id,
    businessId: a.businessId,
    name: a.name,
    trigger: a.trigger,
    waitDays: a.waitDays,
    condition: a.condition,
    conditionValue: a.conditionValue,
    action: a.action,
    actionTemplateId: a.actionTemplateId,
    actionValue: a.actionValue,
    isActive: a.isActive,
    pausedAt: a.pausedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  }
}

export class AutomationService {
  async list(businessId: string, opts: { cursor?: string; limit?: number }) {
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const automations = await db.automation.findMany({
      where: { businessId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = automations.length > limit
    const items = hasMore ? automations.slice(0, limit) : automations
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null
    return { data: items.map(toAutomationDTO), meta: { hasMore, nextCursor } }
  }

  // Limits for POC (docs/06-automation-rules.md): max 2 follow-up steps, no nested branches.
  // Enforced here as "one trigger → one action" per row; a second step is a second Automation
  // row the caller chains (e.g. via a DATE_REACHED trigger keyed off the first action's log).
  //
  // NOTE: this stores the rule but does not execute it — there is no background scheduler in
  // V1 evaluating waitDays/condition and firing action on a timer. sendMessage does write the
  // MESSAGE_SENT-triggerable event data (Interaction rows), but nothing currently polls for
  // due automations. Flagged in CLAUDE.md Parking lot as the actual gap this leaves.
  async create(businessId: string, data: any) {
    const automation = await db.automation.create({
      data: {
        businessId,
        name: data.name,
        trigger: data.trigger,
        waitDays: data.waitDays,
        condition: data.condition,
        conditionValue: data.conditionValue,
        action: data.action,
        actionTemplateId: data.actionTemplateId,
        actionValue: data.actionValue,
      },
    })
    return toAutomationDTO(automation)
  }

  async get(businessId: string, automationId: string) {
    return toAutomationDTO(await this._find(businessId, automationId))
  }

  async update(businessId: string, automationId: string, data: any) {
    await this._find(businessId, automationId)
    const automation = await db.automation.update({
      where: { id: automationId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.waitDays !== undefined ? { waitDays: data.waitDays } : {}),
        ...(data.actionTemplateId !== undefined ? { actionTemplateId: data.actionTemplateId } : {}),
      },
    })
    return toAutomationDTO(automation)
  }

  async pause(businessId: string, automationId: string) {
    await this._find(businessId, automationId)
    const automation = await db.automation.update({
      where: { id: automationId },
      data: { isActive: false, pausedAt: new Date() },
    })
    return toAutomationDTO(automation)
  }

  async resume(businessId: string, automationId: string) {
    await this._find(businessId, automationId)
    const automation = await db.automation.update({
      where: { id: automationId },
      data: { isActive: true, pausedAt: null },
    })
    return toAutomationDTO(automation)
  }

  async logs(businessId: string, automationId: string, opts: { cursor?: string; limit?: number }) {
    await this._find(businessId, automationId)
    const limit = normalizeLimit(opts.limit)
    const cursor = decodeCursor(opts.cursor)
    const AND: any[] = []
    if (cursor) {
      AND.push({
        OR: [
          { triggeredAt: { lt: new Date(cursor.createdAt) } },
          { triggeredAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    }
    const logs = await db.automationLog.findMany({
      where: { automationId, ...(AND.length ? { AND } : {}) },
      orderBy: [{ triggeredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = logs.length > limit
    const items = hasMore ? logs.slice(0, limit) : logs
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.triggeredAt.toISOString(), id: last.id }) : null
    return {
      data: items.map((l) => ({
        id: l.id,
        automationId: l.automationId,
        contactId: l.contactId,
        action: l.action,
        outcome: l.outcome,
        reasonSkipped: l.reasonSkipped,
        triggeredAt: l.triggeredAt.toISOString(),
      })),
      meta: { hasMore, nextCursor },
    }
  }

  private async _find(businessId: string, automationId: string) {
    const automation = await db.automation.findFirst({ where: { id: automationId, businessId } })
    if (!automation) throw { statusCode: 404, message: 'Automation not found' }
    return automation
  }
}
