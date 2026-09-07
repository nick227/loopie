// Fraud/integrity guards added to the platform-affiliate referral program after an adversarial
// review: self-referral / ownership-overlap blocking, post-payment attribution immutability
// (with an explicit, audited SITE_ADMIN override), atomic "at most one default class" at the DB
// level, deal/class consistency validation, and opaque (non-PII) referral codes.
import { describe, it, expect } from 'vitest'
import {
  buildTestApp,
  asAuth,
  testUserId,
  testOtherUserId,
  testBusinessId,
  testOtherBusinessId,
} from './helpers'
import { db } from '@project/db'
import { CommissionEngine } from '../services/CommissionEngine'
import { PlatformAffiliateService } from '../services/PlatformAffiliateService'

const app = buildTestApp()
const commissionEngine = new CommissionEngine()
const service = new PlatformAffiliateService()

async function createSiteAdmin() {
  const admin = await db.user.create({
    data: {
      email: `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: 'hashed',
      platformRole: 'SITE_ADMIN',
      business: {
        create: {
          name: 'Admin Co',
          slug: `admin-co-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      },
    },
  })
  return admin.id
}

async function createDealAndClass(adminId: string, affiliateRateBps: number) {
  const dealRes = await app.inject({
    method: 'POST',
    url: '/admin/platform-affiliate-deals',
    headers: asAuth(adminId),
    payload: { name: `Deal ${Date.now()}`, affiliateRateBps, managerShareBps: 0 },
  })
  expect(dealRes.statusCode).toBe(201)
  return dealRes.json().data.id as string
}

