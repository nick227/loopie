// Regression coverage for the 2026-09-13 fix: deleting an Audience still referenced by a
// Message used to leak a raw Prisma foreign-key error as a bare 500 ("Foreign key constraint
// violated: audienceId") instead of a clean, actionable conflict response.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

describe('deleting an audience referenced by a message', () => {
  it('returns a clean 409 instead of a raw Prisma 500, and succeeds once the message is gone', async () => {
    const audience = await db.audience.create({
      data: { businessId: testBusinessId, name: 'Referenced Audience', type: 'MANUAL_LIST' },
    })
    const message = await db.message.create({
      data: {
        businessId: testBusinessId,
        channel: 'EMAIL',
        subject: 'Hi',
        body: 'Hello',
        audienceId: audience.id,
        status: 'DRAFT',
      },
    })

    const blocked = await app.inject({
      method: 'DELETE',
      url: `/audiences/${audience.id}`,
      headers: asAuth(testUserId),
    })
    expect(blocked.statusCode).toBe(409)
    expect(blocked.json().error).toMatch(/used by 1 message/)

    await db.message.delete({ where: { id: message.id } })

    const succeeds = await app.inject({
      method: 'DELETE',
      url: `/audiences/${audience.id}`,
      headers: asAuth(testUserId),
    })
    expect(succeeds.statusCode).toBe(200)
    expect(await db.audience.findUnique({ where: { id: audience.id } })).toBeNull()
  })
})
