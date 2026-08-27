import { db, resolveVisitorSid, verifySid, trackBaseClick } from '@project/db'
import type { Prisma } from '@prisma/client'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

type SessionQuery = {
  businessId: string
  sid?: string
  adRunId?: string
  deploymentId?: string
  gclid?: string
  fbclid?: string
  ttclid?: string
  click_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

function clickIds(q: SessionQuery) {
  const ids: Record<string, string> = {}
  if (q.gclid) ids.gclid = q.gclid
  if (q.fbclid) ids.fbclid = q.fbclid
  if (q.ttclid) ids.ttclid = q.ttclid
  if (q.click_id) ids.click_id = q.click_id
  return ids
}

function utms(q: SessionQuery) {
  const u: Record<string, string> = {}
  if (q.utm_source) u.source = q.utm_source
  if (q.utm_medium) u.medium = q.utm_medium
  if (q.utm_campaign) u.campaign = q.utm_campaign
  if (q.utm_content) u.content = q.utm_content
  if (q.utm_term) u.term = q.utm_term
  return u
}

export class TrackingRuntimeService {
  async ensureSession(query: SessionQuery) {
    const business = await db.business.findFirst({ where: { id: query.businessId } })
    if (!business) throw { statusCode: 404, message: 'Business not found' }

    // The sid is bound to this businessId in its own signature (see signedSid.ts), so a sid
    // minted for a different business fails verification here and a brand-new session is
    // minted instead — it can never resolve to another tenant's existing session row.
    const visitor = resolveVisitorSid(query.sid, query.businessId)
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    const incomingClicks = clickIds(query)
    const incomingUtms = utms(query)
    const firstSourceType = query.adRunId ? 'AD_RUN' : query.deploymentId ? 'DEPLOYMENT' : null

    // Belt-and-suspenders alongside the token scoping above: never read or write a session row
    // that isn't this business's, even if the id lookup alone would have matched one.
    const existing = await db.loopieSession.findFirst({
      where: { id: visitor.sessionId, businessId: query.businessId },
    })
    const row = existing
      ? await db.loopieSession.update({
          where: { id: visitor.sessionId },
          data: {
            lastSeenAt: new Date(),
            expiresAt,
            firstAdRunId: existing.firstAdRunId ?? query.adRunId ?? null,
            firstDeploymentId: existing.firstDeploymentId ?? query.deploymentId ?? null,
            firstSourceType: existing.firstSourceType ?? firstSourceType,
            platformClickIds: (Object.keys((existing.platformClickIds as object) ?? {}).length
              ? existing.platformClickIds
              : incomingClicks) as Prisma.InputJsonValue,
            utms: (Object.keys((existing.utms as object) ?? {}).length
              ? existing.utms
              : incomingUtms) as Prisma.InputJsonValue,
          },
        })
      : await db.loopieSession.create({
          data: {
            id: visitor.sessionId,
            businessId: query.businessId,
            firstAdRunId: query.adRunId ?? null,
            firstDeploymentId: query.deploymentId ?? null,
            firstSourceType,
            platformClickIds: incomingClicks,
            utms: incomingUtms,
            expiresAt,
          },
        })

    if (query.adRunId && !existing?.firstAdRunId) {
      const already = await db.attributionEvent.findFirst({
        where: { sessionId: visitor.sessionId, adRunId: query.adRunId },
      })
      if (!already) {
        const run = await db.adRun.findFirst({
          where: { id: query.adRunId },
          include: { advertisement: true, campaignLinks: true },
        })
        if (run && run.advertisement.businessId === query.businessId) {
          await trackBaseClick({
            adRunId: run.id,
            campaignId: run.campaignLinks[0]?.campaignId,
            platform: run.platform,
            sessionId: visitor.token,
            clickId: query.click_id ?? query.gclid ?? query.fbclid ?? null,
          })
        }
      }
    }

    return {
      sessionId: visitor.sessionId,
      token: visitor.token,
      firstAdRunId: row.firstAdRunId,
      firstSourceType: row.firstSourceType,
      platformClickIds: row.platformClickIds,
      utms: row.utms,
    }
  }

  async track(input: {
    businessId: string
    sessionId: string
    type: string
    pageUrl?: string
    adRunId?: string
    clickId?: string
  }) {
    const verified = verifySid(input.sessionId, input.businessId)
    if (!verified) throw { statusCode: 400, message: 'Invalid session' }
    const session = await db.loopieSession.findFirst({
      where: { id: verified.sessionId, businessId: input.businessId },
    })
    if (!session) throw { statusCode: 404, message: 'Session not found' }
    await db.loopieSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
  }
}
