import { ActivitySourceKind, ActivityAttentionState, AttentionItemState } from '@prisma/client'
import { BaseProjector, ProjectionData } from './BaseProjector'

export class LeadProjector {
  static async project(lead: any, contact: any) {
    // We project LEAD_CREATED
    const createdData: ProjectionData = {
      businessId: lead.businessId,
      sourceKind: ActivitySourceKind.LOOPIE,
      sourceRecordType: 'Lead',
      sourceRecordId: lead.id,
      eventKey: 'LEAD_CREATED',

      taxonomyVersion: 'v1',
      type: 'LEAD_CREATED',

      occurredAt: lead.openedAt || lead.createdAt,
      observedAt: lead.openedAt || lead.createdAt,
      storyId: `lead-${lead.id}`,

      sourceLabel: 'Lead Management',

      actorKind: 'CONTACT',
      actorId: contact.id,
      actorLabel: contact.name || 'Unknown Contact',

      status: lead.stage,
      attention: ActivityAttentionState.ACTION_REQUIRED,
      summary: `New Lead: ${contact.name || 'Unknown Contact'}`,
      detail: `Lead created at stage ${lead.stage}`,

      personId: lead.contactId,
      leadId: lead.id,

      attentionItemState: AttentionItemState.NEEDS_ACTION,
    }

    await BaseProjector.upsertActivity(createdData)
  }

  static async projectStatusChange(lead: any, contact: any, oldStage: string) {
    const data: ProjectionData = {
      businessId: lead.businessId,
      sourceKind: ActivitySourceKind.LOOPIE,
      sourceRecordType: 'Lead',
      sourceRecordId: lead.id,
      eventKey: `LEAD_STATUS_CHANGED_${lead.stage}`,

      taxonomyVersion: 'v1',
      type: 'LEAD_STATUS_CHANGED',

      occurredAt: new Date(),
      observedAt: new Date(),
      storyId: `lead-${lead.id}`,

      sourceLabel: 'Lead Management',

      actorKind: 'CONTACT', // The actor is usually system or user, let's keep it simple
      actorId: contact.id,
      actorLabel: contact.name || 'Unknown Contact',

      status: lead.stage,
      attention: ActivityAttentionState.ACTION_REQUIRED,
      summary: `Lead stage changed to ${lead.stage}`,
      detail: `Lead moved from ${oldStage} to ${lead.stage}`,

      personId: lead.contactId,
      leadId: lead.id,

      attentionItemState: AttentionItemState.NEEDS_ACTION,
    }

    await BaseProjector.upsertActivity(data)
  }
}
