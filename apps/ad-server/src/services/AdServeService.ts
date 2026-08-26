import { db } from '@project/db'
import { randomUUID } from 'crypto'
import { escapeHtml } from '../lib/html'

const PRIMARY_APP_URL = process.env.PRIMARY_APP_URL ?? 'http://localhost:3001'
const AD_SERVER_URL = process.env.AD_SERVER_URL ?? `http://localhost:${process.env.AD_SERVER_PORT ?? 3002}`

function hostedPageUrl(slug: string) {
  return `${PRIMARY_APP_URL}/p/${slug}`
}

// The redirect must carry the session id forward — same fix as apps/server's
// AttributionService.trackClick (see its comment); without it a real visitor's landing-page
// view/submission never links back to the click that produced it.
function withSid(url: string, sid: string): string {
  const u = new URL(url)
  u.searchParams.set('sid', sid)
  return u.toString()
}

export class AdServeService {
  async getServePayload(adUnitId: string) {
    const adUnit = await this._findServable(adUnitId)
    const creative = await db.creative.findUnique({
      where: { id: adUnit.creativeId },
      include: { assets: { include: { asset: true } } },
    })

    return {
      adUnitId: adUnit.id,
      format: adUnit.format,
      creative: creative
        ? {
            id: creative.id,
            name: creative.name,
            hostedUrl: creative.hostedUrl,
            assets: creative.assets.map((ca) => ({
              id: ca.asset.id,
              type: ca.asset.type,
              url: ca.asset.url,
              textContent: ca.asset.textContent,
            })),
          }
        : null,
      impressionUrl: `${AD_SERVER_URL}/impression/${adUnit.id}`,
      clickUrl: `${AD_SERVER_URL}/click/${adUnit.id}`,
    }
  }

  // Lightweight, self-contained HTML for an <iframe> embed — the whole unit is one click-through
  // link, per the "lightweight public embed endpoints" requirement.
  async renderEmbed(adUnitId: string, sessionId?: string) {
    const payload = await this.getServePayload(adUnitId)
    await this.recordImpression(adUnitId)

    const sid = sessionId ?? randomUUID()
    const clickUrl = `${payload.clickUrl}?sid=${encodeURIComponent(sid)}`
    const image = payload.creative?.assets.find((a) => a.type === 'IMAGE')
    const headline = payload.creative?.assets.find((a) => a.type === 'TEXT')
    const alt = escapeHtml(payload.creative?.name ?? '')
    const headlineText = headline?.textContent ? escapeHtml(headline.textContent) : ''
    const imageUrl = image?.url ? escapeHtml(image.url) : ''

    return `<!doctype html>
<html><head><meta charset="utf-8" /><style>body{margin:0}a{display:block;text-decoration:none;color:inherit}img{max-width:100%;display:block}</style></head>
<body>
<a href="${escapeHtml(clickUrl)}" target="_top">
${imageUrl ? `<img src="${imageUrl}" alt="${alt}" />` : ''}
${headlineText ? `<div style="padding:8px;font-family:system-ui,sans-serif">${headlineText}</div>` : ''}
</a>
</body></html>`
  }

  // Counter increment only, no per-row write — impressions are orders of magnitude higher
  // volume than clicks or page views, so this is the cheapest possible write on the hot path.
  async recordImpression(adUnitId: string) {
    await this._findServable(adUnitId)
    await db.adUnit.update({
      where: { id: adUnitId },
      data: { impressions: { increment: 1 }, lastServedAt: new Date() },
    })
  }

  // A click carries session identity a later landing-page form submission needs to attribute
  // back to — so unlike an impression, it gets a full AttributionEvent row (shared with the
  // primary server's Deployment click path — see AttributionService.trackClick there).
  async recordClick(adUnitId: string, sessionId?: string) {
    const adUnit = await db.adUnit.findUnique({
      where: { id: adUnitId },
      include: { campaign: true, destinationLandingPage: true },
    })
    if (!adUnit || adUnit.status !== 'ACTIVE') throw { statusCode: 404, message: 'Ad unit not available' }

    const sid = sessionId ?? randomUUID()
    await db.attributionEvent.create({
      data: {
        campaignId: adUnit.campaignId,
        creativeId: adUnit.creativeId,
        adUnitId: adUnit.id,
        landingPageId: adUnit.destinationLandingPageId,
        platform: 'LOOPIE',
        sessionId: sid,
      },
    })
    await db.adUnit.update({
      where: { id: adUnit.id },
      data: { clicks: { increment: 1 }, lastServedAt: new Date() },
    })

    const baseUrl = adUnit.destinationLandingPage
      ? hostedPageUrl(adUnit.destinationLandingPage.slug)
      : (adUnit.destinationUrl ?? adUnit.campaign.destinationUrl ?? '/')
    const redirectUrl = /^https?:\/\//.test(baseUrl) ? withSid(baseUrl, sid) : baseUrl

    return { redirectUrl, sessionId: sid }
  }

  private async _findServable(adUnitId: string) {
    const adUnit = await db.adUnit.findUnique({ where: { id: adUnitId } })
    if (!adUnit || adUnit.status !== 'ACTIVE') throw { statusCode: 404, message: 'Ad unit not available' }
    return adUnit
  }
}
