import { db, resolveVisitorSid } from './client'

export function withSid(url: string, sid: string): string {
  const u = new URL(url)
  u.searchParams.set('sid', sid)
  return u.toString()
}

// A campaign past its scheduled endDate stops accepting new tracked clicks/impressions even if
// nobody has explicitly called POST /campaigns/{id}/end — server-side tracking is the one thing
// this app can gate on its own database state without depending on an external platform actually
// having stopped delivery (see CLAUDE.md's Campaign Inventory Reconciliation / Production Ops for
// the broader "no live platform sync in V1" boundary this respects).
export function isCampaignEnded(campaign: { endDate: Date | null }): boolean {
  return campaign.endDate != null && campaign.endDate.getTime() < Date.now()
}

// Same reasoning as isCampaignEnded above, but for a standalone AdRun — an AdRun's endDate is its
// own field (not derived from a parent Campaign, since CampaignAdRun grouping is optional), so it
// needs its own gate rather than reusing isCampaignEnded.
export function isAdRunEnded(adRun: { endDate: Date | null }): boolean {
  return adRun.endDate != null && adRun.endDate.getTime() < Date.now()
}

export function clickRedirectUrl(
  page: { slug: string; status: string; deletedAt: Date | null } | null,
  fallbackUrl: string | null,
  hostedPageUrlFn: (slug: string) => string,
): string | null {
  if (page) {
    if (page.deletedAt || page.status !== 'PUBLISHED') return null
    return hostedPageUrlFn(page.slug)
  }
  if (fallbackUrl && /^https?:\/\//.test(fallbackUrl)) return fallbackUrl
  return null
}

export async function trackBaseClick({
  campaignId,
  creativeId,
  deploymentId,
  adRunId,
  adUnitId,
  landingPageId,
  platform,
  sessionId,
  clickId,
  onRecord,
}: {
  campaignId?: string
  creativeId?: string
  deploymentId?: string | null
  adRunId?: string | null
  adUnitId?: string | null
  landingPageId?: string | null
  platform?: any
  sessionId?: string
  clickId?: string | null
  onRecord?: () => Promise<void>
}) {
  const visitor = resolveVisitorSid(sessionId)
  await db.attributionEvent.create({
    data: {
      campaignId,
      creativeId,
      deploymentId,
      adRunId,
      adUnitId,
      landingPageId,
      platform,
      sessionId: visitor.sessionId,
      clickId: clickId || null,
    },
  })

  if (onRecord) {
    await onRecord()
  }

  return visitor.token
}
