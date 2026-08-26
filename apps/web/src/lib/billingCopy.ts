import { ApiError } from '@project/sdk'

export type BillingSnapshot = {
  subscriptionStatus: string | null
  configured: boolean
  planName: string
  planPriceLabel?: string | null
}

export function toBillingSnapshot(
  data: { subscriptionStatus: string | null } | undefined,
): BillingSnapshot | undefined {
  if (!data) return undefined
  const row = data as BillingSnapshot
  return {
    subscriptionStatus: row.subscriptionStatus,
    configured: row.configured === true,
    planName: row.planName ?? 'LOOPIE',
    planPriceLabel: row.planPriceLabel,
  }
}

export function subscriptionStatusLabel(status: string | null | undefined) {
  if (status === 'active') return 'Active'
  if (status === 'trialing') return 'Trial'
  if (status === 'past_due') return 'Payment past due'
  if (status === 'unpaid') return 'Unpaid'
  if (status === 'canceled' || status === 'cancelled') return 'Canceled'
  if (status === 'incomplete') return 'Incomplete'
  if (status === 'incomplete_expired') return 'Expired'
  if (status === 'paused') return 'Paused'
  return 'Not subscribed'
}

export function checkoutReturnMessage(checkout: string | null) {
  if (checkout === 'success') return 'Payment submitted. Status updates when Stripe confirms.'
  if (checkout === 'cancel') return 'Checkout canceled. Nothing was charged.'
  return null
}

export function billingActionError(err: unknown) {
  if (err instanceof ApiError && err.status === 503) return "Billing isn't connected yet."
  if (err instanceof Error) return err.message
  return 'Request failed'
}
