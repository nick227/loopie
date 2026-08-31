import { ActivitySourceKind, ActivityAttentionState, AttentionItemState } from '@prisma/client'
import { BaseProjector, ProjectionData } from './BaseProjector'

export class AdRunProjector {
  static async project(adRun: any, advertisement: any) {
    const isFailed = adRun.status === 'VALIDATION_FAILED' || adRun.status === 'PROVISIONING_FAILED'

    // We'll project the latest state
    const data: ProjectionData = {
      businessId: advertisement.businessId,
      sourceKind: ActivitySourceKind.PLATFORM,
      sourceRecordType: 'AdRun',
      sourceRecordId: adRun.id,
      // For idempotency in a real system we might key off a status history table.
      // Here we key off the current status.
      eventKey: `AD_RUN_STATUS_${adRun.status}`,

      taxonomyVersion: 'v1',
      type: isFailed ? 'AD_RUN_FAILED' : 'AD_RUN_STATE_CHANGED',

      occurredAt: adRun.updatedAt,
      observedAt: adRun.updatedAt,
      storyId: `adrun-${adRun.id}`,

      sourceLabel: adRun.platform,

      actorKind: 'SYSTEM',
      actorLabel: adRun.platform,

      status: adRun.status,
      attention: isFailed
        ? ActivityAttentionState.ACTION_REQUIRED
        : ActivityAttentionState.INFORMATION,
      summary: `Ad Run ${adRun.status}: ${advertisement.name}`,
      detail: adRun.errorMessage || undefined,

      adId: advertisement.id,
      runId: adRun.id,

      attentionItemState: isFailed ? AttentionItemState.NEEDS_ACTION : undefined,
    }

    await BaseProjector.upsertActivity(data)
  }
}
