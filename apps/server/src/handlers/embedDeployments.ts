import { EmbedDeploymentService } from '../services/EmbedDeploymentService'
import { db } from '@project/db'

const deploymentService = new EmbedDeploymentService()

export async function getOrCreateEmbedDeployment(request: any, reply: any) {
  const { objectType, objectId } = request.body
  const businessId = request.user.businessId

  if (objectType === 'PAGE') {
    const page = await db.landingPage.findUnique({
      where: { id: objectId },
      include: { publishedVersion: true },
    })

    if (!page || page.businessId !== businessId) {
      throw { statusCode: 404, message: 'Page not found' }
    }

    // Use the explicit error message required by the user
    if (!page.publishedVersion) {
      throw { statusCode: 400, message: 'Publish this page before embedding it.' }
    }

    let deployment = await db.embedDeployment.findFirst({
      where: {
        objectType: 'PAGE',
        landingPageId: objectId,
        domainPolicy: 'ANY',
      },
      include: {
        allowedOrigins: true,
      },
    })

    if (!deployment) {
      deployment = await deploymentService.createPageDeployment(
        businessId,
        objectId,
        page.publishedVersion.id,
        'ANY',
        [],
      )
    }

    return reply.send({ data: deployment })
  }

  if (objectType === 'ADVERTISEMENT') {
    const ad = await db.advertisement.findUnique({
      where: { id: objectId },
    })

    if (!ad || ad.businessId !== businessId) {
      throw { statusCode: 404, message: 'Advertisement not found' }
    }

    const latestVersion = await db.publishedAdvertisementVersion.findFirst({
      where: { advertisementId: objectId },
      orderBy: { version: 'desc' },
    })

    if (!latestVersion) {
      throw { statusCode: 400, message: 'Publish this advertisement before embedding it.' }
    }

    let deployment = await db.embedDeployment.findFirst({
      where: {
        objectType: 'ADVERTISEMENT',
        advertisementId: objectId,
        domainPolicy: 'ANY',
      },
      include: {
        allowedOrigins: true,
      },
    })

    if (!deployment) {
      deployment = await deploymentService.createAdDeployment(
        businessId,
        objectId,
        latestVersion.id,
        'ANY',
        [],
      )
    }

    return reply.send({ data: deployment })
  }

  throw { statusCode: 400, message: 'Invalid object type' }
}
