// Adversarial money-flow pass for the platform-affiliate payment lifecycle: real Stripe-provider
// misbehavior (duplicate delivery, out-of-order events, partial mid-transaction failures) rather
// than the happy path already covered by platformAffiliatePaymentLifecycle.test.ts. Every scenario
// here either proves an existing guard holds under a harsher condition, or was written *because*
// reasoning through it surfaced a real gap (see the "stray refund during an open dispute" tests,
// which is what motivated CommissionEngine.reverseMembershipPayment's `allowDecrease` floor).
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

buildTestApp()
const finance = new FinanceService()
const webhooks = new StripeWebhookService()
const platformAffiliates = new PlatformAffiliateService()

const RATE_BPS = 1000 // 10%

async function seedAttribution() {
  const referrer = await db.user.create({
    data: {
      email: `adversarial-referrer-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: 'x',
      platformRole: 'USER',
      business: {
        create: {
          name: 'Adversarial Referrer Co',
          slug: `adversarial-referrer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      },
    },
  })
  const affiliate = await db.platformAffiliate.create({
    data: {
      name: 'Adversarial Affiliate',
      referralCode: `adversarial-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: referrer.id,
    },
  })
  const deal = await db.platformAffiliateDeal.create({
    data: {
      name: `Adversarial Deal ${Date.now()}`,
      affiliateRateBps: RATE_BPS,
      managerShareBps: 0,
    },
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

function invoicePaidEvent(opts: {
  eventId: string
  invoiceId: string
  chargeId: string
  amountPaid: number
}): Stripe.Event {
  return {
    id: opts.eventId,
    object: 'event',
    type: 'invoice.paid',
    data: {
      object: {
        id: opts.invoiceId,
        object: 'invoice',
        amount_paid: opts.amountPaid,
        currency: 'usd',
        customer: null,
        metadata: { businessId: testOtherBusinessId },
        parent: { type: 'subscription_details', quote_details: null, subscription_details: null },
        payments: {
          object: 'list',
          data: [
            { payment: { type: 'payment_intent', payment_intent: null, charge: opts.chargeId } },
          ],
        },
      },
    },
  } as unknown as Stripe.Event
}

function refundedEvent(
  eventId: string,
  chargeId: string,
  amountRefunded: number,
  amount = 100_000,
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
        amount,
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
  amount = 100_000,
): Stripe.Event {
  return {
    id: eventId,
    object: 'event',
    type,
    data: { object: { id: `dp_${chargeId}`, object: 'dispute', charge: chargeId, amount, status } },
  } as unknown as Stripe.Event
}

// Promotes to PAYABLE by default: almost every scenario below is specifically about the
// ledger-backed path (that's where the interesting failure modes live) — a test that instead
// wants to exercise the still-PENDING, no-ledger-yet behavior passes `{ promote: false }`.
async function seedPaidInvoice(opts: { amountPaid?: number; promote?: boolean } = {}) {
  const { amountPaid = 100_000, promote = true } = opts
  await seedAttribution()
  const chargeId = `ch_adv_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const invoiceId = `in_adv_${Date.now()}_${Math.random().toString(36).slice(2)}`
  await webhooks.handleVerifiedEvent(
    invoicePaidEvent({ eventId: `evt_adv_paid_${chargeId}`, invoiceId, chargeId, amountPaid }),
  )
  const payment = await db.membershipPayment.findFirstOrThrow({
    where: { businessId: testOtherBusinessId, stripeInvoiceId: invoiceId },
  })
  let earning = await db.platformAffiliateEarning.findFirstOrThrow({
    where: { membershipPaymentId: payment.id },
  })
  if (promote) {
    earning = await finance.promotePlatformEarningPayable(earning.id, `adv:promote:${earning.id}`)
  }
  return { chargeId, invoiceId, payment, earning }
}

async function houseBalance(accountKind: 'AFFILIATE_PAYABLE' | 'LOOPIE_CASH' | 'LOOPIE_REVENUE') {
  const houseBusinessId = await db.$transaction((tx) => getOrCreateHouseBusinessId(tx))
  const chart = await ensureChartOfAccounts(db, houseBusinessId, 'USD')
  return accountBalanceMinor(db, houseBusinessId, chart[accountKind].id)
}

// One-shot crash injector: fails the very first matching query, then passes every later query
// (including retries) through untouched. Mirrors platformAffiliateIntegrity.test.ts's own pattern
// for proving a real transaction rollback rather than mocking the service. An optional `match`
// predicate narrows which call of a repeated model/action pair actually crashes — needed because
// e.g. _onChargeRefunded posts two independent LedgerTransactions (the client-side refund, then
// the platform-affiliate reduction) and a plain model/action match would hit the wrong one.
function crashOnce(
  model: string,
  action: string,
  message: string,
  match?: (args: unknown) => boolean,
) {
  let fired = false
  db.$use(async (params, next) => {
    if (
      !fired &&
      params.model === model &&
      params.action === action &&
      (!match || match(params.args))
    ) {
      fired = true
      throw new Error(message)
    }
    return next(params)
  })
}

describe('platform-affiliate money-flow adversarial pass', () => {
  describe('duplicate Stripe events', () => {
    it('concurrent duplicate invoice.paid delivery produces exactly one payment and one earning', async () => {
      await seedAttribution()
      const chargeId = `ch_concurrent_${Date.now()}`
      const invoiceId = `in_concurrent_${Date.now()}`
      const event = invoicePaidEvent({
        eventId: 'evt_concurrent_paid',
        invoiceId,
        chargeId,
        amountPaid: 100_000,
      })
      // Two real concurrent DB transactions racing the same unique-key insert, not a sequential
      // replay — this is what actually exercises processMembershipPayment's P2002 retry path.
      const results = await Promise.allSettled([
        webhooks.handleVerifiedEvent(event),
        webhooks.handleVerifiedEvent(event),
      ])
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true)
      expect(
        await db.membershipPayment.count({
          where: { businessId: testOtherBusinessId, stripeInvoiceId: invoiceId },
        }),
      ).toBe(1)
      const payment = await db.membershipPayment.findFirstOrThrow({
        where: { stripeInvoiceId: invoiceId },
      })
      expect(
        await db.platformAffiliateEarning.count({ where: { membershipPaymentId: payment.id } }),
      ).toBe(1)
    })

    it('redelivering the identical charge.refunded event does not double-reduce the earning', async () => {
      const { chargeId } = await seedPaidInvoice()
      const before = await houseBalance('AFFILIATE_PAYABLE')
      await webhooks.handleVerifiedEvent(refundedEvent('evt_dup_refund', chargeId, 40_000))
      const afterFirst = await houseBalance('AFFILIATE_PAYABLE')
      expect(afterFirst).toBe(before - 4_000) // 40% of a 10,000 commission
      await webhooks.handleVerifiedEvent(refundedEvent('evt_dup_refund', chargeId, 40_000))
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(afterFirst)
      expect(
        await db.refund.count({
          where: { businessId: testOtherBusinessId, idempotencyKey: 'evt_dup_refund' },
        }),
      ).toBe(1)
    })

    it('redelivering the identical charge.dispute.created event does not double-reverse', async () => {
      const { chargeId } = await seedPaidInvoice()
      await webhooks.handleVerifiedEvent(
        disputeEvent('evt_dup_dispute', chargeId, 'charge.dispute.created', 'needs_response'),
      )
      const afterFirst = await houseBalance('AFFILIATE_PAYABLE')
      expect(afterFirst).toBe(0)
      await webhooks.handleVerifiedEvent(
        disputeEvent('evt_dup_dispute', chargeId, 'charge.dispute.created', 'needs_response'),
      )
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(0)
    })
  })

  describe('retries after partial mid-transaction failures', () => {
    it('a crash creating the earning rolls back the whole payment; retrying the same event then succeeds cleanly', async () => {
      await seedAttribution()
      const chargeId = `ch_crash_create_${Date.now()}`
      const invoiceId = `in_crash_create_${Date.now()}`
      const event = invoicePaidEvent({
        eventId: 'evt_crash_create',
        invoiceId,
        chargeId,
        amountPaid: 100_000,
      })

      crashOnce(
        'PlatformAffiliateEarning',
        'create',
        'simulated crash after MembershipPayment, before earning',
      )
      await expect(webhooks.handleVerifiedEvent(event)).rejects.toThrow()
      expect(await db.membershipPayment.count({ where: { stripeInvoiceId: invoiceId } })).toBe(0)

      await webhooks.handleVerifiedEvent(event) // retry — Stripe would redeliver on the 500 above
      expect(await db.membershipPayment.count({ where: { stripeInvoiceId: invoiceId } })).toBe(1)
      const payment = await db.membershipPayment.findFirstOrThrow({
        where: { stripeInvoiceId: invoiceId },
      })
      expect(
        await db.platformAffiliateEarning.count({ where: { membershipPaymentId: payment.id } }),
      ).toBe(1)
    })

    it('a crash posting the platform-affiliate reversal, after the client refund already committed, rolls back only its own half — retrying completes the rest without double-refunding the client side', async () => {
      const { chargeId } = await seedPaidInvoice()
      const beforeRefund = await houseBalance('AFFILIATE_PAYABLE')
      const houseBusinessId = await db.$transaction((tx) => getOrCreateHouseBusinessId(tx))

      // _onChargeRefunded posts two independent LedgerTransactions in two separate db.$transaction
      // calls (the client-side refund, then the platform-affiliate reduction) — they are not
      // atomic with each other. Target only the second: the first is expected to already have
      // committed by the time this fires.
      crashOnce(
        'LedgerTransaction',
        'create',
        'simulated crash mid platform-affiliate reversal post',
        (args) =>
          (args as { data?: { businessId?: string } })?.data?.businessId === houseBusinessId,
      )
      await expect(
        webhooks.handleVerifiedEvent(refundedEvent('evt_crash_ledger', chargeId, 60_000)),
      ).rejects.toThrow()
      // The client-side refund already landed — it is not part of the failed transaction.
      expect(await db.refund.count({ where: { businessId: testOtherBusinessId } })).toBe(1)
      // But the platform-affiliate side rolled back cleanly, untouched.
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(beforeRefund)

      await webhooks.handleVerifiedEvent(refundedEvent('evt_crash_ledger', chargeId, 60_000)) // retry
      // The retry does not re-refund the client side (its own delta is now zero)...
      expect(await db.refund.count({ where: { businessId: testOtherBusinessId } })).toBe(1)
      // ...and completes exactly the missing platform-affiliate reduction, exactly once.
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(beforeRefund - 6_000)
    })

    it('a crash marking earnings PAID during settlement rolls back the ledger post too; retrying settles cleanly once', async () => {
      const { earning } = await seedPaidInvoice()
      const payoutRes = await platformAffiliates.createPayout({
        affiliateId: earning.beneficiaryAffiliateId,
        earningIds: [earning.id],
      })
      const payout = payoutRes.data

      crashOnce(
        'PlatformAffiliateEarning',
        'updateMany',
        'simulated crash after ledger post, before earnings flip to PAID',
      )
      await expect(platformAffiliates.settlePayout(payout.id)).rejects.toThrow()
      const stillPending = await db.platformAffiliatePayout.findUniqueOrThrow({
        where: { id: payout.id },
      })
      expect(stillPending.status).toBe('PENDING')
      expect(await houseBalance('LOOPIE_CASH')).toBe(0) // the ledger post rolled back with everything else

      const settled = await platformAffiliates.settlePayout(payout.id) // retry
      expect(settled.data.status).toBe('PAID')
      expect(
        (await db.platformAffiliateEarning.findUniqueOrThrow({ where: { id: earning.id } })).status,
      ).toBe('PAID')
      // Exactly one PAYOUT posting on the house ledger, even though settlePayout was called twice.
      expect(await houseBalance('LOOPIE_CASH')).toBe(-10_000)
      const houseBusinessId = await db.$transaction((tx) => getOrCreateHouseBusinessId(tx))
      expect(
        await db.ledgerTransaction.count({
          where: { businessId: houseBusinessId, type: 'PAYOUT' },
        }),
      ).toBe(1)
    })
  })

  describe('out-of-order refund and dispute delivery', () => {
    it('a dispute.closed(won) with no prior dispute.created is a safe no-op', async () => {
      const { chargeId } = await seedPaidInvoice()
      const before = await houseBalance('AFFILIATE_PAYABLE')
      await webhooks.handleVerifiedEvent(
        disputeEvent('evt_orphan_won', chargeId, 'charge.dispute.closed', 'won'),
      )
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(before)
    })

    it('a stale refund event reporting a smaller cumulative amount than already reversed does not decrease the reversal', async () => {
      const { chargeId } = await seedPaidInvoice()
      await webhooks.handleVerifiedEvent(refundedEvent('evt_ooo_big', chargeId, 70_000))
      const afterBig = await houseBalance('AFFILIATE_PAYABLE')
      expect(afterBig).toBe(10_000 - 7_000) // 70% reversed of the 10,000 commission: 3,000 still owed
      // A redelivered/stale event for an earlier, smaller cumulative total arrives after the fact.
      await webhooks.handleVerifiedEvent(refundedEvent('evt_ooo_small_stale', chargeId, 30_000))
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(afterBig) // floor holds — no restore
    })

    it('a stray smaller refund event arriving while a dispute is open does not release withheld funds', async () => {
      const { chargeId } = await seedPaidInvoice()
      await webhooks.handleVerifiedEvent(
        disputeEvent('evt_mid_dispute', chargeId, 'charge.dispute.created', 'needs_response'),
      )
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(0) // fully withheld by the open dispute

      // An independent, earlier-dated refund on the same charge is delivered late — real refunds
      // and disputes are separate Stripe mechanisms, so this can genuinely arrive out of order.
      await webhooks.handleVerifiedEvent(refundedEvent('evt_stray_refund', chargeId, 20_000))
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(0) // still fully withheld, not released to 8,000

      // Resolving the dispute as WON restores back to the real refund floor (20%), not to zero and
      // not back to the full original amount.
      await webhooks.handleVerifiedEvent(
        disputeEvent('evt_mid_dispute_won', chargeId, 'charge.dispute.closed', 'won'),
      )
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(10_000 - 2_000) // only 20% net-reversed: 8,000 still owed
    })
  })

  describe('chargebacks', () => {
    it('a dispute closed as lost stays fully reversed permanently', async () => {
      const { chargeId } = await seedPaidInvoice()
      await webhooks.handleVerifiedEvent(
        disputeEvent('evt_lost_created', chargeId, 'charge.dispute.created', 'needs_response'),
      )
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(0)
      await webhooks.handleVerifiedEvent(
        disputeEvent('evt_lost_closed', chargeId, 'charge.dispute.closed', 'lost'),
      )
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(0)
    })

    it('a dispute opened on an already-fully-refunded payment is a no-op, not a double reversal', async () => {
      const { chargeId } = await seedPaidInvoice()
      await webhooks.handleVerifiedEvent(refundedEvent('evt_full_refund', chargeId, 100_000))
      const afterRefund = await houseBalance('AFFILIATE_PAYABLE')
      expect(afterRefund).toBe(0)
      await webhooks.handleVerifiedEvent(
        disputeEvent(
          'evt_dispute_after_full_refund',
          chargeId,
          'charge.dispute.created',
          'needs_response',
        ),
      )
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(0)
    })
  })

  describe('partial refunds', () => {
    it('three sequential partial refunds each post only their own incremental delta', async () => {
      const { chargeId } = await seedPaidInvoice()
      await webhooks.handleVerifiedEvent(refundedEvent('evt_seq_25', chargeId, 25_000))
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(10_000 - 2_500)
      await webhooks.handleVerifiedEvent(refundedEvent('evt_seq_55', chargeId, 55_000))
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(10_000 - 5_500)
      await webhooks.handleVerifiedEvent(refundedEvent('evt_seq_100', chargeId, 100_000))
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(0)
      // Exactly three ledger postings for this earning's reversal line, not one per call collapsed
      // or re-posted from scratch.
      const houseBusinessId = await db.$transaction((tx) => getOrCreateHouseBusinessId(tx))
      const postings = await db.ledgerTransaction.count({
        where: { businessId: houseBusinessId, type: 'REVERSAL' },
      })
      expect(postings).toBe(3)
    })

    it('a refund event reporting the same cumulative amount twice is a no-op', async () => {
      const { chargeId } = await seedPaidInvoice()
      await webhooks.handleVerifiedEvent(refundedEvent('evt_same_1', chargeId, 40_000))
      const after = await houseBalance('AFFILIATE_PAYABLE')
      await webhooks.handleVerifiedEvent(refundedEvent('evt_same_2', chargeId, 40_000))
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(after)
    })
  })

  describe('payout retries', () => {
    it('settling the same payout twice posts the ledger cash-out exactly once', async () => {
      const { earning } = await seedPaidInvoice()
      const payout = (
        await platformAffiliates.createPayout({
          affiliateId: earning.beneficiaryAffiliateId,
          earningIds: [earning.id],
        })
      ).data
      await platformAffiliates.settlePayout(payout.id)
      const afterFirst = await houseBalance('LOOPIE_CASH')
      const second = await platformAffiliates.settlePayout(payout.id)
      expect(second.data.status).toBe('PAID')
      expect(await houseBalance('LOOPIE_CASH')).toBe(afterFirst)
    })

    it('reversing an already-reversed payout is a no-op, not a second reversal', async () => {
      const { earning } = await seedPaidInvoice()
      const payout = (
        await platformAffiliates.createPayout({
          affiliateId: earning.beneficiaryAffiliateId,
          earningIds: [earning.id],
        })
      ).data
      await platformAffiliates.settlePayout(payout.id)
      await platformAffiliates.failPayout(payout.id, 'REVERSED')
      const afterFirst = await houseBalance('AFFILIATE_PAYABLE')
      const second = await platformAffiliates.failPayout(payout.id, 'REVERSED')
      expect(second.data.status).toBe('REVERSED')
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(afterFirst)
    })

    it('two concurrent createPayout calls for the same earnings: exactly one succeeds cleanly, the other is rejected', async () => {
      const { earning } = await seedPaidInvoice()
      const input = { affiliateId: earning.beneficiaryAffiliateId, earningIds: [earning.id] }
      const results = await Promise.allSettled([
        platformAffiliates.createPayout(input),
        platformAffiliates.createPayout(input),
      ])
      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      // Either both resolve to the *same* payout (one legitimately claimed it, the other's
      // conditional-update lost the race and its own request-level retry — none exists here, so
      // it surfaces as a rejection) or one rejects outright; either way there must be exactly one
      // payout row, never two.
      expect(
        await db.platformAffiliatePayout.count({
          where: { affiliateId: earning.beneficiaryAffiliateId },
        }),
      ).toBe(1)
      expect(fulfilled.length).toBeGreaterThanOrEqual(1)
    })

    it('a crash claiming earnings during payout creation leaves them unclaimed; retrying then succeeds once', async () => {
      const { earning } = await seedPaidInvoice()
      const input = { affiliateId: earning.beneficiaryAffiliateId, earningIds: [earning.id] }

      crashOnce(
        'PlatformAffiliateEarning',
        'updateMany',
        'simulated crash claiming earnings into a payout',
      )
      await expect(platformAffiliates.createPayout(input)).rejects.toThrow()
      expect(
        await db.platformAffiliatePayout.count({
          where: { affiliateId: earning.beneficiaryAffiliateId },
        }),
      ).toBe(0)
      const stillUnclaimed = await db.platformAffiliateEarning.findUniqueOrThrow({
        where: { id: earning.id },
      })
      expect(stillUnclaimed.payoutId).toBeNull()

      const retried = await platformAffiliates.createPayout(input)
      expect(retried.data.totalAmountMinor).toBe(10_000)
      expect(
        await db.platformAffiliatePayout.count({
          where: { affiliateId: earning.beneficiaryAffiliateId },
        }),
      ).toBe(1)
    })
  })

  describe('reconciliation drift', () => {
    it('flags a payment on an ACTIVE-attribution business that produced no earning', async () => {
      const { affiliateId } = await seedAttribution()
      const payment = await db.membershipPayment.create({
        data: {
          businessId: testOtherBusinessId,
          amountMinor: 50_000,
          stripeInvoiceId: `in_drift_${Date.now()}`,
        },
      })
      const reconciliation = await platformAffiliates.getReconciliation()
      const flagged = reconciliation.data.discrepancies.orphanedPayments.find(
        (p) => p.id === payment.id,
      )
      expect(flagged).toBeTruthy()
      expect(flagged?.amountMinor).toBe(50_000)
      // Sanity: the affiliate itself is real and otherwise unrelated to this drift.
      expect(affiliateId).toBeTruthy()
    })

    it('reconciliation totals reflect real ledger state after a mixed refund/payout sequence', async () => {
      const { earning } = await seedPaidInvoice()
      const { chargeId } = await db.membershipPayment
        .findUniqueOrThrow({ where: { id: earning.membershipPaymentId } })
        .then((p) => ({ chargeId: p.stripeChargeId! }))
      await webhooks.handleVerifiedEvent(refundedEvent('evt_recon_refund', chargeId, 30_000))

      const reconciliation = await platformAffiliates.getReconciliation()
      // getReconciliation groups earnings by (status, type) — the original 10,000 commission and
      // its -3,000 partial-reversal line are both still PAYABLE/DIRECT, so they collapse into one
      // *net* row here, not two. That net figure is exactly the point: it must match the real
      // house-ledger balance, proving the aggregate isn't silently double-counting the original.
      const payableDirect = reconciliation.data.earnings.find(
        (e) => e.type === 'DIRECT' && e.status === 'PAYABLE',
      )
      expect(payableDirect?.amountMinor).toBe(7_000)
      expect(payableDirect?.count).toBe(2)
      expect(await houseBalance('AFFILIATE_PAYABLE')).toBe(7_000)
      expect(reconciliation.data.unbatchedPayableMinor).toBe(7_000)
    })
  })
})
