import { expect, test, describe, beforeEach } from 'vitest'
import { db } from '@project/db'
import { ActivityService } from '../services/ActivityService'
import { ActivitySourceKind, ActivityAttentionState } from '@prisma/client'

describe('ActivityService', () => {
  const service = new ActivityService()
  const businessId = 'biz_test_123'
  let firstActivityId: string
  let firstAttentionId: string

  beforeEach(async () => {
    // Insert test data
    const item1 = await db.activityItem.create({
      data: {
        businessId,
        sourceKind: ActivitySourceKind.LOOPIE,
        sourceRecordType: 'Lead',
        sourceRecordId: 'lead_1',
        eventKey: 'LEAD_CREATED',
        taxonomyVersion: 'v1',
        type: 'LEAD_CREATED',
        occurredAt: new Date('2026-08-01T10:00:00Z'),
        observedAt: new Date('2026-08-01T10:00:00Z'),
        storyId: 'story_1',
        sourceLabel: 'Lead Management',
        actorKind: 'CONTACT',
        actorLabel: 'John Doe',
        attention: ActivityAttentionState.ACTION_REQUIRED,
        summary: 'New Lead',
        attentionItem: {
          create: {
            state: 'NEEDS_ACTION',
          },
        },
      },
      include: { attentionItem: true },
    })

    await db.activityItem.create({
      data: {
        businessId,
        sourceKind: ActivitySourceKind.WEBSITE,
        sourceRecordType: 'Form',
        sourceRecordId: 'form_1',
        eventKey: 'FORM_SUBMISSION',
        taxonomyVersion: 'v1',
        type: 'FORM_SUBMISSION',
        occurredAt: new Date('2026-08-01T11:00:00Z'),
        observedAt: new Date('2026-08-01T11:00:00Z'),
        storyId: 'story_2',
        sourceLabel: 'Website Form',
        actorKind: 'CONTACT',
        actorLabel: 'Jane Doe',
        attention: ActivityAttentionState.INFORMATION,
        summary: 'Form submitted',
      },
    })

    firstActivityId = item1.id
    firstAttentionId = item1.attentionItem!.id
  })

  test('getActivityStream returns paginated results', async () => {
    const result = await service.getActivityStream(businessId, { limit: 1 })
    expect(result.data.length).toBe(1)
    expect(result.nextCursor).toBeDefined()

    // The latest item should be the form submission (11:00 is later than 10:00)
    expect(result.data[0].type).toBe('FORM_SUBMISSION')

    // Fetch next page
    const page2 = await service.getActivityStream(businessId, {
      limit: 1,
      cursor: result.nextCursor,
    })
    expect(page2.data.length).toBe(1)
    expect(page2.data[0].type).toBe('LEAD_CREATED')
    expect(page2.nextCursor).toBeNull() // No more items
  })

  test('getActivityStream filters by needsAction', async () => {
    const result = await service.getActivityStream(businessId, { needsAction: true })
    expect(result.data.length).toBe(1)
    expect(result.data[0].type).toBe('LEAD_CREATED')
    expect(result.data[0].attentionItem?.state).toBe('NEEDS_ACTION')
  })

  test('getActivityStream tenant isolation', async () => {
    const result = await service.getActivityStream('wrong_biz', {})
    expect(result.data.length).toBe(0)
  })

  test('getCheckpoint returns latest observedAt', async () => {
    const checkpoint = await service.getCheckpoint(businessId)
    expect(checkpoint.latestObservedAt?.toISOString()).toBe(
      new Date('2026-08-01T11:00:00Z').toISOString(),
    )
  })

  test('getActivityItem fetches single item', async () => {
    const item = await service.getActivityItem(businessId, firstActivityId)
    expect(item.id).toBe(firstActivityId)
  })

  test('updateAttentionItem mutates attention state safely', async () => {
    const updated = await service.updateAttentionItem(businessId, firstAttentionId, {
      state: 'SNOOZED',
    })
    expect(updated.state).toBe('SNOOZED')
  })
})
