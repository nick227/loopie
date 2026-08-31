import { db } from '@project/db'
import { ActivitySourceKind, ActivityAttentionState, AttentionItemState } from '@prisma/client'

export interface ProjectionData {
  businessId: string
  sourceKind: ActivitySourceKind
  sourceRecordType: string
  sourceRecordId: string
  eventKey: string

  taxonomyVersion: string
  type: string

  occurredAt: Date
  observedAt: Date
  storyId: string

  sourceLabel: string
  sourceAccountId?: string

  actorKind: string
  actorId?: string
  actorLabel: string

  status?: string
  attention: ActivityAttentionState
  summary: string
  detail?: string

  personId?: string
  leadId?: string
  adId?: string
  runId?: string
  pageId?: string
  formId?: string
  messageId?: string
  broadcastId?: string
  saleId?: string

  aggregation?: any
  actions?: any

  attentionItemState?: AttentionItemState
}

export class BaseProjector {
  /**
   * Upsert an ActivityItem and its associated AttentionItem (if any) idempotently.
   */
  static async upsertActivity(data: ProjectionData) {
    const { attentionItemState, ...activityData } = data

    return await db.$transaction(async (tx) => {
      const activity = await tx.activityItem.upsert({
        where: {
          businessId_sourceKind_sourceRecordType_sourceRecordId_eventKey: {
            businessId: data.businessId,
            sourceKind: data.sourceKind,
            sourceRecordType: data.sourceRecordType,
            sourceRecordId: data.sourceRecordId,
            eventKey: data.eventKey,
          },
        },
        create: activityData,
        update: activityData, // Always sync the latest state of the canonical record
      })

      if (attentionItemState) {
        // Create or update the attention item.
        // In a true live system, we might check if the state is already RESOLVED and
        // not downgrade it. For this step, we simply set it.
        await tx.attentionItem.upsert({
          where: { activityId: activity.id },
          create: {
            activityId: activity.id,
            state: attentionItemState,
          },
          update: {
            state: attentionItemState,
          },
        })
      } else {
        // If there's no attention item state required, ensure one doesn't exist
        // or just ignore. In projection, typically we don't delete attention items
        // if they were created, but let's be idempotent for this step.
      }

      return activity
    })
  }
}
