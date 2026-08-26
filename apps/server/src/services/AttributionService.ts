import {
  db,
  verifySid,
  clickRedirectUrl,
  trackBaseClick,
  withSid,
  resolveVisitorSid,
} from '@project/db'
import { hostedPageUrl } from '../lib/urls'
import { resolveContactAndLead } from '../lib/identityResolution'

export class AttributionService {
  async trackClick(deploymentId: string, sessionId?: string) {
    const deployment = await db.deployment.findUnique({
      where: { id: deploymentId },
      include: { campaign: true, destinationLandingPage: true },
    })
    if (!deployment || deployment.status !== 'ACTIVE') {
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
      onRecord: async () => {
        await db.deployment.update({
          where: { id: deployment.id },
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

      const event = await tx.attributionEvent.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        include: {
          deployment: { include: { campaign: true } },
          adUnit: true,
        },
      })
      if (!event) throw { statusCode: 404, message: 'No matching tracked session' }

      const businessId = event.deployment?.campaign.businessId ?? event.adUnit?.businessId
      if (!businessId) throw { statusCode: 404, message: 'No matching tracked session' }

      const sourceType = event.deploymentId ? ('DEPLOYMENT' as const) : ('AD_UNIT' as const)
      const { contact, lead } = await resolveContactAndLead(
        tx,
        businessId,
        { name: data.name, email: data.email, phone: data.phone, source: 'campaign' },
        {
          sourceType,
          sourceDeploymentId: event.deploymentId,
          sourceAdUnitId: event.adUnitId,
          clickId: event.clickId,
          landingSessionId: event.sessionId,
        },
      )

      if (event.deploymentId) {
        await tx.deployment.update({
          where: { id: event.deploymentId },
          data: { conversions: { increment: 1 } },
        })
      }
      if (event.adUnitId) {
        await tx.adUnit.update({
          where: { id: event.adUnitId },
          data: { conversions: { increment: 1 } },
        })
      }

      return { contactId: contact.id, leadId: lead.id }
    })
  }
}
