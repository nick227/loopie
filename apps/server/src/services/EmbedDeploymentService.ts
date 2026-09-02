import { db } from '@project/db'
import type { Prisma } from '@prisma/client'
import crypto from 'crypto'

export class EmbedDeploymentService {
  async get(publicId: string) {
    const deployment = await db.embedDeployment.findUnique({
      where: { publicId },
      include: {
        allowedOrigins: true,
        activePageVersion: true,
        activeAdvertisementVersion: true,
      },
    })
    if (!deployment) throw { statusCode: 404, message: 'Embed deployment not found' }
    return deployment
  }

  async list(businessId: string, type?: 'PAGE' | 'ADVERTISEMENT') {
    return db.embedDeployment.findMany({
      where: {
        ...(type === 'PAGE' ? { landingPage: { businessId } } : {}),
        ...(type === 'ADVERTISEMENT' ? { advertisement: { businessId } } : {}),
        ...(type ? { objectType: type } : {}),
      },
      include: {
        allowedOrigins: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createAdDeployment(
    businessId: string,
    advertisementId: string,
    versionId: string,
    domainPolicy: 'ANY' | 'ALLOWLIST' = 'ANY',
    allowedOrigins: string[] = [],
  ) {
    // Verify ownership
    const ad = await db.advertisement.findFirst({ where: { id: advertisementId, businessId } })
    if (!ad) throw { statusCode: 404, message: 'Advertisement not found' }

    const version = await db.publishedAdvertisementVersion.findFirst({
      where: { id: versionId, advertisementId },
    })
    if (!version) throw { statusCode: 404, message: 'Version not found' }

    const publicId = `ad_${crypto.randomBytes(12).toString('hex')}`

    return db.embedDeployment.create({
      data: {
        publicId,
        objectType: 'ADVERTISEMENT',
        advertisementId,
        activeAdvertisementVersionId: versionId,
        domainPolicy,
        allowedOrigins: {
          create: allowedOrigins.map((origin) => ({ normalizedOrigin: origin })),
        },
      },
      include: {
        allowedOrigins: true,
      },
    })
  }

  async createPageDeployment(
    businessId: string,
    landingPageId: string,
    versionId: string,
    domainPolicy: 'ANY' | 'ALLOWLIST' = 'ANY',
    allowedOrigins: string[] = [],
  ) {
    // Verify ownership
    const page = await db.landingPage.findFirst({ where: { id: landingPageId, businessId } })
    if (!page) throw { statusCode: 404, message: 'Landing page not found' }

    const version = await db.publishedPageVersion.findFirst({
      where: { id: versionId, landingPageId },
    })
    if (!version) throw { statusCode: 404, message: 'Version not found' }

    const publicId = `page_${crypto.randomBytes(12).toString('hex')}`

    return db.embedDeployment.create({
      data: {
        publicId,
        objectType: 'PAGE',
        landingPageId,
        activePageVersionId: versionId,
        domainPolicy,
        allowedOrigins: {
          create: allowedOrigins.map((origin) => ({ normalizedOrigin: origin })),
        },
      },
      include: {
        allowedOrigins: true,
      },
    })
  }
}
