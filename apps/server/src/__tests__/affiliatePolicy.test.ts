// Filled-in integration test (not a generated stub) for affiliate policy, added 2026-08-27:
// commission rule type (percentage/fixed), eligibility window, reversal, payout
// threshold/cadence. Attribution model (first-touch) has no runtime branch to test — it's a
// documented decision, verified already in affiliateAttribution.test.ts's separation assertion.
//
// Sets up Contact/Lead/AffiliateReferralClick directly via `db` rather than re-running the full
// click -> landing-page -> submit ceremony (already covered end-to-end in
// affiliateAttribution.test.ts) — these tests are about the policy math and state machine, not
// re-proving the attribution capture path.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { seedClassAndDeal } from './helpers/affiliateSeed'
import { db } from '@project/db'
import { runDuePayouts } from '../services/AffiliatePayoutService'

const app = buildTestApp()

async function createAffiliate(overrides: Record<string, unknown> = {}) {
  const seeded = await seedClassAndDeal(app, overrides)
  const res = await app.inject({
    method: 'POST',
    url: '/affiliates',
    headers: asAuth(testUserId),
    payload: { name: 'Policy Test Affiliate', classId: seeded.classId, dealId: seeded.dealId },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data
}

async function createReferredLead(affiliateId: string, clickedAt: Date) {
  const contact = await db.contact.create({
    data: { businessId: testBusinessId, name: 'Referred Contact' },
  })
  const sessionId = `policy-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await db.affiliateReferralClick.create({ data: { affiliateId, sessionId, clickedAt } })
  const lead = await db.lead.create({
    data: {
      businessId: testBusinessId,
      contactId: contact.id,
      sourceType: 'MANUAL',
      referringAffiliateId: affiliateId,
      landingSessionId: sessionId,
      openSlot: 'OPEN',
      openedAt: clickedAt,
    },
  })
  return { contact, lead }
}

async function recordSale(contactId: string, leadId: string, amount: number) {
  const res = await app.inject({
    method: 'POST',
    url: '/sales',
    headers: asAuth(testUserId),
    payload: {
      contactId,
      leadId,
      amount,
      date: new Date().toISOString(),
      idempotencyKey: `policy-sale:${leadId}`,
    },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data
}

describe('affiliate policy', () => {
  it('FIXED commission rule pays the flat amount, capped at the sale amount', async () => {
    const affiliate = await createAffiliate({
      commissionRuleType: 'FIXED',
      affiliateRateBps: undefined,
      fixedAmountMinor: 2500,
    })
    const { contact, lead } = await createReferredLead(affiliate.id, new Date())
    const sale = await recordSale(contact.id, lead.id, 100)

    const commission = await db.commission.findFirstOrThrow({ where: { sourceRef: sale.id } })
    expect(commission.amountMinor).toBe(2500) // flat $25, well under the $100 sale

    // A second, smaller sale where the flat amount would exceed the sale itself
    const { contact: contact2, lead: lead2 } = await createReferredLead(affiliate.id, new Date())
    const smallSale = await recordSale(contact2.id, lead2.id, 10) // $10 sale, flat rate is $25
    const cappedCommission = await db.commission.findFirstOrThrow({
      where: { sourceRef: smallSale.id },
    })
    expect(cappedCommission.amountMinor).toBe(1000) // capped at the $10 sale, not $25
  })

  it('a sale outside the eligibility window gets no commission, and a note explains why', async () => {
    const affiliate = await createAffiliate({ eligibilityWindowDays: 30 })
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    const { contact, lead } = await createReferredLead(affiliate.id, fortyDaysAgo)

    const sale = await recordSale(contact.id, lead.id, 500)

    const commission = await db.commission.findFirst({ where: { sourceRef: sale.id } })
    expect(commission).toBeNull()

    const note = await db.interaction.findFirstOrThrow({
      where: { contactId: contact.id, type: 'NOTE' },
    })
    expect((note.metadata as { note?: string })?.note).toContain('eligibility window')
  })

  it('reversing a sale reverses its Commission through FinanceService and reopens the lead', async () => {
    const affiliate = await createAffiliate({})
    const { contact, lead } = await createReferredLead(affiliate.id, new Date())
    const sale = await recordSale(contact.id, lead.id, 500)

    const wonLead = await db.lead.findUniqueOrThrow({ where: { id: lead.id } })
    expect(wonLead.stage).toBe('CLOSED')

    const commission = await db.commission.findFirstOrThrow({ where: { sourceRef: sale.id } })
    const payableRes = await app.inject({
      method: 'POST',
      url: `/finance/commissions/${commission.id}/payable`,
      headers: asAuth(testUserId),
      payload: { idempotencyKey: `test-payable-${commission.id}` },
    })
    expect(payableRes.statusCode).toBe(200)

    const reverseRes = await app.inject({
      method: 'POST',
      url: `/sales/${sale.id}/reverse`,
      headers: asAuth(testUserId),
      payload: { reason: 'customer refund' },
    })
    expect(reverseRes.statusCode).toBe(200)
    expect(reverseRes.json().data.reversedAt).toBeTruthy()

    const reopenedLead = await db.lead.findUniqueOrThrow({ where: { id: lead.id } })
    expect(reopenedLead.stage).toBe('INTERESTED')
    expect(reopenedLead.closedAt).toBeNull()

    const reversedCommission = await db.commission.findUniqueOrThrow({
      where: { id: commission.id },
    })
    expect(reversedCommission.status).toBe('REVERSED')

    // Idempotent — reversing again is a no-op, not an error
    const secondReverseRes = await app.inject({
      method: 'POST',
      url: `/sales/${sale.id}/reverse`,
      headers: asAuth(testUserId),
    })
    expect(secondReverseRes.statusCode).toBe(200)
  })

  it('payout cadence respects the threshold, then fires once it is met — MANUAL affiliates are never touched', async () => {
    const manual = await createAffiliate({ payoutCadence: 'MANUAL' })
    const { contact: manualContact, lead: manualLead } = await createReferredLead(
      manual.id,
      new Date(),
    )
    const manualSale = await recordSale(manualContact.id, manualLead.id, 1000)
    const manualCommission = await db.commission.findFirstOrThrow({
      where: { sourceRef: manualSale.id },
    })
    await app.inject({
      method: 'POST',
      url: `/finance/commissions/${manualCommission.id}/payable`,
      headers: asAuth(testUserId),
      payload: { idempotencyKey: `test-payable-${manualCommission.id}` },
    })

    const weekly = await createAffiliate({ payoutCadence: 'WEEKLY', payoutThresholdMinor: 10000 })
    const { contact: c1, lead: l1 } = await createReferredLead(weekly.id, new Date())
    const sale1 = await recordSale(c1.id, l1.id, 500) // 10% of $500 = $50 = 5000 minor
    const commission1 = await db.commission.findFirstOrThrow({ where: { sourceRef: sale1.id } })
    await app.inject({
      method: 'POST',
      url: `/finance/commissions/${commission1.id}/payable`,
      headers: asAuth(testUserId),
      payload: { idempotencyKey: `test-payable-${commission1.id}` },
    })

    // Below the $100 threshold (only $50 payable) — should not fire yet
    const firstRun = await runDuePayouts()
    expect(firstRun.paidOut).toBe(0)
    const stillPayable = await db.commission.findUniqueOrThrow({ where: { id: commission1.id } })
    expect(stillPayable.status).toBe('PAYABLE')
    const manualUntouched = await db.commission.findUniqueOrThrow({
      where: { id: manualCommission.id },
    })
    expect(manualUntouched.status).toBe('PAYABLE') // MANUAL cadence — never auto-paid

    // A second commission pushes the payable total to $100, meeting the threshold
    const { contact: c2, lead: l2 } = await createReferredLead(weekly.id, new Date())
    const sale2 = await recordSale(c2.id, l2.id, 500)
    const commission2 = await db.commission.findFirstOrThrow({ where: { sourceRef: sale2.id } })
    await app.inject({
      method: 'POST',
      url: `/finance/commissions/${commission2.id}/payable`,
      headers: asAuth(testUserId),
      payload: { idempotencyKey: `test-payable-${commission2.id}` },
    })

    const secondRun = await runDuePayouts()
    expect(secondRun.paidOut).toBe(1)

    const paid1 = await db.commission.findUniqueOrThrow({ where: { id: commission1.id } })
    const paid2 = await db.commission.findUniqueOrThrow({ where: { id: commission2.id } })
    expect(paid1.status).toBe('PAID')
    expect(paid2.status).toBe('PAID')

    const paidWeekly = await db.affiliate.findUniqueOrThrow({ where: { id: weekly.id } })
    expect(paidWeekly.lastPayoutAt).toBeTruthy()

    // Just paid — not due again on an immediate re-run even if more accrues later
    const thirdRun = await runDuePayouts()
    expect(thirdRun.paidOut).toBe(0)
  })
})
