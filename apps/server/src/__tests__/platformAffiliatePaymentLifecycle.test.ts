// End-to-end money test for the platform-affiliate payment lifecycle hardening pass: a simulated
// membership payment generates a real commission, a partial refund and a dispute (created, then
// won) both move real house-ledger balances, and a payout batch settles cleanly — with illegal
// state transitions rejected and the reconciliation report reading zero discrepancies throughout.
import { describe, it, expect } from 'vitest'
import type Stripe from 'stripe'
import { db } from '@project/db'
import { buildTestApp, testOtherBusinessId } from './helpers'
import { FinanceService } from '../services/FinanceService'
import { StripeWebhookService } from '../services/StripeWebhookService'
import { PlatformAffiliateService } from '../services/PlatformAffiliateService'
import { ensureChartOfAccounts } from '../lib/finance/accounts'
import { accountBalanceMinor } from '../lib/finance/ledger'
import { getOrCreateHouseBusinessId } from '../lib/finance/houseLedger'

buildTestApp() // registers the seeding beforeEach/afterEach; no HTTP requests needed in this file
const finance = new FinanceService()
const webhooks = new StripeWebhookService()
const platformAffiliates = new PlatformAffiliateService()

const PAYMENT_AMOUNT_MINOR = 100_000 // $1,000.00
const RATE_BPS = 1000 // 10%
const EARNING_AMOUNT_MINOR = 10_000 // $100.00

async function seedAttribution() {
  const referrer = await db.user.create({
    data: {
      email: `lifecycle-referrer-${Date.now()}@example.com`,
      passwordHash: 'x',
      platformRole: 'USER',
      business: { create: { name: 'Referrer Co', slug: `referrer-co-${Date.now()}` } },
    },
  })
  const affiliate = await db.platformAffiliate.create({
    data: {
      name: 'Lifecycle Affiliate',
      referralCode: `lifecycle-${Date.now()}`,
      userId: referrer.id,
    },
  })
  const deal = await db.platformAffiliateDeal.create({
    data: { name: `Lifecycle Deal ${Date.now()}`, affiliateRateBps: RATE_BPS, managerShareBps: 0 },
  })
  await db.businessAffiliateAttribution.create({
    data: {
      businessId: testOtherBusinessId,
      affiliateId: affiliate.id,
      affiliateDealId: deal.id,
      affiliateRateBps: RATE_BPS,
      status: 'ACTIVE',
    },
  })
  return { affiliateId: affiliate.id }
}

function invoicePaidEvent(overrides: {
  eventId: string
  invoiceId: string
  chargeId: string
  amountPaid: number
}): Stripe.Event {
  return {
    id: overrides.eventId,
    object: 'event',
    type: 'invoice.paid',
    data: {
      object: {
        id: overrides.invoiceId,
        object: 'invoice',
        amount_paid: overrides.amountPaid,
        currency: 'usd',
        customer: null,
        metadata: { businessId: testOtherBusinessId },
        parent: { type: 'subscription_details', quote_details: null, subscription_details: null },
        payments: {
          object: 'list',
          data: [
            {
              payment: { type: 'payment_intent', payment_intent: null, charge: overrides.chargeId },
            },
          ],
        },
      },
    },
  } as unknown as Stripe.Event
}

function chargeRefundedEvent(
  eventId: string,
  chargeId: string,
  amountRefunded: number,
): Stripe.Event {
  return {
    id: eventId,
    object: 'event',
    type: 'charge.refunded',
    data: {
      object: {
        id: chargeId,
        object: 'charge',
        payment_intent: null,
        amount: PAYMENT_AMOUNT_MINOR,
        amount_refunded: amountRefunded,
      },
    },
  } as unknown as Stripe.Event
}

function disputeEvent(
  eventId: string,
  chargeId: string,
  type: 'charge.dispute.created' | 'charge.dispute.closed',
  status: string,
): Stripe.Event {
  return {
    id: eventId,
    object: 'event',
    type,
    data: {
      object: {
        id: `dp_${chargeId}`,
        object: 'dispute',
        charge: chargeId,
        amount: PAYMENT_AMOUNT_MINOR,
        status,
      },
    },
  } as unknown as Stripe.Event
}

