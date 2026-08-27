import {
  db,
  verifySid,
  clickRedirectUrl,
  trackBaseClick,
  withSid,
  resolveVisitorSid,
  isCampaignEnded,
  isAdRunEnded,
} from '@project/db'
import { hostedPageUrl } from '../lib/urls'
import { resolveContactAndLead } from '../lib/identityResolution'
import { resolveAttributionSource, sourceTypeForKind } from '../lib/attributionSource'

export class AttributionService {
  async trackClick(deploymentId: string, sessionId?: string, clickId?: string) {
    const deployment = await db.deployment.findUnique({
      where: { id: deploymentId },
      include: { campaign: true, destinationLandingPage: true },
    })
    if (!deployment || deployment.status !== 'ACTIVE' || isCampaignEnded(deployment.campaign)) {
      throw { statusCode: 404, message: 'Deployment not found' }
    }

    const redirectBase = clickRedirectUrl(
      deployment.destinationLandingPage,
      deployment.campaign.destinationUrl,
      hostedPageUrl,
    )
    if (!redirectBase) throw { statusCode: 404, message: 'Deployment not found' }

    const sidToken = await trackBaseClick({
      campaignId: deployment.campaignId,
      creativeId: deployment.creativeId,
      deploymentId: deployment.id,
      landingPageId: deployment.destinationLandingPageId,
      platform: deployment.platform,
      sessionId,
      clickId,
      onRecord: async () => {
        await db.deployment.update({
          where: { id: deployment.id },
          data: { clicks: { increment: 1 } },
        })
      },
    })

    return { redirectUrl: withSid(redirectBase, sidToken), sessionId: sidToken }
  }

  // Additive alongside trackClick above, not a replacement — see CLAUDE.md's Media/Advertisement/
  // AdRun migration audit. An AdRun has no campaign-style fallback destinationUrl of its own in
  // this schema (Advertisement carries no destinationUrl field either), so a clickable AdRun must
  // have destinationLandingPageId set; there is no equivalent fallback to a raw external URL yet.
  async trackAdRunClick(adRunId: string, sessionId?: string, clickId?: string) {
    const adRun = await db.adRun.findUnique({
      where: { id: adRunId },
      include: { advertisement: true, destinationLandingPage: true },
    })
    if (!adRun || adRun.status !== 'ACTIVE' || isAdRunEnded(adRun)) {
      throw { statusCode: 404, message: 'AdRun not found' }
    }

    const redirectBase = clickRedirectUrl(adRun.destinationLandingPage, null, hostedPageUrl)
    if (!redirectBase) throw { statusCode: 404, message: 'AdRun not found' }

    const sidToken = await trackBaseClick({
      adRunId: adRun.id,
      landingPageId: adRun.destinationLandingPageId,
      platform: adRun.platform,
      sessionId,
      clickId,
      onRecord: async () => {
        await db.adRun.update({
          where: { id: adRun.id },
          data: { clicks: { increment: 1 } },
        })
      },
    })

    return { redirectUrl: withSid(redirectBase, sidToken), sessionId: sidToken }
  }

  // Mirrors trackClick above exactly (same helpers, same redirect/session-mint shape) for an
  // affiliate's referral link instead of an ad deployment. The actual "who gets credit" stamp
  // happens later, in identityResolution.ts's resolveContactAndLead, keyed off this click's
  // sessionId — nothing here touches Lead/sourceType directly.
  async trackAffiliateClick(affiliateId: string, sessionId?: string) {
    const affiliate = await db.affiliate.findUnique({
      where: { id: affiliateId },
      include: { destinationLandingPage: true },
    })
    if (!affiliate || !affiliate.isActive) {
      throw { statusCode: 404, message: 'Affiliate not found' }
    }

    const redirectBase = clickRedirectUrl(
      affiliate.destinationLandingPage,
      affiliate.destinationUrl,
      hostedPageUrl,
    )
    if (!redirectBase) throw { statusCode: 404, message: 'Affiliate not found' }

    const visitor = resolveVisitorSid(sessionId)
    await db.affiliateReferralClick.create({
      data: {
        affiliateId: affiliate.id,
        landingPageId: affiliate.destinationLandingPageId,
        sessionId: visitor.sessionId,
      },
    })

    return { redirectUrl: withSid(redirectBase, visitor.token), sessionId: visitor.token }
  }

