import { db, resolveVisitorSid, verifySid } from '@project/db'
import { hostedPageUrl } from '../lib/urls'
import { resolveContactAndLead } from '../lib/identityResolution'

function withSid(url: string, sid: string): string {
  const u = new URL(url)
  u.searchParams.set('sid', sid)
  return u.toString()
}

function clickRedirectUrl(
  page: { slug: string; status: string; deletedAt: Date | null } | null,
  fallbackUrl: string | null,
): string | null {
  if (page) {
    if (page.deletedAt || page.status !== 'PUBLISHED') return null
    return hostedPageUrl(page.slug)
  }
  if (fallbackUrl && /^https?:\/\//.test(fallbackUrl)) return fallbackUrl
  return null
}

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
    )
    if (!redirectBase) throw { statusCode: 404, message: 'Deployment not found' }

    const visitor = resolveVisitorSid(sessionId)
    await db.attributionEvent.create({
      data: {
        campaignId: deployment.campaignId,
        creativeId: deployment.creativeId,
        deploymentId: deployment.id,
        landingPageId: deployment.destinationLandingPageId,
        platform: deployment.platform,
        sessionId: visitor.sessionId,
      },
    })
    await db.deployment.update({ where: { id: deployment.id }, data: { clicks: { increment: 1 } } })

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
