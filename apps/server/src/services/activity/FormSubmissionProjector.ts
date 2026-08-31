import { ActivitySourceKind, ActivityAttentionState, AttentionItemState } from '@prisma/client'
import { BaseProjector, ProjectionData } from './BaseProjector'

export class FormSubmissionProjector {
  static async project(submission: any, form: any, contact: any) {
    // Form submission -> informational unless it creates a Lead requiring follow-up (handled by Lead projector)
    const data: ProjectionData = {
      businessId: submission.businessId,
      sourceKind: ActivitySourceKind.WEBSITE,
      sourceRecordType: 'FormSubmission',
      sourceRecordId: submission.id,
      eventKey: 'FORM_SUBMISSION',

      taxonomyVersion: 'v1',
      type: 'FORM_SUBMISSION',

      occurredAt: submission.createdAt,
      observedAt: submission.createdAt,
      storyId: `form-submission-${submission.id}`,

      sourceLabel: form?.name || 'Website Form',

      actorKind: 'CONTACT',
      actorId: contact?.id,
      actorLabel: contact?.name || 'Unknown Contact',

      status: 'SUBMITTED',
      attention: ActivityAttentionState.INFORMATION,
      summary: `${contact?.name || 'A contact'} submitted a form`,
      detail: `Form: ${form?.name || 'Unknown'}`,

      personId: contact?.id,
      formId: form?.id,
    }

    await BaseProjector.upsertActivity(data)
  }
}
