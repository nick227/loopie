import { db } from '@project/db'
import { appBaseUrl, getStripe, stripeConfigured } from '../lib/stripe'

type BillingUser = { businessId: string; email: string }

export class StripeBillingService {
  async get(businessId: string) {
    const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })
    return {
      subscriptionStatus: business.subscriptionStatus,
      stripeCustomerId: business.stripeCustomerId,
    }
  }

  async createCheckout(user: BillingUser) {
    if (!stripeConfigured()) throw { statusCode: 503, message: 'Stripe is not configured' }
    const priceId = process.env.STRIPE_PRICE_ID!
    const stripe = getStripe()
    const customerId = await this._ensureCustomer(stripe, user)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.businessId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appBaseUrl()}/billing?checkout=success`,
      cancel_url: `${appBaseUrl()}/billing?checkout=cancel`,
      subscription_data: { metadata: { businessId: user.businessId } },
      metadata: { businessId: user.businessId },
    })
    if (!session.url) throw { statusCode: 500, message: 'Stripe did not return a checkout URL' }
    return { url: session.url }
  }

  async createPortal(user: BillingUser) {
    if (!stripeConfigured()) throw { statusCode: 503, message: 'Stripe is not configured' }
    const business = await db.business.findUniqueOrThrow({ where: { id: user.businessId } })
    if (!business.stripeCustomerId) throw { statusCode: 409, message: 'No Stripe customer for this business' }
    const session = await getStripe().billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: `${appBaseUrl()}/billing`,
    })
    return { url: session.url }
  }

  private async _ensureCustomer(stripe: ReturnType<typeof getStripe>, user: BillingUser) {
    const business = await db.business.findUniqueOrThrow({ where: { id: user.businessId } })
    if (business.stripeCustomerId) return business.stripeCustomerId
    const customer = await stripe.customers.create({
      email: user.email,
      name: business.name,
      metadata: { businessId: business.id },
    })
    await db.business.update({
      where: { id: business.id },
      data: { stripeCustomerId: customer.id },
    })
    return customer.id
  }
}
