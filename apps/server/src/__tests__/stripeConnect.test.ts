import { describe, it, expect } from 'vitest'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testShopUserId, testBusinessId } from './helpers'
import { seedClassAndDeal } from './helpers/affiliateSeed'
import { StripeWebhookService } from '../services/StripeWebhookService'
import { connectStatus } from '../lib/connectStatus'
import type Stripe from 'stripe'

const app = buildTestApp()
const webhooks = new StripeWebhookService()

function accountEvent(
  account: { id: string; payouts_enabled: boolean; details_submitted: boolean; affiliateId: string },
): Stripe.Event {
  return {
    id: `evt_${account.id}`,
    object: 'event',
    type: 'account.updated',
    data: {
      object: {
        id: account.id,
        object: 'account',
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        metadata: { affiliateId: account.affiliateId },
        requirements: { disabled_reason: null },
      },
    },
  } as unknown as Stripe.Event
}

describe('Stripe Connect onboarding status', () => {
  it('maps stored flags to Not connected / Onboarding / Ready / Restricted', () => {
    expect(connectStatus({ stripeConnectAccountId: null, stripePayoutsEnabled: false, stripeDetailsSubmitted: false })).toBe(
      'NOT_CONNECTED',
    )
    expect(connectStatus({ stripeConnectAccountId: 'acct_1', stripePayoutsEnabled: false, stripeDetailsSubmitted: false })).toBe(
      'ONBOARDING',
    )
    expect(connectStatus({ stripeConnectAccountId: 'acct_1', stripePayoutsEnabled: true, stripeDetailsSubmitted: true })).toBe(
      'READY',
    )
    expect(connectStatus({ stripeConnectAccountId: 'acct_1', stripePayoutsEnabled: false, stripeDetailsSubmitted: true })).toBe(
      'RESTRICTED',
    )
  })

  it('GET affiliate starts Not connected and account.updated writes capability only', async () => {
    const { classId } = await seedClassAndDeal(app)
    const created = await app.inject({
      method: 'POST',
      url: '/affiliates',
      headers: asAuth(testUserId),
      payload: { name: 'Rep', classId, email: 'rep@test.local' },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().data.connectStatus).toBe('NOT_CONNECTED')
    expect(created.json().data.payoutsEnabled).toBe(false)

    const affiliateId = created.json().data.id as string
    await webhooks.handleVerifiedEvent(
      accountEvent({ id: 'acct_onboard', payouts_enabled: false, details_submitted: false, affiliateId }),
    )
    const onboarding = await app.inject({
      method: 'GET',
      url: `/affiliates/${affiliateId}`,
      headers: asAuth(testUserId),
    })
    expect(onboarding.json().data.connectStatus).toBe('ONBOARDING')

    await webhooks.handleVerifiedEvent(
      accountEvent({ id: 'acct_onboard', payouts_enabled: true, details_submitted: true, affiliateId }),
    )
    const ready = await app.inject({
      method: 'GET',
      url: `/affiliates/${affiliateId}`,
      headers: asAuth(testUserId),
    })
    expect(ready.json().data.connectStatus).toBe('READY')
    expect(ready.json().data.payoutsEnabled).toBe(true)

    await webhooks.handleVerifiedEvent(
      accountEvent({ id: 'acct_onboard', payouts_enabled: false, details_submitted: true, affiliateId }),
    )
    const restricted = await app.inject({
      method: 'GET',
      url: `/affiliates/${affiliateId}`,
      headers: asAuth(testUserId),
    })
    expect(restricted.json().data.connectStatus).toBe('RESTRICTED')
    expect(restricted.json().data.payoutsEnabled).toBe(false)

    await webhooks.handleVerifiedEvent(
      accountEvent({
        id: 'acct_unknown',
        payouts_enabled: true,
        details_submitted: true,
        affiliateId: 'aff_does_not_exist',
      }),
    )

    expect(await db.commission.count({ where: { businessId: testBusinessId } })).toBe(0)
    expect(await db.payment.count({ where: { businessId: testBusinessId } })).toBe(0)
    expect(await db.payout.count({ where: { businessId: testBusinessId } })).toBe(0)
    expect(await db.ledgerTransaction.count({ where: { businessId: testBusinessId } })).toBe(0)
  })

  it('onboarding is admin or self, and 503 when Stripe is not configured', async () => {
    const previousKey = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    try {
      const { classId } = await seedClassAndDeal(app)
      const created = await app.inject({
        method: 'POST',
        url: '/affiliates',
        headers: asAuth(testUserId),
        payload: {
          name: 'Login Rep',
          classId,
          email: `login-${Date.now()}@test.local`,
          createLogin: true,
        },
      })
      expect(created.statusCode).toBe(201)
      const affiliateId = created.json().data.id as string
      const userId = created.json().data.userId as string

      const other = await app.inject({
        method: 'POST',
        url: '/affiliates',
        headers: asAuth(testUserId),
        payload: {
          name: 'Other Rep',
          classId,
          email: `other-${Date.now()}@test.local`,
          createLogin: true,
        },
      })
      expect(other.statusCode).toBe(201)

      const asUser = await app.inject({
        method: 'POST',
        url: `/affiliates/${affiliateId}/connect/onboarding`,
        headers: asAuth(testShopUserId),
      })
      expect(asUser.statusCode).toBe(403)

      const asOtherAffiliate = await app.inject({
        method: 'POST',
        url: `/affiliates/${affiliateId}/connect/onboarding`,
        headers: asAuth(other.json().data.userId),
      })
      expect(asOtherAffiliate.statusCode).toBe(403)

      const asSelf = await app.inject({
        method: 'POST',
        url: `/affiliates/${affiliateId}/connect/onboarding`,
        headers: asAuth(userId),
      })
      expect(asSelf.statusCode).toBe(503)

      const asAdmin = await app.inject({
        method: 'POST',
        url: `/affiliates/${affiliateId}/connect/onboarding`,
        headers: asAuth(testUserId),
      })
      expect(asAdmin.statusCode).toBe(503)
    } finally {
      if (previousKey) process.env.STRIPE_SECRET_KEY = previousKey
    }
  })
})
