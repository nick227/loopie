import { ActivitySourceKind, ActivityAttentionState, AttentionItemState } from '@prisma/client'
import { BaseProjector, ProjectionData } from './BaseProjector'

export class AutomationProjector {
  static async project(log: any, automation: any) {
    const isFailed = log.outcome === 'FAILED'

    const data: ProjectionData = {
      businessId: automation.businessId,
      sourceKind: ActivitySourceKind.AUTOMATION,
      sourceRecordType: 'AutomationLog',
      sourceRecordId: log.id,
      eventKey: 'AUTOMATION_EXECUTION',

      taxonomyVersion: 'v1',
      type: isFailed ? 'AUTOMATION_FAILED' : 'AUTOMATION_COMPLETED',

      occurredAt: log.triggeredAt,
      observedAt: log.triggeredAt,
      storyId: `automation-${automation.id}`,

      sourceLabel: 'Automations',

      actorKind: 'AUTOMATION',
      actorId: automation.id,
      actorLabel: automation.name,

      status: log.outcome,
      attention: isFailed ? ActivityAttentionState.FAILURE : ActivityAttentionState.INFORMATION,
      summary: `Automation ${log.outcome}: ${automation.name}`,
      detail: isFailed ? log.reasonSkipped || 'Failed during execution' : undefined,

      personId: log.contactId,

      attentionItemState: isFailed ? AttentionItemState.NEEDS_ACTION : undefined,
    }

    await BaseProjector.upsertActivity(data)
  }
}
