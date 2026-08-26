import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { seedClassAndDeal } from './helpers/affiliateSeed'

const app = buildTestApp()

async function createWithLogin(payload: Record<string, unknown>) {
  const res = await app.inject({
    method: 'POST',
    url: '/affiliates',
    headers: asAuth(testUserId),
    payload: { createLogin: true, email: `aff-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`, ...payload },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data
}

describe('affiliate access, caps, and isolation', () => {
  it('rejects a deal assignment that exceeds the class rate cap', async () => {
    const classRes = await app.inject({
      method: 'POST',
      url: '/affiliate-classes',
      headers: asAuth(testUserId),
      payload: { name: 'Capped', maxAffiliateRateBps: 1000, maxManagerShareBps: 2000 },
    })
    const classId = classRes.json().data.id
    const okDeal = await app.inject({
      method: 'POST',
      url: '/affiliate-deals',
      headers: asAuth(testUserId),
      payload: { name: 'At cap', classId, affiliateRateBps: 1000, managerShareBps: 0 },
    })
    await app.inject({
      method: 'PATCH',
      url: `/affiliate-classes/${classId}`,
      headers: asAuth(testUserId),
      payload: { defaultDealId: okDeal.json().data.id },
    })
    const hotDeal = await app.inject({
      method: 'POST',
      url: '/affiliate-deals',
      headers: asAuth(testUserId),
      payload: { name: 'Too hot', classId, affiliateRateBps: 2000, managerShareBps: 0 },
    })
    const assigned = await app.inject({
      method: 'POST',
      url: '/affiliates',
      headers: asAuth(testUserId),
      payload: { name: 'Capped Rep', classId, dealId: hotDeal.json().data.id },
    })
    expect(assigned.statusCode).toBe(400)
  })

  it('blocks a manager from editing another manager’s downline, and an affiliate from catalog writes or other payees', async () => {
    const { classId, dealId } = await seedClassAndDeal(app)
    const cheaper = await app.inject({
      method: 'POST',
      url: '/affiliate-deals',
      headers: asAuth(testUserId),
      payload: { name: 'Cheaper', classId, affiliateRateBps: 500, managerShareBps: 0 },
    })
    const managerA = await createWithLogin({ name: 'Manager A', classId, dealId })
    const managerB = await createWithLogin({ name: 'Manager B', classId, dealId })
    const downlineB = await createWithLogin({ name: 'Rep B', classId, dealId, managerId: managerB.id })

    const otherDownline = await app.inject({
      method: 'PATCH',
      url: `/affiliates/${downlineB.id}`,
      headers: asAuth(managerA.userId),
      payload: { dealId: cheaper.json().data.id },
    })
    expect(otherDownline.statusCode).toBe(403)

    const classWrite = await app.inject({
      method: 'POST',
      url: '/affiliate-classes',
      headers: asAuth(downlineB.userId),
      payload: { name: 'Nope', maxAffiliateRateBps: 1000, maxManagerShareBps: 0 },
    })
    expect(classWrite.statusCode).toBe(403)

    const otherPayee = await app.inject({
      method: 'GET',
      url: `/affiliates/${managerA.id}/earnings`,
      headers: asAuth(downlineB.userId),
    })
    expect(otherPayee.statusCode).toBe(403)
  })
})
