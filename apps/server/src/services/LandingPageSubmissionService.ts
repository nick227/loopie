import { db, verifySid } from '@project/db'
import type { Prisma, SourceType } from '@prisma/client'
import { resolveContactAndLead } from '../lib/identityResolution'
import { snapshotForm, isFormLive, type FormSnapshot } from '../lib/formSnapshot'
import { resolveAttributionSource, sourceTypeForKind } from '../lib/attributionSource'
import { notifyFormSubmission } from '../lib/submissionInbox'

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

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.formSubmission.findFirst({
        where: { landingPageId: page.id, sessionId },
      })
      if (existing?.contactId && existing.leadId) {
        const contact = await tx.contact.findUnique({ where: { id: existing.contactId } })
        const lead = await tx.lead.findUnique({ where: { id: existing.leadId } })
        return {
          submission: existing,
          contact,
          lead,
          leadCreated: false,
          successMessage: form.successMessage,
          adAttribution: null as { name: string; platform: string } | null,
        }
      }

      // First-touch, same reasoning as AttributionService.submitForm: the earliest click in this
      // session gets credit, not whichever click is most recent.
      const event = await tx.attributionEvent.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        include: {
          deployment: { include: { campaign: true } },
          adRun: { include: { advertisement: true } },
          adUnit: true,
        },
      })
      const eventBusinessId =
        event?.adRun?.advertisement.businessId ??
        event?.deployment?.campaign.businessId ??
        event?.adUnit?.businessId
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
          sourceAdRunId: attributed?.adRunId,
          sourceAdUnitId: attributed?.adUnitId,
        },
      })

      // Canonical attribution-source resolution — see AttributionService.submitForm's identical
      // use of this helper. AttributionEvent's own columns have no "source" prefix, adapted here.
      const source = resolveAttributionSource({
        sourceAdRunId: attributed?.adRunId,
        sourceDeploymentId: attributed?.deploymentId,
        sourceAdUnitId: attributed?.adUnitId,
      })
      const sourceType: SourceType = source ? sourceTypeForKind(source.kind) : 'MANUAL'
      const { contact, lead, leadCreated } = await resolveContactAndLead(
        tx,
        page.businessId,
        { name: nameValue, email: emailValue, phone: phoneValue, source: 'landing-page' },
        {
          sourceType,
          sourceDeploymentId: attributed?.deploymentId,
          sourceAdRunId: attributed?.adRunId,
          sourceAdUnitId: attributed?.adUnitId,
          clickId: attributed?.clickId,
          landingSessionId: sessionId,
        },
      )

      await tx.formSubmission.update({
        where: { id: submission.id },
        data: { contactId: contact.id, leadId: lead.id },
      })
      // Only a genuinely new Lead is a new conversion — see AttributionService.submitForm's
      // identical fix. A contact with an already-open Lead who submits a second, different
      // landing page in a fresh session must not inflate that page's deployment/ad-run/ad-unit
      // conversions for a Lead that was merely reused.
      if (leadCreated && attributed?.deploymentId) {
        await tx.deployment.update({
          where: { id: attributed.deploymentId },
          data: { conversions: { increment: 1 } },
        })
      }
      if (leadCreated && attributed?.adRunId) {
        await tx.adRun.update({
          where: { id: attributed.adRunId },
          data: { conversions: { increment: 1 } },
        })
      }
      if (leadCreated && attributed?.adUnitId) {
        await tx.adUnit.update({
          where: { id: attributed.adUnitId },
          data: { conversions: { increment: 1 } },
        })
      }

      return {
        submission,
        contact,
        lead,
        leadCreated,
        successMessage: form.successMessage,
        adAttribution: attributed?.adRun
          ? { name: attributed.adRun.advertisement.name, platform: attributed.adRun.platform }
          : null,
      }
    })

    try {
      const { ActivityProjectionService } = await import('./activity/ActivityProjectionService')
      if (result.leadCreated) {
        // Non-null: leadCreated is only ever true out of the resolveContactAndLead branch below,
        // which always returns a real contact/lead (never the re-fetch-by-id early-return branch
        // above, whose Prisma findUnique calls are the only source of the nullable inferred type).
        await ActivityProjectionService.project(
          page.businessId,
          'Lead',
          result.lead!.id,
          'projectCreated',
          result.lead,
          result.contact,
        )
      }
      await ActivityProjectionService.project(
        page.businessId,
        'Interaction',
        result.submission.id,
        'project',
        result.submission,
        form,
        result.contact,
      )
    } catch (err) {
      console.error('Failed to project landing page submission', err)
    }

    // FormSnapshot (the frozen `form` above) has no name field — the live Form's own name is only
    // needed for this one human-readable Inbox sentence, so it's fetched fresh here rather than
    // added to the immutable snapshot. result.contact is guarded (not just asserted, unlike the
    // pre-existing accesses below) since tx.contact.findUnique genuinely can return null.
    if (result.contact) {
      const liveForm = await db.form.findUnique({ where: { id: form.id }, select: { name: true } })
      await notifyFormSubmission(
        page.businessId,
        { id: result.contact.id, name: result.contact.name },
        { id: page.id, name: page.name },
        liveForm?.name ?? 'form',
        { leadCreated: result.leadCreated, adAttribution: result.adAttribution },
      )
    }

    return {
      submissionId: result.submission.id,
      contactId: result.contact!.id,
      leadId: result.lead!.id,
      successMessage: result.successMessage,
    }
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