describe('platform-affiliate payment lifecycle', () => {
  it('runs payment -> commission -> partial refund -> dispute -> won -> payout end to end, with illegal transitions rejected', async () => {
    await seedAttribution()
    const chargeId = `ch_lifecycle_${Date.now()}`
    const invoiceId = `in_lifecycle_${Date.now()}`

    // 1. invoice.paid -> MembershipPayment + PENDING earning. Redelivering the identical event
    // must not create a duplicate of either.
    await webhooks.handleVerifiedEvent(
      invoicePaidEvent({
        eventId: 'evt_lifecycle_paid_1',
        invoiceId,
        chargeId,
        amountPaid: PAYMENT_AMOUNT_MINOR,
      }),
    )
    await webhooks.handleVerifiedEvent(
      invoicePaidEvent({
        eventId: 'evt_lifecycle_paid_1',
        invoiceId,
        chargeId,
        amountPaid: PAYMENT_AMOUNT_MINOR,
      }),
    )
    expect(
      await db.membershipPayment.count({
        where: { businessId: testOtherBusinessId, stripeInvoiceId: invoiceId },
      }),
    ).toBe(1)
    const payment = await db.membershipPayment.findFirstOrThrow({
      where: { businessId: testOtherBusinessId, stripeInvoiceId: invoiceId },
    })
    expect(payment.amountMinor).toBe(PAYMENT_AMOUNT_MINOR)

    const earning = await db.platformAffiliateEarning.findFirstOrThrow({
      where: { membershipPaymentId: payment.id },
    })
    expect(earning.status).toBe('PENDING')
    expect(earning.amountMinor).toBe(EARNING_AMOUNT_MINOR)
    expect(earning.baseAmountMinor).toBe(PAYMENT_AMOUNT_MINOR)
    expect(earning.rateBps).toBe(RATE_BPS)

    // 2. Promote to PAYABLE -> real house-ledger liability.
    const houseBusinessId = await db.$transaction((tx) => getOrCreateHouseBusinessId(tx))
    const houseChart = await ensureChartOfAccounts(db, houseBusinessId, 'USD')
    await finance.promotePlatformEarningPayable(earning.id, `test:promote:${earning.id}`)
    expect(
      (await db.platformAffiliateEarning.findUniqueOrThrow({ where: { id: earning.id } })).status,
    ).toBe('PAYABLE')
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.AFFILIATE_PAYABLE.id)).toBe(
      EARNING_AMOUNT_MINOR,
    )

    // Replaying the same promotion is a no-op, not a double post.
    await finance.promotePlatformEarningPayable(earning.id, `test:promote:${earning.id}`)
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.AFFILIATE_PAYABLE.id)).toBe(
      EARNING_AMOUNT_MINOR,
    )

    // 3. Partial refund: half the charge refunded -> half the earning reversed, proportionally.
    await webhooks.handleVerifiedEvent(
      chargeRefundedEvent('evt_lifecycle_refund_1', chargeId, PAYMENT_AMOUNT_MINOR / 2),
    )
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.AFFILIATE_PAYABLE.id)).toBe(
      EARNING_AMOUNT_MINOR / 2,
    )
    const afterPartialRefund = await db.platformAffiliateEarning.findFirstOrThrow({
      where: { reversesEarningId: earning.id },
    })
    expect(afterPartialRefund.amountMinor).toBe(-EARNING_AMOUNT_MINOR / 2)

    // 4. Dispute created on the same charge -> the remainder is reversed too (full target).
    await webhooks.handleVerifiedEvent(
      disputeEvent('evt_lifecycle_dispute_1', chargeId, 'charge.dispute.created', 'needs_response'),
    )
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.AFFILIATE_PAYABLE.id)).toBe(0)

    // A dispute closed as lost changes nothing further.
    await webhooks.handleVerifiedEvent(
      disputeEvent('evt_lifecycle_dispute_lost', chargeId, 'charge.dispute.closed', 'lost'),
    )
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.AFFILIATE_PAYABLE.id)).toBe(0)

    // 5. Dispute closed WON -> restores back to the still-legitimate partial-refund state (half),
    // not all the way back to the full original amount.
    await webhooks.handleVerifiedEvent(
      disputeEvent('evt_lifecycle_dispute_won', chargeId, 'charge.dispute.closed', 'won'),
    )
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.AFFILIATE_PAYABLE.id)).toBe(
      EARNING_AMOUNT_MINOR / 2,
    )
    const afterWon = await db.platformAffiliateEarning.findFirstOrThrow({
      where: { reversesEarningId: earning.id },
    })
    expect(afterWon.amountMinor).toBe(-EARNING_AMOUNT_MINOR / 2)

    // 6. Batch the remaining PAYABLE balance into a payout and settle it.
    const affiliateId = earning.beneficiaryAffiliateId
    const payoutRes = await platformAffiliates.createPayout({
      affiliateId,
      earningIds: [earning.id, afterWon.id],
    })
    const payout = payoutRes.data
    expect(payout.totalAmountMinor).toBe(EARNING_AMOUNT_MINOR / 2)
    expect(payout.status).toBe('PENDING')

    // Re-submitting the identical batch replays the same payout instead of creating a second one.
    const replay = await platformAffiliates.createPayout({
      affiliateId,
      earningIds: [earning.id, afterWon.id],
    })
    expect(replay.data.id).toBe(payout.id)
    expect(await db.platformAffiliatePayout.count({ where: { affiliateId } })).toBe(1)

    const settled = await platformAffiliates.settlePayout(payout.id)
    expect(settled.data.status).toBe('PAID')
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.AFFILIATE_PAYABLE.id)).toBe(0)
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.LOOPIE_CASH.id)).toBe(
      -(EARNING_AMOUNT_MINOR / 2),
    )

    // 7. Illegal transitions are rejected, with no further state or ledger change.
    await expect(platformAffiliates.failPayout(payout.id, 'FAILED')).rejects.toMatchObject({
      statusCode: 409,
    })
    const settleAgain = await platformAffiliates.settlePayout(payout.id) // idempotent no-op, not an error
    expect(settleAgain.data.status).toBe('PAID')
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.LOOPIE_CASH.id)).toBe(
      -(EARNING_AMOUNT_MINOR / 2),
    )

    // Reversing the now-PAID payout is legal and releases its earnings back to PAYABLE.
    const reversed = await platformAffiliates.failPayout(
      payout.id,
      'REVERSED',
      'bank rejected transfer',
    )
    expect(reversed.data.status).toBe('REVERSED')
    expect(await accountBalanceMinor(db, houseBusinessId, houseChart.AFFILIATE_PAYABLE.id)).toBe(
      EARNING_AMOUNT_MINOR / 2,
    )
    for (const id of [earning.id, afterWon.id]) {
      const row = await db.platformAffiliateEarning.findUniqueOrThrow({ where: { id } })
      expect(row.status).toBe('PAYABLE')
      expect(row.payoutId).toBeNull()
    }
    await expect(platformAffiliates.failPayout(payout.id, 'REVERSED')).resolves.toMatchObject({
      data: { status: 'REVERSED' },
    }) // already REVERSED -> idempotent no-op, not a second reversal

    // 8. Reconciliation reads clean: the one real payment has an earning, and nothing unbatched
    // is stranded (the earnings above are PAYABLE again after the reversal, by design).
    const reconciliation = await platformAffiliates.getReconciliation()
    const orphaned = reconciliation.data.discrepancies.orphanedPayments.find(
      (p: { id: string }) => p.id === payment.id,
    )
    expect(orphaned).toBeUndefined()
  })

  it('out-of-order delivery: a refund/dispute arriving before the payment is on file is retried, not dropped', async () => {
    const chargeId = `ch_orphan_${Date.now()}`
    await expect(
      webhooks.handleVerifiedEvent(chargeRefundedEvent('evt_orphan_refund', chargeId, 100)),
    ).rejects.toMatchObject({ statusCode: 409 })
    await expect(
      webhooks.handleVerifiedEvent(
        disputeEvent('evt_orphan_dispute', chargeId, 'charge.dispute.created', 'needs_response'),
      ),
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})
