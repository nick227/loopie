import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId, testOtherUserId } from './helpers'
import { seedClassAndDeal } from './helpers/affiliateSeed'
import { db } from '@project/db'

const app = buildTestApp()

async function referredSale(affiliateId: string, amount: number) {
  const contact = await db.contact.create({ data: { businessId: testBusinessId, name: 'Split Contact' } })
  const sessionId = `split-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await db.affiliateReferralClick.create({ data: { affiliateId, sessionId, clickedAt: new Date() } })
  const lead = await db.lead.create({
    data: {
      businessId: testBusinessId,
      contactId: contact.id,
      sourceType: 'MANUAL',
      referringAffiliateId: affiliateId,
      landingSessionId: sessionId,
      openSlot: 'OPEN',
    },
  })
  const res = await app.inject({
    method: 'POST',
    url: '/sales',
    headers: asAuth(testUserId),
    payload: { contactId: contact.id, leadId: lead.id, amount, date: new Date().toISOString() },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data
}

describe('affiliate deal freeze and manager split', () => {
  it('splits gross commission without increasing total cost, and freeze survives deal/manager changes', async () => {
    const { classId, dealId } = await seedClassAndDeal(app, { managerShareBps: 2000 })
    const managerRes = await app.inject({
      method: 'POST',
      url: '/affiliates',
      headers: asAuth(testUserId),
      payload: { name: 'Manager X', classId, dealId },
    })
    expect(managerRes.statusCode).toBe(201)
    const manager = managerRes.json().data

    const affRes = await app.inject({
      method: 'POST',
      url: '/affiliates',
      headers: asAuth(testUserId),
      payload: { name: 'Rep A', classId, dealId, managerId: manager.id },
    })
    expect(affRes.statusCode).toBe(201)
    const affiliate = affRes.json().data

    const sale = await referredSale(affiliate.id, 500)
    const commissions = await db.commission.findMany({ where: { sourceRef: sale.id } })
    expect(commissions).toHaveLength(2)
    const affPay = commissions.find((c) => c.payeeRef === `affiliate:${affiliate.id}`)
    const mgrPay = commissions.find((c) => c.payeeRef === `affiliate:${manager.id}`)
    expect(affPay?.amountMinor).toBe(4000)
    expect(mgrPay?.amountMinor).toBe(1000)
    expect((affPay?.amountMinor ?? 0) + (mgrPay?.amountMinor ?? 0)).toBe(5000)

    const split = await db.saleAffiliateSplit.findUniqueOrThrow({ where: { saleId: sale.id } })
    expect(split.grossCommissionMinor).toBe(5000)
    expect(split.affiliateCommissionMinor + split.managerCommissionMinor).toBe(split.grossCommissionMinor)
    expect(split.managerAffiliateId).toBe(manager.id)

    const richer = await app.inject({
      method: 'POST',
      url: '/affiliate-deals',
      headers: asAuth(testUserId),
      payload: { name: '15 percent', classId, affiliateRateBps: 1500, managerShareBps: 2000 },
    })
    await app.inject({
      method: 'PATCH',
      url: `/affiliates/${affiliate.id}`,
      headers: asAuth(testUserId),
      payload: { dealId: richer.json().data.id, managerId: null },
    })

    const earnings = await app.inject({
      method: 'GET',
      url: `/affiliates/${affiliate.id}/earnings`,
      headers: asAuth(testUserId),
    })
    expect(earnings.statusCode).toBe(200)
    expect(earnings.json().data.pendingMinor).toBe(4000)

    const managerEarnings = await app.inject({
      method: 'GET',
      url: `/affiliates/${manager.id}/earnings`,
      headers: asAuth(testUserId),
    })
    expect(managerEarnings.json().data.pendingMinor).toBe(1000)
  })

  it('rejects USER access and other-tenant class reads', async () => {
    await db.user.create({
      data: {
        id: '00000000-0000-0000-0000-000000000099',
        email: 'shop@test.local',
        passwordHash: 'x',
        businessId: testBusinessId,
        role: 'USER',
      },
    })
    const denied = await app.inject({
      method: 'GET',
      url: '/affiliates',
      headers: asAuth('00000000-0000-0000-0000-000000000099'),
    })
    expect(denied.statusCode).toBe(403)

    const { classId } = await seedClassAndDeal(app)
    const other = await app.inject({
      method: 'GET',
      url: `/affiliate-classes/${classId}`,
      headers: asAuth(testOtherUserId),
    })
    expect(other.statusCode).toBe(404)
  })
})
