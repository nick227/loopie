import { readFile } from 'fs/promises'
import { db } from '@project/db'
import { getConnector } from '../lib/platforms/registry'
import { unsealToken } from '../lib/platforms/encrypt'
import { localPath } from '../lib/mediaStorage/local'
import { trackedDeploymentUrl } from '../lib/urls'
import { DeploymentService } from './DeploymentService'

const deployments = new DeploymentService()

function uploadKey(url: string) {
  if (!url.startsWith('/uploads/')) return null
  return url.slice('/uploads/'.length)
}

export class DeploymentPushService {
  async push(businessId: string, deploymentId: string) {
    const deployment = await db.deployment.findFirst({
      where: { id: deploymentId, campaign: { businessId } },
      include: {
        campaign: true,
        creative: { include: { assets: { include: { asset: true } } } },
      },
    })
    if (!deployment) throw { statusCode: 404, message: 'Deployment not found' }
    if (deployment.externalAdId) return deployments.get(businessId, deploymentId)

    const connector = getConnector(deployment.platform)
    if (!connector.capabilities.pushDraft) {
      throw { statusCode: 501, message: 'This platform does not support draft push' }
    }
    if (!connector.configured())
      throw { statusCode: 503, message: `${deployment.platform} is not configured` }

    const connection = await db.platformConnection.findUnique({
      where: { businessId_platform: { businessId, platform: deployment.platform } },
    })
    if (
      !connection ||
      connection.status !== 'CONNECTED' ||
      !connection.adAccountId ||
      !connection.pageId
    ) {
      throw { statusCode: 409, message: 'Connect and map this platform first' }
    }

    const imageAsset = deployment.creative.assets
      .map((row) => row.asset)
      .find((asset) => asset.type === 'IMAGE' && asset.url && !asset.deletedAt)
    const key = imageAsset?.url ? uploadKey(imageAsset.url) : null
    if (!imageAsset || !key) {
      throw { statusCode: 409, message: 'Creative needs a LOOPIE-hosted image to push' }
    }
    const bytes = await readFile(localPath(key))
    const text = deployment.creative.assets
      .map((row) => row.asset)
      .find((asset) => asset.type === 'TEXT' && asset.textContent)

    const result = await connector.pushDraft({
      accessToken: unsealToken(connection.accessTokenEnc),
      adAccountId: connection.adAccountId,
      pageId: connection.pageId,
      defaultCountry: connection.defaultCountry,
      campaignName: deployment.campaign.name,
      creativeName: deployment.creative.name,
      trackedUrl: trackedDeploymentUrl(deployment.id),
      dailyBudgetCents: Math.round(Number(deployment.campaign.budget) * 100),
      image: {
        bytes,
        filename: key,
        mimeType: imageAsset.mimeType ?? 'image/png',
      },
      message: text?.textContent ?? deployment.creative.name,
    })

    await db.deployment.update({
      where: { id: deployment.id },
      data: {
        externalCampaignId: result.externalCampaignId,
        externalAdSetId: result.externalAdSetId,
        externalAdId: result.externalAdId,
        lastSyncedAt: new Date(),
      },
    })
    return deployments.get(businessId, deployment.id)
  }
}
