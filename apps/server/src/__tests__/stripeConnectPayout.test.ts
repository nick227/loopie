import { describe, it, expect } from 'vitest'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { seedClassAndDeal } from './helpers/affiliateSeed'
import { FinanceService } from '../services/FinanceService'
import { StripeWebhookService } from '../services/StripeWebhookService'
import { ensureChartOfAccounts } from '../lib/finance/accounts'
import { accountBalanceMinor } from '../lib/finance/ledger'
import type Stripe from 'stripe'

const app = buildTestApp()
const finance = new FinanceService()
const webhooks = new StripeWebhookService()

async function payableCommission(payeeRef: string, amountMinor = 4000) {
  const commission = await finance.createCommission(testBusinessId, {
    amountMinor,
    currency: 'USD',
    payeeRef,
    idempotencyKey: `comm:${payeeRef}:${amountMinor}:${Date.now()}`,
  })
  await finance.markCommissionPayable(testBusinessId, commission.id, `payable:${commission.id}`)
  return commission
}

async function readyAffiliate(name: string, email: string, accountId: string) {
  const { classId } = await seedClassAndDeal(app)
  const created = await app.inject({
    method: 'POST',
    url: '/affiliates',
    headers: asAuth(testUserId),
    payload: { name, classId, email },
  })
  expect(created.statusCode).toBe(201)
  const affiliateId = created.json().data.id as string
  await db.affiliate.update({
    where: { id: affiliateId },
    data: {
      stripeConnectAccountId: accountId,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
    },
  })
  return { affiliateId, payeeRef: `affiliate:${affiliateId}` }
}

function transferEvent(
  payoutId: string,
  overrides: {
    type?: string
    reversed?: boolean
    amount_reversed?: number
    id?: string
    idempotencyKey?: string
  } = {},
): Stripe.Event {
  return {
    id: `evt_${overrides.id ?? payoutId}`,
    object: 'event',
    type: overrides.type ?? 'transfer.created',
    data: {
      object: {
        id: overrides.id ?? `tr_${payoutId}`,
        object: 'transfer',
        amount: 4000,
        amount_reversed: overrides.amount_reversed ?? 0,
        reversed: overrides.reversed ?? false,
        currency: 'usd',
        destination: 'acct_ready',
        metadata: {
          loopiePayoutId: payoutId,
          businessId: testBusinessId,
          payoutIdempotencyKey: overrides.idempotencyKey ?? `payout:${payoutId}`,
        },
      },
    },
  } as unknown as Stripe.Event
}

