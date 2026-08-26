import { db, resolveVisitorSid } from './client'

export function withSid(url: string, sid: string): string {
  const u = new URL(url)
  u.searchParams.set('sid', sid)
  return u.toString()
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
  adUnitId,
  landingPageId,
  platform,
  sessionId,
  onRecord,
}: {
  campaignId?: string
  creativeId?: string
  deploymentId?: string | null
  adUnitId?: string | null
  landingPageId?: string | null
  platform?: any
  sessionId?: string
  onRecord?: () => Promise<void>
}) {
  const visitor = resolveVisitorSid(sessionId)
  await db.attributionEvent.create({
    data: {
      campaignId,
      creativeId,
      deploymentId,
      adUnitId,
      landingPageId,
      platform,
      sessionId: visitor.sessionId,
    },
  })

  if (onRecord) {
    await onRecord()
  }

  return visitor.token
}
