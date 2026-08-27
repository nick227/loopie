import { db, clickRedirectUrl, trackBaseClick, withSid, absoluteMediaUrl } from '@project/db'
import { escapeHtml } from '../lib/html'

const PRIMARY_APP_URL = process.env.PRIMARY_APP_URL ?? 'http://localhost:3001'
const AD_SERVER_URL =
  process.env.AD_SERVER_URL ?? `http://localhost:${process.env.AD_SERVER_PORT ?? 3002}`

function hostedPageUrl(slug: string) {
  return `${PRIMARY_APP_URL}/p/${slug}`
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
              url: absoluteMediaUrl(ca.asset.url, PRIMARY_APP_URL),
              textContent: ca.asset.textContent,
            })),
          }
        : null,
      impressionUrl: `${AD_SERVER_URL}/impression/${adUnit.id}`,
      clickUrl: `${AD_SERVER_URL}/click/${adUnit.id}`,
    }
  }

  async renderEmbed(adUnitId: string, sessionId?: string) {
    const payload = await this.getServePayload(adUnitId)
    await this.recordImpression(adUnitId)

    const clickUrl = `${payload.clickUrl}?sid=${encodeURIComponent(sessionId ?? '')}`
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

  async recordImpression(adUnitId: string) {
    await this._findServable(adUnitId)
    await db.adUnit.update({
      where: { id: adUnitId },
      data: { impressions: { increment: 1 }, lastServedAt: new Date() },
    })
  }

  async recordClick(adUnitId: string, sessionId?: string) {
    const adUnit = await db.adUnit.findUnique({
      where: { id: adUnitId },
      include: { campaign: true, destinationLandingPage: true },
    })
    if (!adUnit || adUnit.status !== 'ACTIVE')
      throw { statusCode: 404, message: 'Ad unit not available' }

    const redirectBase = clickRedirectUrl(
      adUnit.destinationLandingPage,
      adUnit.destinationUrl ?? adUnit.campaign.destinationUrl,
      hostedPageUrl,
    )
    if (!redirectBase) throw { statusCode: 404, message: 'Ad unit not available' }

    const sidToken = await trackBaseClick({
      campaignId: adUnit.campaignId,
      creativeId: adUnit.creativeId,
      adUnitId: adUnit.id,
      landingPageId: adUnit.destinationLandingPageId,
      platform: 'LOOPIE',
      sessionId,
      onRecord: async () => {
        await db.adUnit.update({
          where: { id: adUnit.id },
          data: { clicks: { increment: 1 }, lastServedAt: new Date() },
        })
      },
    })

    return { redirectUrl: withSid(redirectBase, sidToken), sessionId: sidToken }
  }

  private async _findServable(adUnitId: string) {
    const adUnit = await db.adUnit.findUnique({ where: { id: adUnitId } })
    if (!adUnit || adUnit.status !== 'ACTIVE')
      throw { statusCode: 404, message: 'Ad unit not available' }
    return adUnit
  }
}
