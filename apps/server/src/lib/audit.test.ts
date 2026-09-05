import { expect, test, describe, beforeAll, afterAll } from 'vitest'
import { db } from '@project/db'
import { emitAuditEvent, AuditActions, AuditResourceTypes } from './audit'

describe('emitAuditEvent', () => {
  let businessId: string
  let userId: string

  beforeAll(async () => {
    const business = await db.business.create({
      data: { name: `Audit Test Co ${Date.now()}` },
    })
    businessId = business.id
    const user = await db.user.create({
      data: {
        email: `audit-test-${Date.now()}@example.com`,
        passwordHash: 'dummy',
        platformRole: 'USER',
        businessId,
      },
    })
    userId = user.id
  })

  afterAll(async () => {
    await db.auditEvent.deleteMany({ where: { actorUserId: userId } })
    await db.user.delete({ where: { id: userId } }).catch(() => {})
    await db.business.delete({ where: { id: businessId } }).catch(() => {})
  })

  test('creates an audit event', async () => {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } })
    await emitAuditEvent({
      // emitAuditEvent only reads id / platformRole / supportSessionId off the actor.
      actor: user as never,
      action: AuditActions.LICENSE_GRANTED,
      resourceType: AuditResourceTypes.BUSINESS_LICENSE,
      businessId,
      metadata: { note: 'Test' },
    })

    const evt = await db.auditEvent.findFirst({
      where: { actorUserId: userId, action: AuditActions.LICENSE_GRANTED },
    })

    expect(evt).toBeDefined()
    expect(evt?.actorPlatformRole).toBe('USER')
    expect(evt?.resourceType).toBe(AuditResourceTypes.BUSINESS_LICENSE)
    expect(evt?.businessId).toBe(businessId)
    expect((evt?.metadata as { note?: string } | null)?.note).toBe('Test')
  })
})