  async submitForm(data: { sessionId: string; name: string; email?: string; phone?: string }) {
    const sessionId = verifySid(data.sessionId)?.sessionId
    if (!sessionId) throw { statusCode: 400, message: 'Invalid session' }

    return db.$transaction(async (tx) => {
      const existingLead = await tx.lead.findFirst({
        where: { landingSessionId: sessionId },
        orderBy: { createdAt: 'desc' },
      })
      if (existingLead) {
        return { contactId: existingLead.contactId, leadId: existingLead.id }
      }

      // First-touch: credit whichever click started this session, not whichever click happened
      // most recently — a session can carry more than one click before the lead is ever created
      // (e.g. the same visitor clicks Deployment A, doesn't convert, later clicks Deployment B
      // with the same still-open session). Attribution must not silently move to B.
      const event = await tx.attributionEvent.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        include: {
          deployment: { include: { campaign: true } },
          adRun: { include: { advertisement: true } },
          adUnit: true,
        },
      })
      if (!event) throw { statusCode: 404, message: 'No matching tracked session' }

      // Canonical attribution-source resolution — one place that knows which of the three source
      // columns is authoritative for this event, instead of re-deriving it ad hoc here.
      // AttributionEvent's own columns (deploymentId/adRunId/adUnitId) have no "source" prefix —
      // that prefix only applies once a click is actually attributed to a Lead/Sale/Interaction —
      // so they're adapted into the shared AttributionSourceIds shape here at the boundary.
      const source = resolveAttributionSource({
        sourceAdRunId: event.adRunId,
        sourceDeploymentId: event.deploymentId,
        sourceAdUnitId: event.adUnitId,
      })
      if (!source) throw { statusCode: 404, message: 'No matching tracked session' }

      const businessId =
        event.adRun?.advertisement.businessId ??
        event.deployment?.campaign.businessId ??
        event.adUnit?.businessId
      if (!businessId) throw { statusCode: 404, message: 'No matching tracked session' }

      const { contact, lead, leadCreated } = await resolveContactAndLead(
        tx,
        businessId,
        { name: data.name, email: data.email, phone: data.phone, source: 'campaign' },
        {
          sourceType: sourceTypeForKind(source.kind),
          sourceDeploymentId: event.deploymentId,
          sourceAdRunId: event.adRunId,
          sourceAdUnitId: event.adUnitId,
          clickId: event.clickId,
          landingSessionId: event.sessionId,
        },
      )

      // Only a genuinely new Lead is a new conversion. Without this gate, a contact with an
      // already-open Lead (from an earlier click on a different deployment/ad run/ad unit) who
      // clicks *this* one in a fresh session and submits again reuses that same open Lead —
      // resolveContactAndLead correctly leaves attribution on the original source, but this
      // source would still get its conversions counter bumped for a conversion that isn't
      // actually new or attributed to it.
      if (leadCreated && event.deploymentId) {
        await tx.deployment.update({
          where: { id: event.deploymentId },
          data: { conversions: { increment: 1 } },
        })
      }
      if (leadCreated && event.adRunId) {
        await tx.adRun.update({
          where: { id: event.adRunId },
          data: { conversions: { increment: 1 } },
        })
      }
      if (leadCreated && event.adUnitId) {
        await tx.adUnit.update({
          where: { id: event.adUnitId },
          data: { conversions: { increment: 1 } },
        })
      }

      return { contactId: contact.id, leadId: lead.id }
    })
  }
}
