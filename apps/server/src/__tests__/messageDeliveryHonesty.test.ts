// Regression coverage for the 2026-09-13 functionality-integrity pass: nothing may report SENT
// unless the external action actually happened, or is clearly labeled manual. Two fixes:
// (1) EmailDeliveryService now fails closed (never fakes success) when RESEND_API_KEY is unset;
// (2) SOCIAL sends no longer run through a fake "publish" stub — SENT for a SOCIAL message means
// "the business posted this themselves," a manual action being logged, not automated delivery.
import { describe, it, expect, vi } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { EmailDeliveryService } from '../services/EmailDeliveryService'

const app = buildTestApp()

async function seedAudienceOfOne(channel: 'EMAIL' | 'SOCIAL') {
  const contact = await db.contact.create({
    data: {
      businessId: testBusinessId,
      name: 'Honesty Test Contact',
      email: 'honesty-test@example.com',
    },
  })
  const audience = await db.audience.create({
    data: { businessId: testBusinessId, name: 'Honesty Test Audience', type: 'MANUAL_LIST' },
  })
  await db.audienceMember.create({ data: { audienceId: audience.id, contactId: contact.id } })
  const createRes = await app.inject({
    method: 'POST',
    url: '/messages',
    headers: asAuth(testUserId),
    payload: { channel, subject: 'Hi', body: 'Hello there', audienceId: audience.id },
  })
  return { messageId: createRes.json().data.id, contactId: contact.id }
}

describe('email send fails closed, never fakes success', () => {
  it('a real (unmocked) send with no RESEND_API_KEY fails visibly and marks the message FAILED', async () => {
    // Undo setup.ts's default success mock for this one test to exercise the real,
    // unconfigured-key code path — the exact scenario production was silently faking before.
    vi.restoreAllMocks()
    vi.stubEnv('RESEND_API_KEY', '')
    const { messageId } = await seedAudienceOfOne('EMAIL')

    const sendRes = await app.inject({
      method: 'POST',
      url: `/messages/${messageId}/send`,
      headers: asAuth(testUserId),
    })
    expect(sendRes.statusCode).toBe(500)

    const message = await db.message.findUnique({ where: { id: messageId } })
    expect(message?.status).toBe('FAILED')

    // No Interaction should have been recorded for a delivery that never happened.
    const interaction = await db.interaction.findFirst({
      where: { businessId: testBusinessId, type: 'EMAIL_SENT', sourceMessageId: messageId },
    })
    expect(interaction).toBeNull()

    vi.unstubAllEnvs()
  })

  it('a real send with a working provider succeeds and records the delivery', async () => {
    vi.restoreAllMocks()
    vi.stubEnv('RESEND_API_KEY', 'test-only')
    vi.spyOn(EmailDeliveryService.prototype, 'publishBatch').mockResolvedValue({
      success: true,
      sentCount: 1,
      errors: [],
    })
    const { messageId, contactId } = await seedAudienceOfOne('EMAIL')

    const sendRes = await app.inject({
      method: 'POST',
      url: `/messages/${messageId}/send`,
      headers: asAuth(testUserId),
    })
    expect(sendRes.statusCode).toBe(200)
    expect(sendRes.json().data.status).toBe('SENT')

    const interaction = await db.interaction.findFirst({
      where: {
        businessId: testBusinessId,
        contactId,
        type: 'EMAIL_SENT',
        sourceMessageId: messageId,
      },
    })
    expect(interaction).not.toBeNull()

    vi.unstubAllEnvs()
  })
})

describe('social "send" is an honest manual-post log, not a fake publish', () => {
  it('sends without calling any delivery stub and still records the message as SENT', async () => {
    const { messageId, contactId } = await seedAudienceOfOne('SOCIAL')

    const sendRes = await app.inject({
      method: 'POST',
      url: `/messages/${messageId}/send`,
      headers: asAuth(testUserId),
    })
    expect(sendRes.statusCode).toBe(200)
    expect(sendRes.json().data.status).toBe('SENT')

    const interaction = await db.interaction.findFirst({
      where: {
        businessId: testBusinessId,
        contactId,
        type: 'SOCIAL_POST_SENT',
        sourceMessageId: messageId,
      },
    })
    expect(interaction).not.toBeNull()
  })
})
