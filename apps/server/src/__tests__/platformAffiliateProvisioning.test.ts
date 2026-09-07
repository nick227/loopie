// Every user gets their own PlatformAffiliate referral identity, auto-provisioned at
// registration; a valid ?ref= at registration attributes the new business to the referrer at
// whatever rate is live *right then*, frozen onto every PlatformAffiliateEarning going forward
// even if the deal's rate changes later.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth } from './helpers'
import { db } from '@project/db'
import { CommissionEngine } from '../services/CommissionEngine'

const app = buildTestApp()
const commissionEngine = new CommissionEngine()

async function register(email: string, businessName: string, referralCode?: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'password12', businessName, referralCode },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data as { id: string; businessId: string }
}

async function createSiteAdmin() {
  const admin = await db.user.create({
    data: {
      email: `admin-${Date.now()}@example.com`,
      passwordHash: 'hashed',
      platformRole: 'SITE_ADMIN',
      business: { create: { name: 'Admin Co', slug: `admin-co-${Date.now()}` } },
    },
  })
  return admin.id
}

describe('platform affiliate provisioning', () => {
  it('gives every new user a referral code, even with no referral and no default class configured', async () => {
    const user = await register(`solo-${Date.now()}@example.com`, 'Solo Co')
    const me = await app.inject({ method: 'GET', url: '/affiliates/me', headers: asAuth(user.id) })
    expect(me.statusCode).toBe(200)
    expect(me.json().data.referralCode).toBeTruthy()
    expect(me.json().data.userId).toBe(user.id)
  })

  it('freezes the referrer rate on the business attribution and on every earning, unaffected by later reassignment', async () => {
    const adminId = await createSiteAdmin()

    const dealRes = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliate-deals',
      headers: asAuth(adminId),
      payload: { name: 'Launch Deal', affiliateRateBps: 2000, managerShareBps: 0 },
    })
    expect(dealRes.statusCode).toBe(201)
    const dealId = dealRes.json().data.id

    const classRes = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliate-classes',
      headers: asAuth(adminId),
      payload: { name: 'Default Class', defaultDealId: dealId },
    })
    expect(classRes.statusCode).toBe(201)
    const classId = classRes.json().data.id

    const setDefaultRes = await app.inject({
      method: 'PATCH',
      url: `/admin/platform-affiliate-classes/${classId}/default`,
      headers: asAuth(adminId),
    })
    expect(setDefaultRes.statusCode).toBe(200)

    // Referrer registers after the default class exists, so they're provisioned with a real deal.
    const referrer = await register(`referrer-${Date.now()}@example.com`, 'Referrer Co')
    const referrerMe = await app.inject({
      method: 'GET',
      url: '/affiliates/me',
      headers: asAuth(referrer.id),
    })
    const referralCode = referrerMe.json().data.referralCode as string
    const affiliateId = referrerMe.json().data.id as string

    // A garbage code must never block registration.
    const garbageRefUser = await register(
      `garbage-ref-${Date.now()}@example.com`,
      'Garbage Ref Co',
      'not-a-real-code',
    )
    const garbageAttribution = await db.businessAffiliateAttribution.findUnique({
      where: { businessId: garbageRefUser.businessId },
    })
    expect(garbageAttribution).toBeNull()

    // A real referral attributes the new business at the referrer's *current* rate.
    const referred = await register(
      `referred-${Date.now()}@example.com`,
      'Referred Co',
      referralCode,
    )
    const attribution = await db.businessAffiliateAttribution.findUnique({
      where: { businessId: referred.businessId },
    })
    expect(attribution?.affiliateId).toBe(affiliateId)
    expect(attribution?.affiliateRateBps).toBe(2000)

    // A membership payment now produces an earning frozen at that rate.
    await commissionEngine.processMembershipPayment(referred.businessId, 10000)
    const firstEarning = await db.platformAffiliateEarning.findFirst({
      where: { beneficiaryAffiliateId: affiliateId },
      orderBy: { createdAt: 'desc' },
    })
    expect(firstEarning?.rateBps).toBe(2000)
    expect(firstEarning?.amountMinor).toBe(2000)

    // Reassigning the referrer to a different-rate deal must not touch the earning already made,
    // and the personal ledger must keep reporting the frozen rate too.
    const newDealRes = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliate-deals',
      headers: asAuth(adminId),
      payload: { name: 'Repriced Deal', affiliateRateBps: 500, managerShareBps: 0 },
    })
    const newDealId = newDealRes.json().data.id
    const reassignRes = await app.inject({
      method: 'PATCH',
      url: `/admin/platform-affiliates/${affiliateId}`,
      headers: asAuth(adminId),
      payload: { dealId: newDealId },
    })
    expect(reassignRes.statusCode).toBe(200)

    const unchangedEarning = await db.platformAffiliateEarning.findUnique({
      where: { id: firstEarning!.id },
    })
    expect(unchangedEarning?.rateBps).toBe(2000)

    const ledgerRes = await app.inject({
      method: 'GET',
      url: '/affiliates/me/ledger',
      headers: asAuth(referrer.id),
    })
    expect(ledgerRes.statusCode).toBe(200)
    const ledgerRow = ledgerRes
      .json()
      .data.find((row: { id: string }) => row.id === firstEarning!.id)
    expect(ledgerRow).toBeTruthy()
    expect(ledgerRow.rateBps).toBe(2000)
    expect(ledgerRow.businessName).toBe('Referred Co')
    expect(ledgerRow.clientPaymentMinor).toBe(10000)
  })
})
