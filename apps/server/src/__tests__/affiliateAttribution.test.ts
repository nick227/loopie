// Filled-in integration test (not a generated stub) for affiliate attribution + payouts, added
// 2026-08-27: Affiliate -> referral link/code -> tracked session -> Contact/Lead -> Sale ->
// Commission -> Payout. Exercises the real routes end-to-end, same style as
// acquisitionPath.test.ts, and proves the two hard constraints from the brief: affiliate
// attribution stays separate from Lead.sourceType (asserted explicitly below), and all money
// flows through FinanceService's existing, already-tested ledger primitives (Commission/Payout) —
// no new affiliate-balance concept anywhere in this test or the code it exercises.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId } from './helpers'
import { seedClassAndDeal } from './helpers/affiliateSeed'
import { db } from '@project/db'

const app = buildTestApp()

describe('affiliate attribution: Affiliate -> referral click -> Contact/Lead -> Sale -> Commission -> Payout', () => {
  it('a referred visitor becomes a Lead attributed to the affiliate without touching sourceType, then a Sale auto-creates a payable Commission', async () => {
    const template = await db.landingPageTemplate.create({
      data: { name: 'Affiliate Test Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
    })

    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: { name: 'Referral form', fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }] },
    })
    expect(formRes.statusCode).toBe(201)
    const formId = formRes.json().data.id

    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: { templateId: template.id, name: 'Referral Page', slug: `referral-page-${Date.now()}`, formId },
    })
    expect(pageRes.statusCode).toBe(201)
    const page = pageRes.json().data

    const publishRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    expect(publishRes.statusCode).toBe(201)

    // --- Create the affiliate, pointed at the published page, with a 10% commission rate ---
    const { classId } = await seedClassAndDeal(app)
    const affiliateRes = await app.inject({
      method: 'POST',
      url: '/affiliates',
      headers: asAuth(testUserId),
      payload: { name: 'Jordan Referrer', classId, destinationLandingPageId: page.id },
    })
    expect(affiliateRes.statusCode).toBe(201)
    const affiliate = affiliateRes.json().data
    expect(affiliate.referralCode).toBeTruthy()
    expect(affiliate.referralUrl).toContain(`/r/affiliate/${affiliate.id}`)

    // --- Referral click redirects to the landing page, carrying a signed session id ---
    const clickRes = await app.inject({ method: 'GET', url: `/r/affiliate/${affiliate.id}` })
    expect(clickRes.statusCode).toBe(302)
    expect(clickRes.headers.location).toContain(`/p/${page.slug}`)
    const redirectLocation = new URL(clickRes.headers.location as string)
    const sid = redirectLocation.searchParams.get('sid')
    expect(sid).toBeTruthy()

    const click = await db.affiliateReferralClick.findFirstOrThrow({ where: { affiliateId: affiliate.id } })
    expect(click.sessionId).toBeTruthy()

    // --- Visitor submits the landing page's form with that session ---
    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sid, data: { email: 'referred@example.com' } },
    })
    expect(submitRes.statusCode).toBe(201)
    const { contactId, leadId } = submitRes.json().data

    // --- The hard constraint: affiliate attribution is separate from sourceType ---
    const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } })
    expect(lead.referringAffiliateId).toBe(affiliate.id)
    expect(lead.sourceType).toBe('MANUAL') // no ad Deployment/AdUnit involved — unaffected by the affiliate stamp

    // --- Recording a Sale auto-creates a Commission via the existing FinanceService, no new affiliate-balance code ---
    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: { contactId, leadId, amount: 500, date: new Date().toISOString() },
    })
    expect(saleRes.statusCode).toBe(201)
    const sale = saleRes.json().data

    const commission = await db.commission.findFirstOrThrow({ where: { sourceRef: sale.id } })
    expect(commission.payeeRef).toBe(`affiliate:${affiliate.id}`)
    expect(commission.amountMinor).toBe(5000) // $500 * 10% = $50.00 = 5000 minor units
    expect(commission.status).toBe('PENDING')

    // --- The rest of the chain is FinanceService's own already-tested machinery — just prove this feature calls it correctly ---
    const payableRes = await app.inject({
      method: 'POST',
      url: `/finance/commissions/${commission.id}/payable`,
      headers: asAuth(testUserId),
      payload: { idempotencyKey: `test-payable-${commission.id}` },
    })
    expect(payableRes.statusCode).toBe(200)
    expect(payableRes.json().data.status).toBe('PAYABLE')

    const payoutRes = await app.inject({
      method: 'POST',
      url: '/finance/payouts',
      headers: asAuth(testUserId),
      payload: {
        commissionIds: [commission.id],
        payeeRef: `affiliate:${affiliate.id}`,
        idempotencyKey: `test-payout-${commission.id}`,
      },
    })
    expect(payoutRes.statusCode).toBe(201)
    expect(payoutRes.json().data.status).toBe('PAID')

    const paidCommission = await db.commission.findUniqueOrThrow({ where: { id: commission.id } })
    expect(paidCommission.status).toBe('PAID')
  })

  it('a lead with no affiliate referral does not get a Commission when a Sale is recorded', async () => {
    const contactRes = await app.inject({
      method: 'POST',
      url: '/contacts',
      headers: asAuth(testUserId),
      payload: { name: 'Organic Customer' },
    })
    const contactId = contactRes.json().data.id

    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: { contactId, amount: 250, date: new Date().toISOString() },
    })
    expect(saleRes.statusCode).toBe(201)

    const commission = await db.commission.findFirst({ where: { sourceRef: saleRes.json().data.id } })
    expect(commission).toBeNull()
  })
})