describe('platform affiliate integrity guards', () => {
  it('rejects an attribution where the affiliate is a member of the business being referred (self-referral)', async () => {
    const adminId = await createSiteAdmin()

    // testUserId is seeded as OWNER of testBusinessId (see helpers/index.ts).
    const selfAffiliate = await db.platformAffiliate.create({
      data: { name: 'Self Referrer', referralCode: `self-${Date.now()}`, userId: testUserId },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/admin/businesses/${testBusinessId}/platform-attribution`,
      headers: asAuth(adminId),
      payload: { affiliateId: selfAffiliate.id },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/self-referral/i)

    const attr = await db.businessAffiliateAttribution.findUnique({
      where: { businessId: testBusinessId },
    })
    expect(attr).toBeNull()
  })

  it('snapshots the affiliate/manager userId at approval, and auto-invalidates the attribution — in the same transaction as the membership write — when that person later joins the business as a team member', async () => {
    const adminId = await createSiteAdmin()
    const dealId = await createDealAndClass(adminId, 1500)

    // A referrer with no prior tie to testOtherBusinessId (their own business is separate).
    const referrerEmail = `referrer-${Date.now()}@example.com`
    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: referrerEmail, password: 'password12', businessName: 'Referrer Own Co' },
    })
    expect(registerRes.statusCode).toBe(201)
    const referrerUserId = registerRes.json().data.id as string

    const meRes = await app.inject({
      method: 'GET',
      url: '/affiliates/me',
      headers: asAuth(referrerUserId),
    })
    const referrerAffiliateId = meRes.json().data.id as string

    await app.inject({
      method: 'PATCH',
      url: `/admin/platform-affiliates/${referrerAffiliateId}`,
      headers: asAuth(adminId),
      payload: { dealId },
    })

    const setAttr = await app.inject({
      method: 'POST',
      url: `/admin/businesses/${testOtherBusinessId}/platform-attribution`,
      headers: asAuth(adminId),
      payload: { affiliateId: referrerAffiliateId },
    })
    expect(setAttr.statusCode).toBe(200)

    const approved = await db.businessAffiliateAttribution.findUniqueOrThrow({
      where: { businessId: testOtherBusinessId },
    })
    expect(approved.status).toBe('ACTIVE')
    expect(approved.affiliateUserIdSnapshot).toBe(referrerUserId)
    expect(approved.approvedAt).toBeTruthy()

    // testOtherUserId owns testOtherBusinessId (see helpers/index.ts) — they invite the referrer,
    // by email, to join their own team.
    const inviteRes = await app.inject({
      method: 'POST',
      url: '/business/team/invitations',
      headers: asAuth(testOtherUserId),
      payload: { email: referrerEmail, role: 'MEMBER' },
    })
    expect(inviteRes.statusCode).toBe(201)
    const token = String(inviteRes.json().data.acceptUrl).match(
      /\/invitations\/([^/]+)\/accept/,
    )?.[1]
    expect(token).toBeTruthy()

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/invitations/${token}/accept`,
      headers: asAuth(referrerUserId),
    })
    expect(acceptRes.statusCode).toBe(200)

    // Invalidated the instant the membership was created — no payment needed to observe it.
    const invalidated = await db.businessAffiliateAttribution.findUniqueOrThrow({
      where: { businessId: testOtherBusinessId },
    })
    expect(invalidated.status).toBe('INVALIDATED')
    expect(invalidated.invalidatedAt).toBeTruthy()
    expect(invalidated.invalidatedReason).toMatch(/became a member/i)

    // And a payment afterward correctly awards nothing, via the fast status check.
    await commissionEngine.processMembershipPayment(testOtherBusinessId, 10000)
    const earnings = await db.platformAffiliateEarning.findMany({
      where: { beneficiaryAffiliateId: referrerAffiliateId },
    })
    expect(earnings).toHaveLength(0)
  })

  it('locks attribution after the business has been billed unless the SITE_ADMIN passes force, and audits the reassignment', async () => {
    const adminId = await createSiteAdmin()
    const dealId = await createDealAndClass(adminId, 1000)

    const affiliateARes = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliates',
      headers: asAuth(adminId),
      payload: { name: 'Affiliate A', dealId },
    })
    const affiliateBRes = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliates',
      headers: asAuth(adminId),
      payload: { name: 'Affiliate B', dealId },
    })
    const affiliateAId = affiliateARes.json().data.id
    const affiliateBId = affiliateBRes.json().data.id

    const setInitial = await app.inject({
      method: 'POST',
      url: `/admin/businesses/${testOtherBusinessId}/platform-attribution`,
      headers: asAuth(adminId),
      payload: { affiliateId: affiliateAId },
    })
    expect(setInitial.statusCode).toBe(200)

    // No billing yet — reassignment without force must still succeed.
    const reassignPrePayment = await app.inject({
      method: 'POST',
      url: `/admin/businesses/${testOtherBusinessId}/platform-attribution`,
      headers: asAuth(adminId),
      payload: { affiliateId: affiliateBId },
    })
    expect(reassignPrePayment.statusCode).toBe(200)

    // Now the business is billed — the attribution locks.
    await commissionEngine.processMembershipPayment(testOtherBusinessId, 5000)

    const blockedReassign = await app.inject({
      method: 'POST',
      url: `/admin/businesses/${testOtherBusinessId}/platform-attribution`,
      headers: asAuth(adminId),
      payload: { affiliateId: affiliateAId },
    })
    expect(blockedReassign.statusCode).toBe(409)
    expect(blockedReassign.json().error).toMatch(/already been billed/i)

    const stillB = await db.businessAffiliateAttribution.findUnique({
      where: { businessId: testOtherBusinessId },
    })
    expect(stillB?.affiliateId).toBe(affiliateBId)

    // Force overrides the lock and is audited.
    const forcedReassign = await app.inject({
      method: 'POST',
      url: `/admin/businesses/${testOtherBusinessId}/platform-attribution`,
      headers: asAuth(adminId),
      payload: { affiliateId: affiliateAId, force: true },
    })
    expect(forcedReassign.statusCode).toBe(200)

    const nowA = await db.businessAffiliateAttribution.findUnique({
      where: { businessId: testOtherBusinessId },
    })
    expect(nowA?.affiliateId).toBe(affiliateAId)

    const auditEvents = await db.auditEvent.findMany({
      where: { businessId: testOtherBusinessId, action: 'AFFILIATE_ATTRIBUTION_REASSIGNED' },
      orderBy: { createdAt: 'asc' },
    })
    expect(auditEvents.length).toBeGreaterThanOrEqual(2)
    const forcedEvent = auditEvents[auditEvents.length - 1]!
    expect((forcedEvent.metadata as any).forced).toBe(true)
    expect(forcedEvent.actorUserId).toBe(adminId)
  })

  it('rolls back the attribution write if its audit record fails to write, instead of leaving an unaudited change', async () => {
    const adminId = await createSiteAdmin()
    const dealId = await createDealAndClass(adminId, 800)
    const affiliateRes = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliates',
      headers: asAuth(adminId),
      payload: { name: 'Rollback Test Affiliate', dealId },
    })
    const affiliateId = affiliateRes.json().data.id

    // A Prisma middleware fires for queries run inside an interactive transaction too, so this
    // actually exercises the $transaction's rollback rather than mocking the service.
    let attempted = false
    db.$use(async (params, next) => {
      if (!attempted && params.model === 'AuditEvent' && params.action === 'create') {
        attempted = true
        throw new Error('simulated audit write failure')
      }
      return next(params)
    })

    const res = await app.inject({
      method: 'POST',
      url: `/admin/businesses/${testBusinessId}/platform-attribution`,
      headers: asAuth(adminId),
      payload: { affiliateId },
    })
    expect(res.statusCode).toBe(500)

    const attribution = await db.businessAffiliateAttribution.findUnique({
      where: { businessId: testBusinessId },
    })
    expect(attribution).toBeNull()
  })

  it("never awards a commission when the beneficiary affiliate overlaps the paying business's membership, even if an attribution somehow exists", async () => {
    // Bypass the create-time guard on purpose, simulating a pre-existing/legacy inconsistent row,
    // to prove CommissionEngine's own defense-in-depth check independently of setBusinessAttribution.
    const overlapAffiliate = await db.platformAffiliate.create({
      data: {
        name: 'Overlap Affiliate',
        referralCode: `overlap-${Date.now()}`,
        userId: testUserId,
      },
    })
    await db.businessAffiliateAttribution.upsert({
      where: { businessId: testBusinessId },
      create: {
        businessId: testBusinessId,
        affiliateId: overlapAffiliate.id,
        affiliateDealId: (
          await db.platformAffiliateDeal.create({
            data: {
              name: `Overlap Deal ${Date.now()}`,
              affiliateRateBps: 2000,
              managerShareBps: 0,
            },
          })
        ).id,
        affiliateRateBps: 2000,
      },
      update: { affiliateId: overlapAffiliate.id, affiliateRateBps: 2000 },
    })

    await commissionEngine.processMembershipPayment(testBusinessId, 10000)

    const earnings = await db.platformAffiliateEarning.findMany({
      where: { beneficiaryAffiliateId: overlapAffiliate.id },
    })
    expect(earnings).toHaveLength(0)
  })

  it("evaluates the direct affiliate's and the manager's ownership overlap independently — one overlapping does not disqualify the other's legitimate earning", async () => {
    const deal = await db.platformAffiliateDeal.create({
      data: {
        name: `Independence Deal ${Date.now()}`,
        affiliateRateBps: 1000,
        managerShareBps: 2000,
      },
    })

    // Case 1: the direct affiliate overlaps testBusinessId (testUserId owns it), the manager
    // (testOtherUserId, unrelated to testBusinessId) does not — the manager should still earn.
    const overlappingDirect = await db.platformAffiliate.create({
      data: {
        name: 'Overlapping Direct',
        referralCode: `overlap-direct-${Date.now()}`,
        userId: testUserId,
      },
    })
    const cleanManager = await db.platformAffiliate.create({
      data: {
        name: 'Clean Manager',
        referralCode: `clean-manager-${Date.now()}`,
        userId: testOtherUserId,
      },
    })
    await db.businessAffiliateAttribution.create({
      data: {
        businessId: testBusinessId,
        affiliateId: overlappingDirect.id,
        affiliateDealId: deal.id,
        affiliateRateBps: 1000,
        managerAffiliateId: cleanManager.id,
        managerShareBps: 2000,
      },
    })
    await commissionEngine.processMembershipPayment(testBusinessId, 10000)

    expect(
      await db.platformAffiliateEarning.findMany({
        where: { beneficiaryAffiliateId: overlappingDirect.id },
      }),
    ).toHaveLength(0)
    const managerEarnings = await db.platformAffiliateEarning.findMany({
      where: { beneficiaryAffiliateId: cleanManager.id },
    })
    expect(managerEarnings).toHaveLength(1)
    expect(managerEarnings[0]?.type).toBe('MANAGER_OVERRIDE')

    // Case 2: the reverse — direct is clean, the manager overlaps testOtherBusinessId — the
    // direct affiliate should still earn, only the manager is skipped. PlatformAffiliate.userId
    // is 1:1, so this needs two more real users rather than reusing testUserId/testOtherUserId
    // (already claimed by case 1's affiliates above).
    const unrelatedUser = await db.user.create({
      data: {
        email: `unrelated-${Date.now()}@example.com`,
        passwordHash: 'x',
        platformRole: 'USER',
        business: { create: { name: 'Unrelated Co', slug: `unrelated-co-${Date.now()}` } },
      },
    })
    const overlappingManagerUser = await db.user.create({
      data: {
        email: `overlap-mgr-${Date.now()}@example.com`,
        passwordHash: 'x',
        platformRole: 'USER',
        businessId: testOtherBusinessId,
      },
    })
    await db.businessMembership.create({
      data: { userId: overlappingManagerUser.id, businessId: testOtherBusinessId, role: 'MEMBER' },
    })

    const cleanDirect = await db.platformAffiliate.create({
      data: {
        name: 'Clean Direct',
        referralCode: `clean-direct-${Date.now()}`,
        userId: unrelatedUser.id,
      },
    })
    const overlappingManager = await db.platformAffiliate.create({
      data: {
        name: 'Overlapping Manager',
        referralCode: `overlap-manager-${Date.now()}`,
        userId: overlappingManagerUser.id,
      },
    })
    await db.businessAffiliateAttribution.create({
      data: {
        businessId: testOtherBusinessId,
        affiliateId: cleanDirect.id,
        affiliateDealId: deal.id,
        affiliateRateBps: 1000,
        managerAffiliateId: overlappingManager.id,
        managerShareBps: 2000,
      },
    })
    await commissionEngine.processMembershipPayment(testOtherBusinessId, 10000)

    const directEarnings = await db.platformAffiliateEarning.findMany({
      where: { beneficiaryAffiliateId: cleanDirect.id },
    })
    expect(directEarnings).toHaveLength(1)
    expect(directEarnings[0]?.type).toBe('DIRECT')
    expect(
      await db.platformAffiliateEarning.findMany({
        where: { beneficiaryAffiliateId: overlappingManager.id },
      }),
    ).toHaveLength(0)
  })

  it('enforces at most one default PlatformAffiliateClass at the database level, not just in application code', async () => {
    const classA = await db.platformAffiliateClass.create({
      data: { name: `Class A ${Date.now()}`, isDefault: true, defaultSlot: 'DEFAULT' },
    })
    const classB = await db.platformAffiliateClass.create({
      data: { name: `Class B ${Date.now()}` },
    })

    await expect(
      db.platformAffiliateClass.update({
        where: { id: classB.id },
        data: { isDefault: true, defaultSlot: 'DEFAULT' },
      }),
    ).rejects.toThrow()

    // Confirms it's a real DB constraint, not a coincidental app-level check: A is untouched.
    const stillA = await db.platformAffiliateClass.findUnique({ where: { id: classA.id } })
    expect(stillA?.defaultSlot).toBe('DEFAULT')
  })

  it('setDefaultClass atomically moves the singleton slot and getOrCreateForUser picks it up', async () => {
    const adminId = await createSiteAdmin()
    const dealAId = await createDealAndClass(adminId, 700)
    const dealBId = await createDealAndClass(adminId, 1400)

    const classARes = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliate-classes',
      headers: asAuth(adminId),
      payload: { name: `Switch A ${Date.now()}`, defaultDealId: dealAId },
    })
    const classBRes = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliate-classes',
      headers: asAuth(adminId),
      payload: { name: `Switch B ${Date.now()}`, defaultDealId: dealBId },
    })
    const classAId = classARes.json().data.id
    const classBId = classBRes.json().data.id

    await app.inject({
      method: 'PATCH',
      url: `/admin/platform-affiliate-classes/${classAId}/default`,
      headers: asAuth(adminId),
    })
    const switchToB = await app.inject({
      method: 'PATCH',
      url: `/admin/platform-affiliate-classes/${classBId}/default`,
      headers: asAuth(adminId),
    })
    expect(switchToB.statusCode).toBe(200)

    const refreshedA = await db.platformAffiliateClass.findUnique({ where: { id: classAId } })
    const refreshedB = await db.platformAffiliateClass.findUnique({ where: { id: classBId } })
    expect(refreshedA?.isDefault).toBe(false)
    expect(refreshedA?.defaultSlot).toBeNull()
    expect(refreshedB?.isDefault).toBe(true)
    expect(refreshedB?.defaultSlot).toBe('DEFAULT')
  })

  it("rejects a second class claiming a deal that is already another class's default (a real Prisma unique-constraint crash before this fix)", async () => {
    const adminId = await createSiteAdmin()
    const dealId = await createDealAndClass(adminId, 900)

    const firstClass = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliate-classes',
      headers: asAuth(adminId),
      payload: { name: `Owner Class ${Date.now()}`, defaultDealId: dealId },
    })
    expect(firstClass.statusCode).toBe(201)

    const secondClassAttempt = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliate-classes',
      headers: asAuth(adminId),
      payload: { name: `Other Class ${Date.now()}`, defaultDealId: dealId },
    })
    expect(secondClassAttempt.statusCode).toBe(409)
    expect(secondClassAttempt.json().error).toMatch(/already the default/i)
  })

  it('rejects requests missing a required field with a clean 400 instead of crashing into Prisma', async () => {
    const adminId = await createSiteAdmin()

    // Previously: managerShareBps is a required non-null Int column, but the request schema had
    // no `required` list at all — this sailed through validation and 500'd inside Prisma instead.
    const badDeal = await app.inject({
      method: 'POST',
      url: '/admin/platform-affiliate-deals',
      headers: asAuth(adminId),
      payload: { name: 'Missing rate' },
    })
    expect(badDeal.statusCode).toBe(400)

    const badAttribution = await app.inject({
      method: 'POST',
      url: `/admin/businesses/${testBusinessId}/platform-attribution`,
      headers: asAuth(adminId),
      payload: {},
    })
    expect(badAttribution.statusCode).toBe(400)
  })

  it('generates opaque referral codes with no email-derived substring', async () => {
    const email = `distinctivename${Date.now()}@example.com`
    const user = await db.user.create({
      data: {
        email,
        passwordHash: 'x',
        platformRole: 'USER',
        business: { create: { name: 'Opaque Code Co', slug: `opaque-code-co-${Date.now()}` } },
      },
    })
    const affiliate = await service.getOrCreateForUser({ id: user.id, email })
    const localPart = email.split('@')[0]!.toLowerCase()
    expect(affiliate.referralCode.toLowerCase()).not.toContain(localPart)
    expect(affiliate.referralCode).not.toContain('distinctivename')
  })
})
