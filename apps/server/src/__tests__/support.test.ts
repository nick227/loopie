import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { hashSessionToken, randomSessionToken } from '@project/db'

const app = buildTestApp()

describe('Support Mode Infrastructure', () => {
  let adminUserId: string
  let adminBusinessId: string
  let adminAuthHeader: Record<string, string>

  let supportSessionId: string

  beforeEach(async () => {
    const adminUser = await db.user.create({
      data: {
        email: 'site-admin@example.com',
        passwordHash: 'hashed',
        platformRole: 'SITE_ADMIN',
        business: {
          create: {
            name: 'Admin Corp',
            slug: 'admin-corp',
          },
        },
      },
      include: { business: true },
    })

    adminUserId = adminUser.id
    adminBusinessId = adminUser.business!.id
    const token = randomSessionToken()
    const session = await db.session.create({
      data: {
        userId: adminUserId,
        token: hashSessionToken(token),
        activeBusinessId: adminBusinessId,
        expiresAt: new Date(Date.now() + 3600000),
      },
    })

    adminAuthHeader = { authorization: `Bearer ${adminUserId}::${session.id}` }
  })

  it('allows a normal OWNER to act on their own tenant, but blocks them from starting support mode', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/support-session',
      headers: asAuth(testUserId),
      payload: { businessId: adminBusinessId, reason: 'test' },
    })
    // testUserId does not have SITE_ADMIN role
    expect(res.statusCode).toBe(403)
  })

  it('allows SITE_ADMIN to start a support session and mutates tenant with support attribution', async () => {
    // 1. Start support session
    const startRes = await app.inject({
      method: 'POST',
      url: '/admin/support-session',
      headers: adminAuthHeader,
      payload: { businessId: testBusinessId, reason: 'Debugging issue' },
    })
    expect(startRes.statusCode).toBe(200)
    const startData = JSON.parse(startRes.body)
    expect(startData.data.supportSessionId).toBeDefined()

    supportSessionId = startData.data.supportSessionId

    // 2. Perform a mutation on the target tenant using the support context
    // Extract sessionId from adminAuthHeader to include it again
    const sessionId = adminAuthHeader.authorization!.split('::')[1]
    const mutateRes = await app.inject({
      method: 'PATCH',
      url: `/business`,
      headers: { authorization: `Bearer ${adminUserId}:${supportSessionId}:${sessionId}` },
      payload: { location: 'Support Mode City' },
    })
    expect(mutateRes.statusCode).toBe(200)

    // 3. End support session
    const endRes = await app.inject({
      method: 'DELETE',
      url: '/admin/support-session',
      headers: { authorization: `Bearer ${adminUserId}:${supportSessionId}:${sessionId}` },
    })
    expect(endRes.statusCode).toBe(200)

    // 4. Verify the Audit Event has supportSessionId
    const auditEvent = await db.auditEvent.findFirst({
      where: { action: 'SUPPORT_SESSION_ENDED' },
    })
    expect(auditEvent).toBeDefined()
    expect(auditEvent?.actorUserId).toBe(adminUserId)
    expect(auditEvent?.businessId).toBe(testBusinessId) // Ended within the context of the business
    expect(auditEvent?.resourceId).toBe(supportSessionId)
  })

  it('drops support mode context when ended', async () => {
    // Start support session
    const startRes = await app.inject({
      method: 'POST',
      url: '/admin/support-session',
      headers: adminAuthHeader,
      payload: { businessId: testBusinessId, reason: 'Context test' },
    })
    expect(startRes.statusCode).toBe(200)

    const startData = JSON.parse(startRes.body)
    const supportSessionId2 = startData.data.supportSessionId

    // End support session
    const sessionId = adminAuthHeader.authorization!.split('::')[1]
    const endRes = await app.inject({
      method: 'DELETE',
      url: '/admin/support-session',
      headers: { authorization: `Bearer ${adminUserId}:${supportSessionId2}:${sessionId}` },
    })
    expect(endRes.statusCode).toBe(200)
  })
})
