import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db, issueSid } from '@project/db'
import { LandingPageSubmissionService } from '../services/LandingPageSubmissionService'
import { LandingPageService } from '../services/LandingPageService'
import { ContactService } from '../services/ContactService'
import { randomUUID } from 'crypto'

const submissionService = new LandingPageSubmissionService()

describe('Live Activity Projection', () => {
  let businessId: string
  let templateId: string
  let landingPageId: string
  let sessionId: string

  beforeAll(async () => {
    // Setup a business and a published landing page to test form submission
    businessId = `test-biz-${randomUUID()}`
    await db.business.create({
      data: { id: businessId, name: 'Projection Test Biz' },
    })

    // Create a template
    templateId = `tpl-${randomUUID()}`
    await db.landingPageTemplate.create({
      data: {
        id: templateId,
        businessId,
        name: 'Test Template',
        schema: { blocks: [] },
      },
    })

    // Create a form
    const form = await db.form.create({
      data: {
        businessId,
        name: 'Test Form',
        submitLabel: 'Submit',
        successMessage: 'Thanks',
        fields: {
          create: [
            { type: 'EMAIL', fieldKey: 'email', label: 'Email', required: true, order: 0 },
            { type: 'TEXT', fieldKey: 'name', label: 'Name', required: true, order: 1 },
          ],
        },
      },
    })

    // Create a landing page
    landingPageId = `lp-${randomUUID()}`
    await db.landingPage.create({
      data: {
        id: landingPageId,
        businessId,
        templateId,
        formId: form.id,
        name: 'Test Page',
        slug: `test-page-${randomUUID()}`,
        status: 'PUBLISHED',
        content: {},
        theme: {},
      },
    })

    // Publish it to get a version and snapshot
    const pageService = new LandingPageService()
    await pageService.publish(businessId, landingPageId)

    sessionId = issueSid(businessId, `sess-${randomUUID()}`).token
  })

  afterAll(async () => {
    // Cleanup is handled by the test db truncation logic typically, but we can do a targeted delete if needed
  })

  it('projects LEAD_CREATED and FORM_SUBMISSION on form submit', async () => {
    const email = `test-${Date.now()}@example.com`
    const result = await submissionService.submit(landingPageId, {
      sessionId,
      idempotencyKey: randomUUID(),
      data: { email, name: 'Proj Tester' },
    })

    expect(result.leadId).toBeDefined()
    expect(result.submissionId).toBeDefined()

    // Give projectors a moment to run if they were async, but they are awaited in our new code!
    // We can immediately check the database.
    const leadActivity = await db.activityItem.findFirst({
      where: {
        businessId,
        type: 'LEAD_CREATED',
        sourceRecordId: result.leadId!,
      },
    })

    expect(leadActivity).toBeDefined()
    expect(leadActivity?.personId).toBe(result.contactId)

    const formActivity = await db.activityItem.findFirst({
      where: {
        businessId,
        type: 'FORM_SUBMISSION',
        sourceRecordId: result.submissionId,
      },
    })

    expect(formActivity).toBeDefined()
    expect(formActivity?.personId).toBe(result.contactId)
    expect(formActivity?.status).toBe('SUBMITTED')
  })

  it('records an ActivityProjectionFailure on projector error', async () => {
    // We will simulate a failure by using a bad businessId or mocking the ActivityProjectionService,
    // but the easiest way to force a failure without mocking is to pass a bad object that the projector crashes on.
    // However, we refactored LandingPageService to use ActivityProjectionService.
    const { ActivityProjectionService } =
      await import('../services/activity/ActivityProjectionService')

    const badObject = { id: 'bad', businessId } as any

    // We call the service directly with an object that doesn't have the properties the projector needs
    await ActivityProjectionService.project(
      businessId,
      'Lead',
      'bad',
      'projectCreated',
      badObject,
      badObject,
    )

    // It shouldn't throw an error to the caller
    const failure = await db.activityProjectionFailure.findFirst({
      where: {
        businessId,
        sourceRecordType: 'Lead',
        sourceRecordId: 'bad',
      },
    })

    expect(failure).toBeDefined()
    expect(failure?.error).toContain('Argument `occurredAt` is missing')
  })
})
