import { db, verifySid } from '@project/db'
import type { Prisma, SourceType } from '@prisma/client'
import { resolveContactAndLead } from '../lib/identityResolution'
import { snapshotForm, isFormLive, type FormSnapshot } from '../lib/formSnapshot'

export class LandingPageSubmissionService {
  async submit(
    landingPageId: string,
    input: {
      sessionId?: string
      data: Record<string, unknown>
      utmSource?: string
      utmMedium?: string
      utmCampaign?: string
      utmContent?: string
      utmTerm?: string
    },
  ) {
    const sessionId = verifySid(input.sessionId)?.sessionId
    if (!sessionId) throw { statusCode: 400, message: 'Invalid session' }

    const page = await db.landingPage.findUnique({
      where: { id: landingPageId },
      include: { publishedVersion: true },
    })
    if (!page || page.deletedAt || page.status !== 'PUBLISHED' || !page.publishedVersion) {
      throw { statusCode: 404, message: 'Landing page not found' }
    }

    if (!(await isFormLive(db, page.publishedVersion.formId))) {
      throw { statusCode: 409, message: 'This landing page has no form configured' }
    }
    const form: FormSnapshot | null =
      (page.publishedVersion.formSnapshot as unknown as FormSnapshot | null) ??
      (await snapshotForm(db, page.publishedVersion.formId))
    if (!form) {
      throw { statusCode: 409, message: 'This landing page has no form configured' }
    }

    for (const field of form.fields) {
      if (!field.required) continue
      const value = input.data[field.fieldKey]
      if (value === undefined || value === null || String(value).trim() === '') {
        throw { statusCode: 400, message: `Missing required field: ${field.fieldKey}` }
      }
    }

    return db.$transaction(async (tx) => {
      const existing = await tx.formSubmission.findFirst({
        where: { landingPageId: page.id, sessionId },
      })
      if (existing?.contactId && existing.leadId) {
        return {
          submissionId: existing.id,
          contactId: existing.contactId,
          leadId: existing.leadId,
          successMessage: form.successMessage,
        }
      }

      const event = await tx.attributionEvent.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        include: { deployment: { include: { campaign: true } }, adUnit: true },
      })
      const eventBusinessId = event?.deployment?.campaign.businessId ?? event?.adUnit?.businessId
      const attributed = event && eventBusinessId === page.businessId ? event : null

      const emailField = form.fields.find((f) => f.type === 'EMAIL')
      const phoneField = form.fields.find((f) => f.type === 'PHONE')
      const nameValue =
        (input.data['name'] as string) ?? (input.data['full_name'] as string) ?? 'Website visitor'
      const emailValue = emailField
        ? (input.data[emailField.fieldKey] as string | undefined)
        : undefined
      const phoneValue = phoneField
        ? (input.data[phoneField.fieldKey] as string | undefined)
        : undefined

      const submission = await tx.formSubmission.create({
        data: {
          businessId: page.businessId,
          formId: form.id,
          landingPageId: page.id,
          publishedPageVersionId: page.publishedVersionId,
          data: input.data as Prisma.InputJsonValue,
          sessionId,
          clickId: attributed?.clickId,
          utmSource: input.utmSource ?? attributed?.utmSource,
          utmMedium: input.utmMedium ?? attributed?.utmMedium,
          utmCampaign: input.utmCampaign ?? attributed?.utmCampaign,
          utmContent: input.utmContent ?? attributed?.utmContent,
          utmTerm: input.utmTerm ?? attributed?.utmTerm,
          sourceDeploymentId: attributed?.deploymentId,
          sourceAdUnitId: attributed?.adUnitId,
        },
      })

      const sourceType: SourceType = attributed?.deploymentId
        ? 'DEPLOYMENT'
        : attributed?.adUnitId
          ? 'AD_UNIT'
          : 'MANUAL'
      const { contact, lead } = await resolveContactAndLead(
        tx,
        page.businessId,
        { name: nameValue, email: emailValue, phone: phoneValue, source: 'landing-page' },
        {
          sourceType,
          sourceDeploymentId: attributed?.deploymentId,
          sourceAdUnitId: attributed?.adUnitId,
          clickId: attributed?.clickId,
          landingSessionId: sessionId,
        },
      )

      await tx.formSubmission.update({
        where: { id: submission.id },
        data: { contactId: contact.id, leadId: lead.id },
      })
      if (attributed?.deploymentId) {
        await tx.deployment.update({
          where: { id: attributed.deploymentId },
          data: { conversions: { increment: 1 } },
        })
      }
      if (attributed?.adUnitId) {
        await tx.adUnit.update({
          where: { id: attributed.adUnitId },
          data: { conversions: { increment: 1 } },
        })
      }

      return {
        submissionId: submission.id,
        contactId: contact.id,
        leadId: lead.id,
        successMessage: form.successMessage,
      }
    })
  }

  async recordFormStart(landingPageId: string) {
    const page = await db.landingPage.findUnique({ where: { id: landingPageId } })
    if (!page || page.deletedAt || page.status !== 'PUBLISHED') {
      throw { statusCode: 404, message: 'Landing page not found' }
    }
    await db.landingPage.update({
      where: { id: landingPageId },
      data: { formStartCount: { increment: 1 } },
    })
  }
}
