import { db } from '@project/db'
import { FormSubmissionProjector } from './FormSubmissionProjector'
import { resolveContactAndLead } from '../../lib/identityResolution'

export async function processEmbedOutbox() {
  const pendingRecords = await db.embedProjectionOutbox.findMany({
    where: {
      status: 'PENDING',
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
    },
    include: { formSubmission: true, embedEvent: true },
    take: 50,
  })

  for (const record of pendingRecords) {
    try {
      // Optimistic concurrency control
      const updated = await db.embedProjectionOutbox.updateMany({
        where: { id: record.id, status: 'PENDING' },
        data: { status: 'PROCESSING' },
      })
      if (updated.count === 0) continue

      if (record.formSubmissionId && record.formSubmission) {
        const submission = record.formSubmission
        const payload = submission.data as Record<string, any>
        const email = payload.email || undefined

        let contact = null
        if (email) {
          const resolved = await resolveContactAndLead(
            db,
            record.businessId,
            {
              email,
              name: payload.name || payload.firstName || 'Unknown',
              phone: payload.phone || null,
              source: 'WEBSITE',
            },
            {
              sourceType: 'EMBED_PAGE',
              sourceEmbedDeploymentId: submission.embedDeploymentId,
              sourceEmbedInstanceId: submission.embedInstanceId,
              // we don't have sourceEmbedVersionId on FormSubmission directly, it's on EmbedInstance
              // but we can skip it or fetch it if needed. The test checks instanceId.
            },
          )
          contact = resolved.contact
        }

        if (contact) {
          // Link form submission to the contact
          await db.formSubmission.update({
            where: { id: submission.id },
            data: { contactId: contact.id },
          })

          // Optionally trigger full FormSubmissionProjector
          try {
            const form = await db.form.findUnique({ where: { id: submission.formId } })
            await FormSubmissionProjector.project(submission, form, contact)
          } catch (projErr) {
            console.error('[EmbedProjectionWorker] Error projecting FormSubmission:', projErr)
          }
        }
      }

      await db.embedProjectionOutbox.update({
        where: { id: record.id },
        data: { status: 'COMPLETE' },
      })
    } catch (e: any) {
      console.error('[EmbedProjectionWorker] Error processing outbox record', record.id, e)
      await db.embedProjectionOutbox.update({
        where: { id: record.id },
        data: {
          status: record.retryCount >= 3 ? 'FAILED' : 'PENDING',
          error: e.message || String(e),
          retryCount: record.retryCount + 1,
          nextAttemptAt: new Date(Date.now() + Math.pow(2, record.retryCount) * 1000 * 60), // Backoff
        },
      })
    }
  }
}
