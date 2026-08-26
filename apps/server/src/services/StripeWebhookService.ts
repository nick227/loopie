import type Stripe from 'stripe'
import { db } from '@project/db'
import { FinanceService } from './FinanceService'

const finance = new FinanceService()

function asId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') return value.id
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
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId, subscriptionStatus: 'active' } : {}),
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
    if (!payment) return
    await finance.refundServicePayment(payment.businessId, {
      paymentId: payment.id,
      idempotencyKey: event.id,
      reason: 'stripe.charge.refunded',
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
