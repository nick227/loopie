import { describe, it, expect } from 'vitest'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testShopUserId, testBusinessId } from './helpers'
import { FinanceService } from '../services/FinanceService'
import { StripeWebhookService } from '../services/StripeWebhookService'
import { ensureChartOfAccounts } from '../lib/finance/accounts'
import { accountBalanceMinor } from '../lib/finance/ledger'
import type Stripe from 'stripe'

const app = buildTestApp()
const finance = new FinanceService()
const webhooks = new StripeWebhookService()

function invoicePaidEvent(overrides: Partial<Stripe.Invoice> = {}): Stripe.Event {
  const invoice = {
    id: 'in_test_299',
    object: 'invoice',
    amount_paid: 29900,
    currency: 'usd',
    customer: 'cus_test_1',
    metadata: { businessId: testBusinessId },
    parent: {
      type: 'subscription_details',
      quote_details: null,
      subscription_details: {
        subscription: 'sub_test_1',
        metadata: { businessId: testBusinessId },
      },
    },
    payments: {
      object: 'list',
      data: [
        {
          payment: {
            type: 'payment_intent',
            payment_intent: 'pi_test_1',
            charge: 'ch_test_1',
          },
        },
      ],
    },
    ...overrides,
  }
  return {
    id: 'evt_invoice_paid_1',
    object: 'event',
    type: 'invoice.paid',
    data: { object: invoice },
  } as unknown as Stripe.Event
}

describe('Stripe service billing', () => {
  it('posts PROCESSOR_CLEARING / LOOPIE_REVENUE and never credits CLIENT_AD_FUNDS', async () => {
    await webhooks.handleVerifiedEvent(invoicePaidEvent())
    const chart = await ensureChartOfAccounts(db, testBusinessId, 'USD')
    expect(await accountBalanceMinor(db, testBusinessId, chart.PROCESSOR_CLEARING.id)).toBe(29900)
    expect(await accountBalanceMinor(db, testBusinessId, chart.LOOPIE_REVENUE.id)).toBe(29900)
    expect(await accountBalanceMinor(db, testBusinessId, chart.CLIENT_AD_FUNDS.id)).toBe(0)

    const payment = await db.payment.findFirstOrThrow({ where: { businessId: testBusinessId } })
    expect(payment.processor).toBe('STRIPE')
    expect(payment.externalRef).toBe('in_test_299')
    expect(payment.idempotencyKey).toBe('evt_invoice_paid_1')
    expect(payment.stripePaymentIntentId).toBe('pi_test_1')
    expect(payment.status).toBe('POSTED')

    const tx = await db.ledgerTransaction.findUniqueOrThrow({ where: { id: payment.ledgerTransactionId } })
    expect(tx.type).toBe('SERVICE_PAYMENT')
    expect(tx.externalProvider).toBe('STRIPE')
    expect(tx.externalRef).toBe('in_test_299')
  })

  it('replays the same event id and the same invoice id without a second post', async () => {
    await webhooks.handleVerifiedEvent(invoicePaidEvent())
    await webhooks.handleVerifiedEvent(invoicePaidEvent())
    await webhooks.handleVerifiedEvent(invoicePaidEvent({ id: 'in_test_299' }))
    await webhooks.handleVerifiedEvent({
      ...invoicePaidEvent(),
      id: 'evt_invoice_paid_2',
    })
    expect(await db.payment.count({ where: { businessId: testBusinessId } })).toBe(1)
    const chart = await ensureChartOfAccounts(db, testBusinessId, 'USD')
    expect(await accountBalanceMinor(db, testBusinessId, chart.LOOPIE_REVENUE.id)).toBe(29900)
  })

  it('refunds by reversal without editing the original payment', async () => {
    await webhooks.handleVerifiedEvent(invoicePaidEvent())
    const payment = await db.payment.findFirstOrThrow({ where: { businessId: testBusinessId } })
    await webhooks.handleVerifiedEvent({
      id: 'evt_refund_1',
      object: 'event',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_1',
          object: 'charge',
          payment_intent: 'pi_test_1',
        },
      },
    } as unknown as Stripe.Event)

    const still = await db.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(still.status).toBe('POSTED')
    const refund = await db.refund.findFirstOrThrow({ where: { paymentId: payment.id } })
    expect(refund.amountMinor).toBe(29900)
    const reversal = await db.ledgerTransaction.findUniqueOrThrow({ where: { id: refund.ledgerTransactionId } })
    expect(reversal.type).toBe('REVERSAL')
    expect(reversal.reversesTransactionId).toBe(payment.ledgerTransactionId)

    const chart = await ensureChartOfAccounts(db, testBusinessId, 'USD')
    expect(await accountBalanceMinor(db, testBusinessId, chart.LOOPIE_REVENUE.id)).toBe(0)
    expect(await accountBalanceMinor(db, testBusinessId, chart.CLIENT_AD_FUNDS.id)).toBe(0)
  })

  it('GET /billing is admin-only and recordClientFunding stays a separate custodial path', async () => {
    const billing = await app.inject({ method: 'GET', url: '/billing', headers: asAuth(testUserId) })
    expect(billing.statusCode).toBe(200)
    expect(billing.json().data.subscriptionStatus).toBe(null)

    const denied = await app.inject({ method: 'GET', url: '/billing', headers: asAuth(testShopUserId) })
    expect(denied.statusCode).toBe(403)

    await finance.recordClientFunding(testBusinessId, {
      amountMinor: 1000,
      currency: 'USD',
      idempotencyKey: 'custodial-only',
    })
    const chart = await ensureChartOfAccounts(db, testBusinessId, 'USD')
    expect(await accountBalanceMinor(db, testBusinessId, chart.CLIENT_AD_FUNDS.id)).toBe(1000)
    expect(await accountBalanceMinor(db, testBusinessId, chart.LOOPIE_REVENUE.id)).toBe(0)
  })

  it('sets a spend limit and records reported spend without client wallet funds', async () => {
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Non-custodial creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Non-custodial campaign',
        budget: 800,
        startDate: new Date(),
        platforms: ['META'],
        creativeLinks: { create: [{ creativeId: creative.id }] },
      },
    })
    const auth = await app.inject({
      method: 'POST',
      url: `/campaigns/${campaign.id}/budget-authorizations`,
      headers: asAuth(testUserId),
      payload: { amountMinor: 80000, currency: 'USD', idempotencyKey: 'limit-800' },
    })
    expect(auth.statusCode).toBe(201)
    expect(auth.json().data.ledgerTransactionId).toBeNull()

    const spend = await app.inject({
      method: 'POST',
      url: '/finance/ad-spend',
      headers: asAuth(testUserId),
      payload: {
        campaignId: campaign.id,
        amountMinor: 12537,
        currency: 'USD',
        platform: 'META',
        externalChargeId: 'meta_obs_12537',
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-07T00:00:00.000Z',
        idempotencyKey: 'spend-obs-12537',
      },
    })
    expect(spend.statusCode).toBe(201)
    expect(spend.json().data.ledgerTransactionId).toBeNull()
    expect(spend.json().data.reportedAmountMinor).toBe(12537)

    const chart = await ensureChartOfAccounts(db, testBusinessId, 'USD')
    expect(await accountBalanceMinor(db, testBusinessId, chart.CLIENT_AD_FUNDS.id)).toBe(0)
  })
})