describe('Connect payout money rail', () => {
  it('keeps manual payouts on PAID and posts cash immediately', async () => {
    const commission = await payableCommission('affiliate-manual')
    const payout = await finance.createPayout(testBusinessId, {
      commissionIds: [commission.id],
      payeeRef: 'affiliate-manual',
      idempotencyKey: 'payout-manual-1',
    })
    expect(payout.status).toBe('PAID')
    expect(payout.ledgerTransactionId).toBeTruthy()
    const chart = await ensureChartOfAccounts(db, testBusinessId, 'USD')
    expect(await accountBalanceMinor(db, testBusinessId, chart.AFFILIATE_PAYABLE.id)).toBe(0)
  })

  it('PENDING → TRANSFERRED → PAID posts ledger only at transfer, then bank payout is status-only', async () => {
    const { payeeRef } = await readyAffiliate('Rail Rep', 'rail@test.local', 'acct_ready')
    const commission = await payableCommission(payeeRef, 4000)

    const denied = await app.inject({
      method: 'POST',
      url: '/finance/payouts',
      headers: asAuth(testUserId),
      payload: {
        commissionIds: [commission.id],
        payeeRef,
        idempotencyKey: 'payout-connect-denied',
      },
    })
    expect(denied.statusCode).toBe(503)
    expect(await db.payout.count({ where: { businessId: testBusinessId } })).toBe(0)

    const pending = await finance.createConnectPayout(testBusinessId, {
      commissionIds: [commission.id],
      payeeRef,
      idempotencyKey: 'payout-connect-1',
    })
    expect(pending.status).toBe('PENDING')
    expect(pending.ledgerTransactionId).toBeNull()
    expect((await db.commission.findUniqueOrThrow({ where: { id: commission.id } })).status).toBe(
      'PAYABLE',
    )
    const chart = await ensureChartOfAccounts(db, testBusinessId, 'USD')
    expect(await accountBalanceMinor(db, testBusinessId, chart.AFFILIATE_PAYABLE.id)).toBe(4000)

    const replayPending = await finance.createConnectPayout(testBusinessId, {
      commissionIds: [commission.id],
      payeeRef,
      idempotencyKey: 'payout-other-key',
    })
    expect(replayPending.id).toBe(pending.id)
    expect(await db.payout.count({ where: { businessId: testBusinessId } })).toBe(1)

    await webhooks.handleVerifiedEvent(
      transferEvent(pending.id, { id: 'tr_1', idempotencyKey: pending.idempotencyKey }),
    )
    const transferred = await db.payout.findUniqueOrThrow({ where: { id: pending.id } })
    expect(transferred.status).toBe('TRANSFERRED')
    expect(transferred.stripeTransferId).toBe('tr_1')
    expect(transferred.ledgerTransactionId).toBeTruthy()
    expect((await db.commission.findUniqueOrThrow({ where: { id: commission.id } })).status).toBe(
      'PAID',
    )
    expect(await accountBalanceMinor(db, testBusinessId, chart.AFFILIATE_PAYABLE.id)).toBe(0)

    await webhooks.handleVerifiedEvent(
      transferEvent(pending.id, { id: 'tr_1', idempotencyKey: pending.idempotencyKey }),
    )
    expect(
      await db.ledgerTransaction.count({ where: { businessId: testBusinessId, type: 'PAYOUT' } }),
    ).toBe(1)

    const stillInFlight = await finance.createConnectPayout(testBusinessId, {
      commissionIds: [commission.id],
      payeeRef,
      idempotencyKey: 'payout-after-transfer',
    })
    expect(stillInFlight.id).toBe(pending.id)
    expect(stillInFlight.status).toBe('TRANSFERRED')

    await webhooks.handleVerifiedEvent({
      id: 'evt_po_platform',
      object: 'event',
      type: 'payout.paid',
      data: {
        object: {
          id: 'po_platform',
          object: 'payout',
          status: 'paid',
          amount: 4000,
          currency: 'usd',
        },
      },
    } as unknown as Stripe.Event)
    expect((await db.payout.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe(
      'TRANSFERRED',
    )

    await webhooks.handleVerifiedEvent({
      id: 'evt_po_1',
      object: 'event',
      type: 'payout.paid',
      account: 'acct_ready',
      data: {
        object: { id: 'po_1', object: 'payout', status: 'paid', amount: 4000, currency: 'usd' },
      },
    } as unknown as Stripe.Event)
    const paid = await db.payout.findUniqueOrThrow({ where: { id: pending.id } })
    expect(paid.status).toBe('PAID')
    expect(paid.stripePayoutId).toBe('po_1')
    expect(
      await db.ledgerTransaction.count({ where: { businessId: testBusinessId, type: 'PAYOUT' } }),
    ).toBe(1)
    expect(await accountBalanceMinor(db, testBusinessId, chart.AFFILIATE_PAYABLE.id)).toBe(0)
  })

  it('fails a PENDING payout without posting ledger, and reverses a confirmed transfer with a new row', async () => {
    const { payeeRef } = await readyAffiliate('Fail Rep', 'fail@test.local', 'acct_fail')
    const pendingCommission = await payableCommission(payeeRef, 2000)
    const pending = await finance.createConnectPayout(testBusinessId, {
      commissionIds: [pendingCommission.id],
      payeeRef,
      idempotencyKey: 'payout-fail-pending',
    })
    await webhooks.handleVerifiedEvent({
      id: 'evt_po_fail',
      object: 'event',
      type: 'payout.failed',
      account: 'acct_fail',
      data: {
        object: {
          id: 'po_fail',
          object: 'payout',
          status: 'failed',
          amount: 2000,
          currency: 'usd',
        },
      },
    } as unknown as Stripe.Event)
    expect((await db.payout.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe('FAILED')
    expect(
      (await db.commission.findUniqueOrThrow({ where: { id: pendingCommission.id } })).status,
    ).toBe('PAYABLE')
    expect(
      await db.ledgerTransaction.count({ where: { businessId: testBusinessId, type: 'PAYOUT' } }),
    ).toBe(0)

    const { payeeRef: reverseRef } = await readyAffiliate(
      'Reverse Rep',
      'reverse@test.local',
      'acct_rev',
    )
    const commission = await payableCommission(reverseRef, 1500)
    const toReverse = await finance.createConnectPayout(testBusinessId, {
      commissionIds: [commission.id],
      payeeRef: reverseRef,
      idempotencyKey: 'payout-reverse-1',
    })
    await webhooks.handleVerifiedEvent(
      transferEvent(toReverse.id, { id: 'tr_rev', idempotencyKey: toReverse.idempotencyKey }),
    )
    const original = await db.payout.findUniqueOrThrow({ where: { id: toReverse.id } })
    const originalTx = original.ledgerTransactionId!

    await webhooks.handleVerifiedEvent(
      transferEvent(toReverse.id, {
        type: 'transfer.reversed',
        reversed: true,
        amount_reversed: 1500,
        id: 'tr_rev',
        idempotencyKey: toReverse.idempotencyKey,
      }),
    )
    const reversed = await db.payout.findUniqueOrThrow({ where: { id: toReverse.id } })
    expect(reversed.status).toBe('REVERSED')
    const originalRow = await db.ledgerTransaction.findUniqueOrThrow({ where: { id: originalTx } })
    expect(originalRow.type).toBe('PAYOUT')
    const compensating = await db.ledgerTransaction.findFirst({
      where: { businessId: testBusinessId, type: 'REVERSAL', reversesTransactionId: originalTx },
    })
    expect(compensating).toBeTruthy()
    expect((await db.commission.findUniqueOrThrow({ where: { id: commission.id } })).status).toBe(
      'PAYABLE',
    )
  })
})
