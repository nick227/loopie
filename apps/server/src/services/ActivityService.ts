import { db } from '@project/db'
import { normalizeLimit } from '../lib/pagination'

type ActivityCursorPayload = {
  occurredAt: string
  id: string
}

function encodeActivityCursor(payload: ActivityCursorPayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodeActivityCursor(cursor?: string): ActivityCursorPayload | null {
  if (!cursor) return null
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  } catch {
    throw { statusCode: 400, message: 'Invalid cursor' }
  }
}

export class ActivityService {
  async getActivityStream(businessId: string, query: any) {
    const limit = normalizeLimit(query.limit, 100, 20)
    const cursorPayload = decodeActivityCursor(query.cursor)

    // Build where clause
    const where: any = { businessId }

    if (query.source) where.sourceKind = query.source
    if (query.type) where.type = query.type
    if (query.personId) where.personId = query.personId
    if (query.adId) where.adId = query.adId
    if (query.pageId) where.pageId = query.pageId
    if (query.status) where.status = query.status
    if (query.since) where.occurredAt = { ...where.occurredAt, gte: new Date(query.since) }
    if (query.until) where.occurredAt = { ...where.occurredAt, lte: new Date(query.until) }

    if (query.needsAction === true || query.needsAction === 'true') {
      where.attentionItem = {
        state: 'NEEDS_ACTION',
      }
    }

    const items = await db.activityItem.findMany({
      where,
      include: {
        attentionItem: true,
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      skip: cursorPayload ? 1 : 0,
      cursor: cursorPayload
        ? {
            id: cursorPayload.id,
          }
        : undefined,
    })

    const hasMore = items.length > limit
    const results = hasMore ? items.slice(0, -1) : items

    const mappedResults = results.map((item) => ({
      id: item.id,
      businessId: item.businessId,
      taxonomyVersion: item.taxonomyVersion,
      type: item.type,
      occurredAt: item.occurredAt.toISOString(),
      observedAt: item.observedAt.toISOString(),
      projectedAt: item.projectedAt.toISOString(),
      storyId: item.storyId,
      source: {
        kind: item.sourceKind,
        id: item.sourceRecordId,
        label: item.sourceLabel,
        accountId: item.sourceAccountId,
      },
      actor: {
        kind: item.actorKind,
        id: item.actorId,
        label: item.actorLabel,
      },
      attention: item.attention,
      summary: item.summary,
      detail: item.detail,
      references: {
        personId: item.personId,
        leadId: item.leadId,
        adId: item.adId,
        runId: item.runId,
        pageId: item.pageId,
        formId: item.formId,
        messageId: item.messageId,
        broadcastId: item.broadcastId,
        saleId: item.saleId,
      },
      aggregation: item.aggregation,
      actions: item.actions,
      attentionItem: item.attentionItem,
    }))

    const lastResult = results[results.length - 1]
    const nextCursor =
      hasMore && lastResult
        ? encodeActivityCursor({
            occurredAt: lastResult.occurredAt.toISOString(),
            id: lastResult.id,
          })
        : null

    return {
      data: mappedResults,
      nextCursor,
    }
  }

  async getHealth(businessId: string) {
    const unresolvedFailures = await db.activityProjectionFailure.count({
      where: {
        businessId,
        resolvedAt: null,
      },
    })

    return {
      unresolvedFailures,
      status: unresolvedFailures === 0 ? 'HEALTHY' : 'DEGRADED',
    }
  }

  async getCheckpoint(businessId: string) {
    const latest = await db.activityItem.findFirst({
      where: { businessId },
      orderBy: { observedAt: 'desc' },
      select: { observedAt: true },
    })

    // Matches the documented contract (openapi.yaml's getActivityCheckpoint response) — found
    // live, not by inspection: this was previously returning { latestObservedAt } at the top
    // level, silently diverging from the spec (and therefore from the generated SDK types),
    // which meant the frontend's read of it could never actually succeed against a real response.
    return {
      data: { observedAt: (latest?.observedAt ?? new Date(0)).toISOString() },
    }
  }

  async getActivityItem(businessId: string, activityId: string) {
    const item = await db.activityItem.findUnique({
      where: { id: activityId },
      include: { attentionItem: true },
    })

    if (!item || item.businessId !== businessId) {
      throw { statusCode: 404, message: 'Activity not found' }
    }

    return {
      id: item.id,
      businessId: item.businessId,
      taxonomyVersion: item.taxonomyVersion,
      type: item.type,
      occurredAt: item.occurredAt.toISOString(),
      observedAt: item.observedAt.toISOString(),
      projectedAt: item.projectedAt.toISOString(),
      storyId: item.storyId,
      source: {
        kind: item.sourceKind,
        id: item.sourceRecordId,
        label: item.sourceLabel,
        accountId: item.sourceAccountId,
      },
      actor: {
        kind: item.actorKind,
        id: item.actorId,
        label: item.actorLabel,
      },
      attention: item.attention,
      summary: item.summary,
      detail: item.detail,
      references: {
        personId: item.personId,
        leadId: item.leadId,
        adId: item.adId,
        runId: item.runId,
        pageId: item.pageId,
        formId: item.formId,
        messageId: item.messageId,
        broadcastId: item.broadcastId,
        saleId: item.saleId,
      },
      aggregation: item.aggregation,
      actions: item.actions,
      attentionItem: item.attentionItem,
    }
  }

  async updateAttentionItem(businessId: string, attentionId: string, data: any) {
    const attentionItem = await db.attentionItem.findUnique({
      where: { id: attentionId },
      include: { activityItem: true },
    })

    if (!attentionItem || attentionItem.activityItem.businessId !== businessId) {
      throw { statusCode: 404, message: 'Attention item not found' }
    }

    // Only allow updating specific fields
    const updateData: any = {}
    if (data.state !== undefined) updateData.state = data.state
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.snoozedUntil !== undefined)
      updateData.snoozedUntil = data.snoozedUntil !== null ? new Date(data.snoozedUntil) : null

    const updated = await db.attentionItem.update({
      where: { id: attentionId },
      data: updateData,
    })

    return updated
  }
}
