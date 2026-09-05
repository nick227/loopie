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
    } else if (deployment.activePageVersionId !== page.publishedVersion.id) {
      // get-or-create is the product's "give me the current embed" path — promote the default
      // ANY deployment to the latest published snapshot. Publish alone does not auto-promote
      // (other named deployments may pin older versions); opening Embed after republish must.
      deployment = await db.embedDeployment.update({
        where: { id: deployment.id },
        data: { activePageVersionId: page.publishedVersion.id },
        include: { allowedOrigins: true },
      })
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
    } else if (deployment.activeAdvertisementVersionId !== latestVersion.id) {
      deployment = await db.embedDeployment.update({
        where: { id: deployment.id },
        data: { activeAdvertisementVersionId: latestVersion.id },
        include: { allowedOrigins: true },
      })
    }

    return reply.send({
      data: {
        ...deployment,
        // Additive for snippet sizing — not yet on EmbedDeployment OpenAPI schema.
        format: latestVersion.format,
      },
    })
  }

  throw { statusCode: 400, message: 'Invalid object type' }
}
