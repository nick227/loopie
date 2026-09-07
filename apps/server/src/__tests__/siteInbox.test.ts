import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testOtherUserId } from './helpers'
import { EmailDeliveryService } from '../services/EmailDeliveryService'

const app = buildTestApp()
const payload = () => ({
  name: 'Ada',
  email: 'ada@example.com',
  message: 'Interested in advertising!',
  submissionKey: randomUUID(),
})
afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  await db.siteInquiry.deleteMany()
})

describe('site inbox', () => {
  it('stores public inquiries, deduplicates retries and restricts inbox access to staff', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const body = payload()
    for (let i = 0; i < 2; i++) {
      const response = await app.inject({ method: 'POST', url: '/site-inquiries', payload: body })
      expect(response.statusCode).toBe(201)
      expect(response.json()).toEqual({ received: true })
    }
    expect(await db.siteInquiry.count()).toBe(1)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/site-inquiries',
          payload: { ...body, message: 'Different' },
        })
      ).statusCode,
    ).toBe(409)
    expect((await app.inject({ method: 'GET', url: '/admin/site-inbox' })).statusCode).toBe(401)
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/admin/site-inbox',
          headers: asAuth(testOtherUserId),
        })
      ).statusCode,
    ).toBe(403)
    await db.user.update({ where: { id: testUserId }, data: { platformRole: 'SITE_ADMIN' } })
    const inbox = await app.inject({
      method: 'GET',
      url: '/admin/site-inbox',
      headers: asAuth(testUserId),
    })
    expect(inbox.statusCode).toBe(200)
    expect(inbox.json().data[0]).toMatchObject({
      name: body.name,
      email: body.email,
      message: body.message,
    })
    expect(inbox.json().data[0]).not.toHaveProperty('submissionKey')
    expect(inbox.json().emailNotifications).toBe(true)
  })

  it('validates public submissions before storing them', async () => {
    for (const invalid of [
      { name: ' ' },
      { email: 'invalid' },
      { message: ' ' },
      { message: 'x'.repeat(5001) },
    ]) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/site-inquiries',
            payload: { ...payload(), ...invalid },
          })
        ).statusCode,
      ).toBe(400)
    }
    expect(await db.siteInquiry.count()).toBe(0)
  })

  it('honors staff subscriptions, escapes notification content and retains inquiries when email fails', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-only')
    const delivery = vi
      .spyOn(EmailDeliveryService.prototype, 'publishBatch')
      .mockRejectedValue(new Error('Delivery unavailable'))
    await db.user.update({ where: { id: testUserId }, data: { platformRole: 'SITE_ADMIN' } })
    await db.user.update({ where: { id: testOtherUserId }, data: { platformRole: 'SITE_ADMIN' } })
    const preference = await app.inject({
      method: 'PUT',
      url: '/admin/site-inbox/subscription',
      headers: asAuth(testOtherUserId),
      payload: { enabled: false },
    })
    expect(preference.statusCode).toBe(200)
    const body = { ...payload(), message: '<script>alert(1)</script>' }
    expect(
      (await app.inject({ method: 'POST', url: '/site-inquiries', payload: body })).statusCode,
    ).toBe(201)
    expect(delivery).toHaveBeenCalledWith(
      'New advertising inquiry',
      expect.stringContaining('&lt;script&gt;'),
      ['alice@test.local'],
    )
    expect(await db.siteInquiry.count()).toBe(1)
    await app.inject({ method: 'POST', url: '/site-inquiries', payload: body })
    expect(delivery).toHaveBeenCalledTimes(1)
  })
})
