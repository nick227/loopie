import type Stripe from 'stripe'
import { db } from '@project/db'
import { FinanceService } from './FinanceService'
import { StripeConnectService } from './StripeConnectService'
import { CommissionEngine } from './CommissionEngine'

const finance = new FinanceService()
const connect = new StripeConnectService()
const commissionEngine = new CommissionEngine()

function asId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string')
    return value.id
  return null
}

function metadataBusinessId(meta: Stripe.Metadata | null | undefined) {
  const id = meta?.businessId
  return id && id.length > 0 ? id : null
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  return asId(invoice.parent?.subscription_details?.subscription)
}

function invoicePaymentRefs(invoice: Stripe.Invoice) {
  const payment = invoice.payments?.data?.[0]?.payment
  return {
    paymentIntentId: asId(payment?.payment_intent),
    chargeId: asId(payment?.charge),
  }
}

export class StripeWebhookService {
  async handleVerifiedEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this._onCheckoutCompleted(event.data.object)
        return
      case 'invoice.paid':
        await this._onInvoicePaid(event)
        return
      case 'invoice.payment_failed':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this._onSubscription(event)
        return
      case 'charge.refunded':
        await this._onChargeRefunded(event)
        return
      case 'charge.dispute.created':
        await this._onDisputeCreated(event)
        return
      case 'charge.dispute.closed':
        await this._onDisputeClosed(event)
        return
      case 'account.updated':
        // Capability/status only. Never commissions, payouts, or ledger rows.
        await connect.applyAccount(event.data.object as Stripe.Account)
        return
      case 'transfer.created':
      case 'transfer.updated':
      case 'transfer.reversed':
        await this._onTransfer(event)
        return
      case 'payout.paid':
      case 'payout.failed':
        await this._onConnectedPayout(event)
        return
      default:
        return
    }
  }

  private async _onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const businessId = session.client_reference_id ?? metadataBusinessId(session.metadata)
    if (!businessId) return
    const customerId = asId(session.customer)
    const subscriptionId = asId(session.subscription)
    await db.business.update({
      where: { id: businessId },
      data: {
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(subscriptionId
          ? { stripeSubscriptionId: subscriptionId, subscriptionStatus: 'active' }
          : {}),
      },
    })
  }

  private async _onInvoicePaid(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice
    if (!invoice.amount_paid || invoice.amount_paid <= 0) return
    const business = await this._businessForInvoice(invoice)
    if (!business) return
    const subscriptionId = invoiceSubscriptionId(invoice)
    const refs = invoicePaymentRefs(invoice)
    await db.business.update({
      where: { id: business.id },
      data: {
        subscriptionStatus: 'active',
        ...(asId(invoice.customer) ? { stripeCustomerId: asId(invoice.customer)! } : {}),
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      },
    })
    // Subscription cash only. Never recordClientFunding — that is the dormant custodial wallet.
    await finance.recordServicePayment(business.id, {
      amountMinor: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      idempotencyKey: event.id,
      externalRef: invoice.id,
      stripePaymentIntentId: refs.paymentIntentId,
      stripeChargeId: refs.chargeId,
      metadata: { stripeEventId: event.id, stripeInvoiceId: invoice.id },
    })
    // Generates (or replays, if this event was already processed) the platform-affiliate
    // commission owed on this membership payment, per the attribution snapshot for `business`.
    // A no-op beyond recording the payment when there's no attribution at all.
    await commissionEngine.processMembershipPayment(business.id, invoice.amount_paid, {
      stripeInvoiceId: invoice.id,
      stripeChargeId: refs.chargeId ?? undefined,
    })
  }

  private async _onSubscription(event: Stripe.Event) {
    const object = event.data.object as Stripe.Subscription | Stripe.Invoice
    const customerId = asId('customer' in object ? object.customer : null)
    const business = customerId
      ? await db.business.findFirst({ where: { stripeCustomerId: customerId } })
      : await this._businessForInvoice(object as Stripe.Invoice)
    if (!business) return
    const status =
      event.type === 'invoice.payment_failed'
        ? 'past_due'
        : 'status' in object
          ? object.status
          : business.subscriptionStatus
    await db.business.update({
      where: { id: business.id },
      data: { subscriptionStatus: status ?? business.subscriptionStatus },
    })
  }

  private async _onChargeRefunded(event: Stripe.Event) {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = asId(charge.payment_intent)
    const payment = await db.payment.findFirst({
      where: {
        processor: 'STRIPE',
        OR: [
          { stripeChargeId: charge.id },
          ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : []),
        ],
      },
    })
    const membershipPayment = await db.membershipPayment.findFirst({
      where: { stripeChargeId: charge.id },
    })
    if (!payment && !membershipPayment) {
      // Out-of-order delivery: the invoice.paid event that would have created these rows may
      // simply not have landed yet. A thrown error 500s the route (see index.ts), which Stripe
      // reads as "retry me" and redelivers with backoff — the standard way to handle a delivery-
      // order race without inventing new infrastructure. A charge that will genuinely never have
      // a payment on file (not ours, or pre-dates this system) just keeps retrying until Stripe's
      // own retry window (up to 3 days) gives up, which is an acceptable bound.
      throw { statusCode: 409, message: 'No payment on file yet for this refunded charge; retry' }
    }
    if (payment) {
      // charge.amount_refunded is Stripe's cumulative total refunded on this charge so far, but
      // refundServicePayment records the amount THIS event covers — the delta against whatever
      // has already been recorded for this payment, so a second (or third) partial refund on the
      // same charge doesn't try to refund the same money twice.
      const alreadyRefunded =
        (
          await db.refund.aggregate({
            where: { paymentId: payment.id },
            _sum: { amountMinor: true },
          })
        )._sum.amountMinor ?? 0
      const deltaMinor = (charge.amount_refunded ?? 0) - alreadyRefunded
      if (deltaMinor > 0) {
        await finance.refundServicePayment(payment.businessId, {
          paymentId: payment.id,
          idempotencyKey: event.id,
          reason: 'stripe.charge.refunded',
          amountMinor: deltaMinor,
        })
      }
    }
    if (membershipPayment) {
      // charge.amount_refunded is Stripe's own cumulative total refunded on this charge so far —
      // not a delta — which is exactly what reverseMembershipPayment expects, so a second partial
      // refund (or a partial followed by a full one) is handled correctly without extra state.
      await commissionEngine.reverseMembershipPayment(membershipPayment.id, {
        refundedAmountMinor: charge.amount_refunded,
        reason: 'stripe.charge.refunded',
        eventId: event.id,
      })
    }
  }

  private async _onDisputeCreated(event: Stripe.Event) {
    const dispute = event.data.object as Stripe.Dispute
    const chargeId = asId(dispute.charge)
    if (!chargeId) return
    const membershipPayment = await db.membershipPayment.findFirst({
      where: { stripeChargeId: chargeId },
    })
    if (!membershipPayment) {
      throw {
        statusCode: 409,
        message: 'No membership payment on file yet for this dispute; retry',
      }
    }
    // Funds are withdrawn immediately when a dispute opens — treat as a full reversal (no
    // refundedAmountMinor => ratio 1), distinct reason from a plain refund for reconciliation.
    await commissionEngine.reverseMembershipPayment(membershipPayment.id, {
      reason: 'stripe.dispute.created',
      eventId: event.id,
    })
  }

  private async _onDisputeClosed(event: Stripe.Event) {
    const dispute = event.data.object as Stripe.Dispute
    if (dispute.status !== 'won') return // lost / warning-closed: the earlier full reversal stands
    const chargeId = asId(dispute.charge)
    if (!chargeId) return
    const membershipPayment = await db.membershipPayment.findFirst({
      where: { stripeChargeId: chargeId },
    })
    if (!membershipPayment) {
      throw {
        statusCode: 409,
        message: 'No membership payment on file yet for this dispute; retry',
      }
    }
    // A won dispute means LOOPIE keeps the funds after all — restore the earlier reversal, but
    // only back to whatever this charge's own refund history says is still legitimately
    // outstanding (not to zero), so a genuine, independent partial refund on the same charge isn't
    // accidentally undone too. Our own Refund rows are the authoritative record of that (created
    // only from real charge.refunded events, see _onChargeRefunded) — no live Stripe call needed.
    const payment = await db.payment.findFirst({
      where: { processor: 'STRIPE', stripeChargeId: chargeId },
    })
    const refunded = payment
      ? ((
          await db.refund.aggregate({
            where: { paymentId: payment.id },
            _sum: { amountMinor: true },
          })
        )._sum.amountMinor ?? 0)
      : 0
    await commissionEngine.reverseMembershipPayment(membershipPayment.id, {
      refundedAmountMinor: refunded,
      reason: 'stripe.dispute.closed.won',
      eventId: event.id,
      allowDecrease: true, // the one call site allowed to release money back — see the opt's own doc
    })
  }

  private async _onTransfer(event: Stripe.Event) {
    const transfer = event.data.object as Stripe.Transfer
    const businessId = metadataBusinessId(transfer.metadata)
    const payoutId = transfer.metadata?.loopiePayoutId
    const reversed =
      event.type === 'transfer.reversed' || transfer.reversed || (transfer.amount_reversed ?? 0) > 0
    const reverseKey = `payout:reverse:${transfer.metadata?.payoutIdempotencyKey || payoutId || transfer.id}`
    if (reversed) {
      if (payoutId && businessId) {
        await finance.failConnectPayout(businessId, {
          payoutId,
          outcome: 'REVERSED',
          idempotencyKey: reverseKey,
        })
      } else if (businessId) {
        await finance.failConnectPayout(businessId, {
          stripeTransferId: transfer.id,
          outcome: 'REVERSED',
          idempotencyKey: reverseKey,
        })
      }
      return
    }
    if (!businessId || !payoutId) return
    await finance.recordPayoutTransferred(businessId, {
      payoutId,
      stripeTransferId: transfer.id,
      idempotencyKey: `payout:transferred:${transfer.metadata?.payoutIdempotencyKey || payoutId}`,
    })
  }

  private async _onConnectedPayout(event: Stripe.Event) {
    const accountId = 'account' in event && typeof event.account === 'string' ? event.account : null
    if (!accountId) return
    const payoutObj = event.data.object as Stripe.Payout
    const affiliate = await db.affiliate.findFirst({ where: { stripeConnectAccountId: accountId } })
    if (!affiliate) return
    const payeeRef = `affiliate:${affiliate.id}`
    if (event.type === 'payout.failed') {
      await finance.failConnectPayout(affiliate.businessId, {
        payeeRef,
        outcome: 'FAILED',
        idempotencyKey: `payout:failed:${payeeRef}:${payoutObj.id}`,
      })
      return
    }
    await finance.recordPayoutPaid(affiliate.businessId, {
      payeeRef,
      stripePayoutId: payoutObj.id,
    })
  }

  private async _businessForInvoice(invoice: Stripe.Invoice) {
    const fromMeta =
      metadataBusinessId(invoice.metadata) ??
      metadataBusinessId(invoice.parent?.subscription_details?.metadata)
    if (fromMeta) return db.business.findUnique({ where: { id: fromMeta } })
    const customerId = asId(invoice.customer)
    if (!customerId) return null
    return db.business.findFirst({ where: { stripeCustomerId: customerId } })
  }
}
