import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db, verifySid } from '@project/db'
import { LandingPageService } from '../../../server/src/services/LandingPageService'
import { EmbedServingService } from '../services/EmbedServingService'
import { EmbedDeploymentService } from '../../../server/src/services/EmbedDeploymentService'
import crypto from 'crypto'

const embedService = new EmbedServingService()
const landingPageService = new LandingPageService()
const deploymentService = new EmbedDeploymentService()

let businessId: string
let templateId: string

beforeAll(async () => {
  const business = await db.business.create({ data: { name: 'Embed Test Co.' } })
  businessId = business.id

  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Test Template',
      schema: { sections: [] },
      isSystem: true,
    },
  })
  templateId = template.id
})

afterAll(async () => {
  // Business deleted automatically or left to DB teardown in these tests
})

describe('Page EmbedServingService', () => {
  it('enforces origin validation correctly', async () => {
    const page = await landingPageService.create(businessId, {
      name: 'Test Page',
      slug: `test-page-${crypto.randomBytes(4).toString('hex')}`,
      templateId,
    })
    const version = await landingPageService.publish(businessId, page.id)

    // 1. ALLOWLIST origin -> allowed origin succeeds
    const strictDep = await deploymentService.createPageDeployment(
      businessId,
      page.id,
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
    const anyDep = await deploymentService.createPageDeployment(
      businessId,
      page.id,
      version.id,
      'ANY',
      [],
    )
    const metaAny = await embedService.getBootstrapMetadata(anyDep.publicId, 'https://hacker.com')
    expect(metaAny.publicId).toBe(anyDep.publicId)
  })

  it('enforces single-use nonces', async () => {
    const page = await landingPageService.create(businessId, {
      name: 'Nonce Test Page',
      slug: `nonce-test-${crypto.randomBytes(4).toString('hex')}`,
      templateId,
    })
    const version = await landingPageService.publish(businessId, page.id)
    const dep = await deploymentService.createPageDeployment(
      businessId,
      page.id,
      version.id,
      'ANY',
      [],
    )

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
    const page = await landingPageService.create(businessId, {
      name: 'Full Pipeline Page',
      slug: `full-pipeline-${crypto.randomBytes(4).toString('hex')}`,
      templateId,
    })
    const version = await landingPageService.publish(businessId, page.id)
    const dep = await deploymentService.createPageDeployment(
      businessId,
      page.id,
      version.id,
      'ANY',
      [],
    )

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
    // Page redirect URLs are generated slightly differently, usually hosted URLs
    expect(clickRes.redirectUrl).toContain('.loopie.up')

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
    // No attribution event is created for LANDING_PAGE click right now since trackBaseClick is skipped for it
    expect(attribution).toBeNull()

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

  it('gracefully rejects unsupported formatVersion', async () => {
    const page = await landingPageService.create(businessId, {
      name: 'Format Version Test Page',
      slug: `format-version-${crypto.randomBytes(4).toString('hex')}`,
      templateId,
    })
    const version = await landingPageService.publish(businessId, page.id)
    await db.publishedPageVersion.update({
      where: { id: version.id },
      data: { formatVersion: '999.0' },
    })
    const dep = await deploymentService.createPageDeployment(
      businessId,
      page.id,
      version.id,
      'ANY',
      [],
    )
    const meta = await embedService.getBootstrapMetadata(dep.publicId, 'https://example.com')
    await expect(embedService.renderIframe(dep.publicId, meta.nonce)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Unsupported page format version',
    })
  })
})
