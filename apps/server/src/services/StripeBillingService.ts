import type Stripe from 'stripe'
import { db } from '@project/db'
import {
  appBaseUrl,
  formatStripePriceLabel,
  getStripe,
  stripeBillingConfigured,
} from '../lib/stripe'

type BillingUser = { businessId: string; email: string }

const DEFAULT_PLAN = { planName: 'LOOPIE', planPriceLabel: null as string | null }

function productName(product: Stripe.Price['product']): string {
  if (!product || typeof product === 'string') return DEFAULT_PLAN.planName
  if ('deleted' in product && product.deleted) return DEFAULT_PLAN.planName
  return product.name || DEFAULT_PLAN.planName
}

async function planFromStripe() {
  if (!stripeBillingConfigured()) return DEFAULT_PLAN
  try {
    const price = await getStripe().prices.retrieve(process.env.STRIPE_PRICE_ID!, {
      expand: ['product'],
    })
    return {
      planName: productName(price.product),
      planPriceLabel: formatStripePriceLabel(price),
    }
  } catch {
    return DEFAULT_PLAN
  }
}

export class StripeBillingService {
  async get(businessId: string) {
    const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })
    const plan = await planFromStripe()
    return {
      subscriptionStatus: business.subscriptionStatus,
      stripeCustomerId: business.stripeCustomerId,
      configured: stripeBillingConfigured(),
      planName: plan.planName,
      planPriceLabel: plan.planPriceLabel,
    }
  }

  async createCheckout(user: BillingUser) {
    if (!stripeBillingConfigured()) throw { statusCode: 503, message: 'Stripe is not configured' }
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
    if (!stripeBillingConfigured()) throw { statusCode: 503, message: 'Stripe is not configured' }
    const business = await db.business.findUniqueOrThrow({ where: { id: user.businessId } })
    if (!business.stripeCustomerId)
      throw { statusCode: 409, message: 'No Stripe customer for this business' }
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
