import { db, trackBaseClick, withSid, clickRedirectUrl } from '@project/db'
import crypto from 'crypto'
import { renderLandingPageHtml, type FormSnapshot } from '@project/page-renderer'
import { renderAdCreativeDocument } from '@project/ad-renderer'
import { buildAdCreativeInput } from '../lib/adCreativeInput'

export class EmbedServingService {
  async getBootstrapMetadata(publicId: string, origin: string) {
    const deployment = await db.embedDeployment.findUnique({
      where: { publicId },
      include: {
        allowedOrigins: true,
        activeAdvertisementVersion: true,
        activePageVersion: true,
      },
    })

    if (!deployment || deployment.status !== 'ACTIVE') {
      throw { statusCode: 404, message: 'Embed deployment not found or inactive' }
    }

    let normalizedOrigin = origin
    try {
      normalizedOrigin = new URL(origin).origin
    } catch (e) {
      // Invalid origin
    }

    if (deployment.domainPolicy === 'ALLOWLIST') {
      const isAllowed = deployment.allowedOrigins.some((o) => {
        try {
          return new URL(o.normalizedOrigin).origin === normalizedOrigin
        } catch {
          return false
        }
      })
      if (!isAllowed) {
        throw { statusCode: 403, message: 'Origin not allowed' }
      }
    }

    const nonce = crypto.randomBytes(16).toString('hex')
    await db.embedBootstrapNonce.create({
      data: {
        nonce,
        deploymentId: deployment.id,
        origin: normalizedOrigin,
        // 5 minutes expiry
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    return {
      deploymentId: deployment.id,
      publicId: deployment.publicId,
      objectType: deployment.objectType,
      nonce,
      version:
        deployment.objectType === 'ADVERTISEMENT'
          ? deployment.activeAdvertisementVersion?.version
          : deployment.activePageVersion?.version,
    }
  }

  async renderIframe(publicId: string, token?: string) {
    const deployment = await db.embedDeployment.findUnique({
      where: { publicId },
      include: {
        activeAdvertisementVersion: true,
        activePageVersion: true,
      },
    })

    if (!deployment || deployment.status !== 'ACTIVE') {
      throw { statusCode: 404, message: 'Embed deployment not found' }
    }

    if (deployment.objectType === 'ADVERTISEMENT' && !deployment.activeAdvertisementVersion) {
      throw { statusCode: 404, message: 'No active advertisement version' }
    }

    if (deployment.objectType === 'PAGE' && !deployment.activePageVersion) {
      throw { statusCode: 404, message: 'No active landing page version' }
    }

    let validNonce: { origin: string; deploymentId: string; expiresAt: Date } | null = null
    if (token) {
      validNonce = await db.$transaction(async (tx) => {
        const n = await tx.embedBootstrapNonce.findUnique({ where: { nonce: token } })
        if (n) await tx.embedBootstrapNonce.delete({ where: { nonce: token } })
        return n
      })

      if (
        !validNonce ||
        validNonce.expiresAt < new Date() ||
        validNonce.deploymentId !== deployment.id
      ) {
        throw { statusCode: 401, message: 'Invalid or expired nonce' }
      }
    }

    // Creating instance
    const instance = await db.embedInstance.create({
      data: {
        objectType: deployment.objectType,
        objectId:
          deployment.objectType === 'ADVERTISEMENT'
            ? deployment.advertisementId!
            : deployment.landingPageId!,
        embedDeploymentId: deployment.id,
        versionId:
          deployment.objectType === 'ADVERTISEMENT'
            ? deployment.activeAdvertisementVersion!.id
            : deployment.activePageVersion!.id,
        snapshotChecksum:
          deployment.objectType === 'ADVERTISEMENT'
            ? deployment.activeAdvertisementVersion!.checksum!
            : deployment.activePageVersion!.checksum!,
        authorizedOrigin: token ? (validNonce?.origin ?? '') : '',
      },
    })

    if (deployment.objectType === 'PAGE') {
      const pageVersion = deployment.activePageVersion!
      if (pageVersion.formatVersion !== '1.0') {
        throw { statusCode: 400, message: 'Unsupported page format version' }
      }

      const injectedHeadScripts = `
<script>
  const instanceId = "${instance.id}";
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (event.data?.type === 'loopie:visible' && event.data?.instanceId === instanceId) {
       fetch('/v1/embed/${publicId}/impression', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ instanceId })
       }).catch(() => {});
    }
  });
  window.parent.postMessage({ type: 'loopie:ready', protocolVersion: 1, instanceId }, "*");
</script>
`

      return renderLandingPageHtml({
        pageName: 'Landing Page', // In a real scenario, this would come from a title in the payload or landingPage table
        templateSchema: (pageVersion.schemaSnapshot as any) ?? {},
        content: pageVersion.content,
        theme: (pageVersion.theme as any) ?? {},
        layoutConfig: (pageVersion.layoutConfig as any) ?? {},
        form: pageVersion.formSnapshot as unknown as FormSnapshot,
        submitActionUrl: `/v1/embed/${publicId}/submit?instanceId=${instance.id}`,
        sessionToken: undefined, // Embeds might not use standard sessions for form submits out of the box in this slice
        adSlots: (pageVersion.adSlotSnapshot as any) ?? [],
        injectedHeadScripts,
      })
    }

    // Same @project/ad-renderer function every other surface calls (Ad Designer live preview, a
    // Loopie Page's ad-creative slot, a River AD post) — see CLAUDE.md's Ad Designer "CRITICAL
    // RENDERING REQUIREMENT". The click href is this route's own tracked-click endpoint, not the
    // real destination directly, so impression/click accounting stays exactly as it was for the
    // PAGE branch above.
    const version = deployment.activeAdvertisementVersion!
    const input = await buildAdCreativeInput({
      creativeSnapshot: version.creativeSnapshot,
      format: version.format,
      destinationUrl: `/v1/embed/${publicId}/click?instanceId=${instance.id}`,
    })

    const injectedHeadScripts = `<script>
  const instanceId = "${instance.id}";
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (event.data?.type === 'loopie:visible' && event.data?.instanceId === instanceId) {
       fetch('/v1/embed/${publicId}/impression', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ instanceId })
       }).catch(() => {});
    }
  });
  window.parent.postMessage({ type: 'loopie:ready', protocolVersion: 1, instanceId }, "*");
</script>`

    return renderAdCreativeDocument(input, { injectedHeadScripts })
  }

  // Direct, trusted route — a Loopie Page placing a saved Ad Designer creative into one of its own
  // ad slots (see LandingPageAdSlotAssignment.advertisementId / lib/adSlots.ts's
  // embedUrlForAdvertisement). No publicId/domain-policy/nonce dance, since there's no external
  // trust boundary to police here — same renderAdCreativeDocument call as the public embed path
  // above, just resolved straight off the advertisementId instead of an EmbedDeployment.
  async renderAdvertisementEmbed(advertisementId: string) {
    const version = await db.publishedAdvertisementVersion.findFirst({
      where: { advertisementId, archivedAt: null },
      orderBy: { version: 'desc' },
    })
    if (!version) throw { statusCode: 404, message: 'No published version for this advertisement' }
    const input = await buildAdCreativeInput({
      creativeSnapshot: version.creativeSnapshot,
      format: version.format,
      destinationUrl: version.destinationUrl,
    })
    return renderAdCreativeDocument(input)
  }

  async recordImpression(publicId: string, instanceId: string) {
    const deployment = await db.embedDeployment.findUnique({
      where: { publicId },
      include: {
        activeAdvertisementVersion: true,
        activePageVersion: true,
        advertisement: true,
        landingPage: true,
      },
    })

    if (!deployment) {
      throw { statusCode: 404, message: 'Deployment not found' }
    }

    const instance = await db.embedInstance.findUnique({ where: { id: instanceId } })
    if (!instance) throw { statusCode: 404, message: 'Instance not found' }

    const idempotencyKey = `impression_${instanceId}`
    const existing = await db.embedEvent.findUnique({ where: { idempotencyKey } })
    if (existing) return // Idempotent

    await db.$transaction(async (tx) => {
      const event = await tx.embedEvent.create({
        data: {
          objectType: deployment.objectType,
          objectId:
            deployment.objectType === 'ADVERTISEMENT'
              ? deployment.advertisementId!
              : deployment.landingPageId!,
          embedDeploymentId: deployment.id,
          versionId:
            deployment.objectType === 'ADVERTISEMENT'
              ? deployment.activeAdvertisementVersion!.id
              : deployment.activePageVersion!.id,
          snapshotChecksum:
            deployment.objectType === 'ADVERTISEMENT'
              ? deployment.activeAdvertisementVersion!.checksum!
              : deployment.activePageVersion!.checksum!,
          authorizedOrigin: instance.authorizedOrigin,
          embedInstanceId: instanceId,
          eventType: 'AD_IMPRESSION',
          idempotencyKey,
          occurredAt: new Date(),
        },
      })

      // Project event through outbox
      await tx.embedProjectionOutbox.create({
        data: {
          businessId:
            deployment.objectType === 'ADVERTISEMENT'
              ? deployment.advertisement!.businessId
              : deployment.landingPage!.businessId,
          embedEventId: event.id,
          idempotencyKey: `outbox_${idempotencyKey}`,
          status: 'PENDING',
        },
      })
    })
  }

  async recordClick(publicId: string, instanceId: string, sessionId?: string) {
    const deployment = await db.embedDeployment.findUnique({
      where: { publicId },
      include: {
        activeAdvertisementVersion: true,
        activePageVersion: true,
        advertisement: true,
        landingPage: true,
      },
    })

    if (!deployment) {
      throw { statusCode: 404, message: 'Deployment not found' }
    }

    const instance = await db.embedInstance.findUnique({ where: { id: instanceId } })
    if (!instance) throw { statusCode: 404, message: 'Instance not found' }

    const idempotencyKey = `click_${instanceId}_${crypto.randomUUID()}`
    const existing = await db.embedEvent.findUnique({ where: { idempotencyKey } })
    if (!existing) {
      await db.$transaction(async (tx) => {
        const event = await tx.embedEvent.create({
          data: {
            objectType: deployment.objectType,
            objectId:
              deployment.objectType === 'ADVERTISEMENT'
                ? deployment.advertisementId!
                : deployment.landingPageId!,
            embedDeploymentId: deployment.id,
            versionId:
              deployment.objectType === 'ADVERTISEMENT'
                ? deployment.activeAdvertisementVersion!.id
                : deployment.activePageVersion!.id,
            snapshotChecksum:
              deployment.objectType === 'ADVERTISEMENT'
                ? deployment.activeAdvertisementVersion!.checksum!
                : deployment.activePageVersion!.checksum!,
            authorizedOrigin: instance.authorizedOrigin,
            embedInstanceId: instanceId,
            eventType: 'AD_CLICK',
            idempotencyKey,
            occurredAt: new Date(),
          },
        })

        await tx.embedProjectionOutbox.create({
          data: {
            businessId:
              deployment.objectType === 'ADVERTISEMENT'
                ? deployment.advertisement!.businessId
                : deployment.landingPage!.businessId,
            embedEventId: event.id,
            idempotencyKey: `outbox_${idempotencyKey}`,
            status: 'PENDING',
          },
        })
      })
    }

    if (deployment.objectType === 'PAGE') {
      // Landing pages generally do not redirect via a top-level click, they capture forms inside
      // or redirect based on their own buttons. If needed, we can parse a destination from content.
      // For now, return the hosted URL.
      return { redirectUrl: `https://${deployment.landingPage!.slug}.loopie.up`, sessionId }
    }

    const destination = deployment.activeAdvertisementVersion!.destinationUrl
    if (!destination) {
      throw { statusCode: 404, message: 'No destination URL configured for this advertisement' }
    }

    const sidToken = await trackBaseClick({
      sourceEmbedDeploymentId: deployment.id,
      sourceEmbedVersionId: deployment.activeAdvertisementVersion!.id,
      sourceEmbedInstanceId: instanceId,
      platform: 'LOOPIE',
      sessionId,
    })

    // If destination is another loopie page, we could use clickRedirectUrl, but for now just withSid
    const redirectUrl = withSid(destination, sidToken)

    return { redirectUrl, sessionId: sidToken }
  }

  async recordSubmission(publicId: string, instanceId: string, data: any) {
    const deployment = await db.embedDeployment.findUnique({
      where: { publicId },
      include: { activePageVersion: true, landingPage: true },
    })

    if (!deployment || deployment.objectType !== 'PAGE') {
      throw { statusCode: 404, message: 'Deployment not found or not a page' }
    }

    if (!deployment.activePageVersion) {
      throw { statusCode: 400, message: 'No active version published' }
    }

    const instance = await db.embedInstance.findUnique({ where: { id: instanceId } })
    if (!instance) throw { statusCode: 404, message: 'Instance not found' }

    if (instance.embedDeploymentId !== deployment.id) {
      throw { statusCode: 403, message: 'Instance does not belong to this deployment' }
    }

    // Validate using the frozen snapshot
    const formSnapshot = deployment.activePageVersion.formSnapshot as any
    if (!formSnapshot || !formSnapshot.fields) {
      throw { statusCode: 400, message: 'Form snapshot is missing on published page' }
    }

    // Required fields check and data sanitization
    const cleanData: Record<string, any> = {}
    for (const field of formSnapshot.fields) {
      if (field.required && !data[field.fieldKey]) {
        throw {
          statusCode: 400,
          message: `Validation failed: missing required field ${field.fieldKey}`,
        }
      }
      if (data[field.fieldKey] !== undefined) {
        cleanData[field.fieldKey] = data[field.fieldKey]
      }
    }

    // Idempotency against duplicate submissions (per instance)
    const existing = await db.formSubmission.findFirst({ where: { embedInstanceId: instanceId } })
    if (existing) return // Idempotent success

    await db.$transaction(async (tx) => {
      const submission = await tx.formSubmission.create({
        data: {
          businessId: deployment.landingPage!.businessId,
          formId: formSnapshot.id,
          landingPageId: deployment.landingPageId,
          publishedPageVersionId: deployment.activePageVersion!.id,
          embedDeploymentId: deployment.id,
          embedVersionId: deployment.activePageVersion!.id,
          embedInstanceId: instanceId,
          data: cleanData,
        },
      })

      // Project CRM work through outbox
      await tx.embedProjectionOutbox.create({
        data: {
          businessId: deployment.landingPage!.businessId,
          formSubmissionId: submission.id,
          idempotencyKey: `outbox_form_submit_${instanceId}`,
          status: 'PENDING',
        },
      })
    })
  }
}
