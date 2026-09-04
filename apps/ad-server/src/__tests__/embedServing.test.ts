import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db, verifySid } from '@project/db'
import { EmbedServingService } from '../services/EmbedServingService'
import { AdvertisementService } from '../../../server/src/services/AdvertisementService'
import { EmbedDeploymentService } from '../../../server/src/services/EmbedDeploymentService'
import { requireAssets } from '../../../server/src/lib/ownership'

const embedService = new EmbedServingService()
const advertisementService = new AdvertisementService()
const deploymentService = new EmbedDeploymentService()

let businessId: string
let assetId: string

beforeAll(async () => {
  const business = await db.business.create({ data: { name: 'Embed Test Co.' } })
  businessId = business.id

  const asset = await db.asset.create({
    data: {
      businessId,
      type: 'IMAGE',
      name: 'Ad Image',
      url: 'https://example.com/img.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    },
  })
  assetId = asset.id
})

afterAll(async () => {
  // Business deleted automatically or left to DB teardown in these tests
})

describe('EmbedServingService', () => {
  it('enforces origin validation correctly', async () => {
    const ad = await advertisementService.create(businessId, {
      name: 'Test Ad',
      assetIds: [assetId],
    })
    const version = await advertisementService.publish(businessId, ad.id, {
      destinationUrl: 'https://example.com',
    })

    // 1. ALLOWLIST origin -> allowed origin succeeds
    const strictDep = await deploymentService.createAdDeployment(
      businessId,
      ad.id,
      version.id,
      'ALLOWLIST',
      ['https://allowed.com'],
    )
    const metaAllowed = await embedService.getBootstrapMetadata(
      strictDep.publicId,
      'https://allowed.com',
    )
    expect(metaAllowed.publicId).toBe(strictDep.publicId)

    // 2. ALLOWLIST origin -> different origin fails
    try {
      await embedService.getBootstrapMetadata(strictDep.publicId, 'https://hacker.com')
      expect.unreachable('Should have thrown')
    } catch (e: any) {
      expect(e.statusCode).toBe(403)
      expect(e.message).toBe('Origin not allowed')
    }

    // 3. ANY origin -> bootstrap/render succeeds
    const anyDep = await deploymentService.createAdDeployment(
      businessId,
      ad.id,
      version.id,
      'ANY',
      [],
    )
    const metaAny = await embedService.getBootstrapMetadata(anyDep.publicId, 'https://hacker.com')
    expect(metaAny.publicId).toBe(anyDep.publicId)
  })

  it('enforces single-use nonces', async () => {
    const ad = await advertisementService.create(businessId, {
      name: 'Nonce Test Ad',
      assetIds: [assetId],
    })
    const version = await advertisementService.publish(businessId, ad.id, {
      destinationUrl: 'https://example.com',
    })
    const dep = await deploymentService.createAdDeployment(businessId, ad.id, version.id, 'ANY', [])

    const meta = await embedService.getBootstrapMetadata(dep.publicId, 'https://example.com')
    const nonce = meta.nonce!

    // First render succeeds
    const html = await embedService.renderIframe(dep.publicId, nonce)
    expect(html).toContain('<!doctype html>')

    // Second render fails
    try {
      await embedService.renderIframe(dep.publicId, nonce)
      expect.unreachable('Should have thrown')
    } catch (e: any) {
      expect(e.statusCode).toBe(401)
      expect(e.message).toBe('Invalid or expired nonce')
    }

    // Exactly one EmbedInstance exists
    const instances = await db.embedInstance.findMany({ where: { embedDeploymentId: dep.id } })
    expect(instances.length).toBe(1)
  })

  it('runs the full publish -> render -> impression -> click pipeline', async () => {
    const ad = await advertisementService.create(businessId, {
      name: 'Full Pipeline Ad',
      assetIds: [assetId],
    })
    const version = await advertisementService.publish(businessId, ad.id, {
      destinationUrl: 'https://example.com/offer',
    })
    const dep = await deploymentService.createAdDeployment(businessId, ad.id, version.id, 'ANY', [])

    const meta = await embedService.getBootstrapMetadata(dep.publicId, 'https://test.com')
    expect(meta.nonce).toBeDefined()

    const html = await embedService.renderIframe(dep.publicId, meta.nonce)
    const instances = await db.embedInstance.findMany({ where: { embedDeploymentId: dep.id } })
    expect(instances.length).toBe(1)
    const instanceId = instances[0]!.id

    // Impression twice
    await embedService.recordImpression(dep.publicId, instanceId)
    await embedService.recordImpression(dep.publicId, instanceId)

    // Click
    const clickRes = await embedService.recordClick(dep.publicId, instanceId)
    expect(clickRes.redirectUrl).toContain('https://example.com/offer')

    // Verify 1 qualifying impression
    const impressions = await db.embedEvent.findMany({
      where: { embedInstanceId: instanceId, eventType: 'AD_IMPRESSION' },
    })
    expect(impressions.length).toBe(1)

    // Verify 1 qualifying click
    const clicks = await db.embedEvent.findMany({
      where: { embedInstanceId: instanceId, eventType: 'AD_CLICK' },
    })
    expect(clicks.length).toBe(1)

    const attribution = await db.attributionEvent.findFirst({
      where: { embedInstanceId: instanceId },
    })
    expect(attribution).toBeDefined()
    expect(attribution!.embedDeploymentId).toBe(dep.id)
    expect(attribution!.embedVersionId).toBe(version.id)

    // Outbox records match persisted events
    const outboxImpression = await db.embedProjectionOutbox.findFirst({
      where: { embedEventId: impressions[0]!.id },
    })
    expect(outboxImpression).toBeDefined()

    const outboxClick = await db.embedProjectionOutbox.findFirst({
      where: { embedEventId: clicks[0]!.id },
    })
    expect(outboxClick).toBeDefined()
  })

  it('renders a real Ad Designer creative through the shared renderer, not the old stub', async () => {
    const ad = await advertisementService.create(businessId, {
      name: 'Poster Ad',
      assetIds: [assetId],
      format: 'POSTER',
      headline: 'Big Sale',
      primaryText: '20% off',
      ctaLabel: 'Shop now',
    })
    const version = await advertisementService.publish(businessId, ad.id, {
      destinationUrl: 'https://example.com/sale',
    })
    const dep = await deploymentService.createAdDeployment(businessId, ad.id, version.id, 'ANY', [])
    const meta = await embedService.getBootstrapMetadata(dep.publicId, 'https://test.com')

    const html = await embedService.renderIframe(dep.publicId, meta.nonce)
    expect(html).not.toContain('AD CONTENT')
    expect(html).toContain('adc--poster')
    expect(html).toContain('Big Sale')
    expect(html).toContain('Shop now')
    expect(html).toContain('https://example.com/img.jpg')
  })

  it('renders the direct internal /ads/:advertisementId/embed route with the same renderer', async () => {
    const ad = await advertisementService.create(businessId, {
      name: 'Story Ad',
      assetIds: [assetId],
      format: 'STORY',
      headline: 'New Arrivals',
    })
    await advertisementService.publish(businessId, ad.id, {
      destinationUrl: 'https://example.com/new',
    })

    const html = await embedService.renderAdvertisementEmbed(ad.id)
    expect(html).toContain('adc--story')
    expect(html).toContain('New Arrivals')
    expect(html).toContain('href="https://example.com/new"')
  })
})
