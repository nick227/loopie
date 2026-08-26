import Stripe from 'stripe'

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function stripeBillingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw { statusCode: 503, message: 'Stripe is not configured' }
  return new Stripe(key)
}

export function appBaseUrl() {
  return process.env.PUBLIC_APP_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173'
}
