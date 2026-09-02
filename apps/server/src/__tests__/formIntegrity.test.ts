import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db, issueSid } from '@project/db'
import { LandingPageSubmissionService } from '../services/LandingPageSubmissionService'
import { processEmbedOutbox } from '../services/activity/EmbedProjectionWorker'
import { randomUUID } from 'crypto'
import { snapshotForm } from '@project/page-renderer'

describe('Form Integrity', () => {
  let businessId: string
  let landingPageId: string
  let formId: string
  let embedDeploymentId: string
  let embedInstanceId: string

  const submissionService = new LandingPageSubmissionService()

  beforeEach(async () => {
    businessId = randomUUID()
    await db.business.create({ data: { id: businessId, name: 'Test Business' } })

    const form = await db.form.create({
      data: {
        businessId,
        name: 'Test Form',
        fields: {
          create: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
        },
      },
    })
    formId = form.id

    const template = await db.landingPageTemplate.create({
      data: { businessId, name: 'Test Template', schema: { blocks: [] } },
    })

    const publishedVersionId = randomUUID()
    const snapshot = await snapshotForm(db, form.id)

    // LandingPage <-> PublishedPageVersion is a genuine FK cycle (see helpers/setup.ts's cleanup
    // comment) — the page must exist before the version can reference it, and only then can the
    // page's publishedVersionId be set.
    const page = await db.landingPage.create({
      data: {
        id: randomUUID(),
        businessId,
        templateId: template.id,
        formId: form.id,
        name: 'Test Page',
        slug: `test-page-${Date.now()}`,
        status: 'PUBLISHED',
        content: {},
        theme: {},
      },
    })
    landingPageId = page.id

    await db.publishedPageVersion.create({
      data: {
        id: publishedVersionId,
        landingPageId: page.id,
        version: 1,
        formId: form.id,
        formSnapshot: snapshot as any,
        content: {},
        checksum: '123',
      },
    })

    await db.landingPage.update({ where: { id: page.id }, data: { publishedVersionId } })

    const deployment = await db.embedDeployment.create({
      data: {
        id: randomUUID(),
        publicId: `page_${randomUUID()}`,
        objectType: 'PAGE',
        landingPageId: page.id,
        activePageVersionId: publishedVersionId,
        domainPolicy: 'ANY',
      },
    })
    embedDeploymentId = deployment.id

    const instance = await db.embedInstance.create({
      data: {
        id: randomUUID(),
        objectType: 'PAGE',
        objectId: page.id,
        embedDeploymentId,
        versionId: publishedVersionId,
        snapshotChecksum: '123',
        authorizedOrigin: 'https://example.com',
      },
    })
    embedInstanceId = instance.id
  })

  it('validates idempotencyKey and deduplicates submissions', async () => {
    const idempotencyKey = randomUUID()
    const sessionId = issueSid().token

    const res1 = await submissionService.submit(landingPageId, {
      sessionId,
      idempotencyKey,
      data: { email: 'test@example.com' },
    })

    const res2 = await submissionService.submit(landingPageId, {
      sessionId,
      idempotencyKey,
      data: { email: 'test@example.com' },
    })

    expect(res1.submissionId).toBe(res2.submissionId)

    const submissions = await db.formSubmission.findMany({ where: { idempotencyKey } })
    expect(submissions).toHaveLength(1)

    const outbox = await db.embedProjectionOutbox.findMany({ where: { idempotencyKey } })
    expect(outbox).toHaveLength(1)
  })

  it('rejects submissions with missing snapshot fields and strips extra fields', async () => {
    const idempotencyKey = randomUUID()
    const sessionId = issueSid().token

    await expect(
      submissionService.submit(landingPageId, {
        sessionId,
        idempotencyKey,
        data: {}, // Missing email
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /Missing required field: email/ })

    const res = await submissionService.submit(landingPageId, {
      sessionId,
      idempotencyKey,
      data: { email: 'test@example.com', extra: 'bad' },
    })

    const submission = await db.formSubmission.findUnique({ where: { id: res.submissionId } })
    const storedData = submission!.data as Record<string, unknown>
    expect(storedData.email).toBe('test@example.com')
    expect(storedData.extra).toBeUndefined()
  })

  it('rejects submissions with mismatched embedInstanceId', async () => {
    // A deployment for a different object entirely (no landingPageId at all) — satisfies the
    // service's `deployment.landingPageId !== page.id` check without needing a second full page.
    const otherDeployment = await db.embedDeployment.create({
      data: {
        publicId: `ad_${randomUUID()}`,
        objectType: 'ADVERTISEMENT',
        domainPolicy: 'ANY',
      },
    })
    const badInstance = await db.embedInstance.create({
      data: {
        id: randomUUID(),
        objectType: 'ADVERTISEMENT',
        objectId: randomUUID(),
        embedDeploymentId: otherDeployment.id,
        versionId: randomUUID(),
        snapshotChecksum: '123',
        authorizedOrigin: 'https://bad.com',
      },
    })

    await expect(
      submissionService.submit(landingPageId, {
        sessionId: issueSid().token,
        idempotencyKey: randomUUID(),
        embedInstanceId: badInstance.id,
        data: { email: 'test@example.com' },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: /Instance does not belong to this page deployment/,
    })
  })

  it('processes outbox records safely via worker', async () => {
    const idempotencyKey = randomUUID()

    await submissionService.submit(landingPageId, {
      sessionId: issueSid().token,
      idempotencyKey,
      data: { email: 'worker@example.com' },
    })

    // Process first time
    await processEmbedOutbox()
    const outbox1 = await db.embedProjectionOutbox.findUnique({ where: { idempotencyKey } })
    expect(outbox1?.status).toBe('COMPLETE')

    const contactCount = await db.contact.count({ where: { email: 'worker@example.com' } })
    expect(contactCount).toBe(1)

    // Reset status to simulate retry
    await db.embedProjectionOutbox.update({
      where: { idempotencyKey },
      data: { status: 'PENDING' },
    })
    await processEmbedOutbox()

    const outbox2 = await db.embedProjectionOutbox.findUnique({ where: { idempotencyKey } })
    expect(outbox2?.status).toBe('COMPLETE')

    // Must not duplicate contact
    const contactCount2 = await db.contact.count({ where: { email: 'worker@example.com' } })
    expect(contactCount2).toBe(1)
  })
})
