import { describe, it, expect } from 'vitest'
import { checkoutReturnMessage, subscriptionStatusLabel } from './billingCopy'

describe('billingCopy', () => {
  it('translates Stripe subscription states', () => {
    expect(subscriptionStatusLabel(null)).toBe('Not subscribed')
    expect(subscriptionStatusLabel('active')).toBe('Active')
    expect(subscriptionStatusLabel('past_due')).toBe('Payment past due')
    expect(subscriptionStatusLabel('canceled')).toBe('Canceled')
  })

  it('explains checkout return', () => {
    expect(checkoutReturnMessage('success')).toContain('Payment submitted')
    expect(checkoutReturnMessage('cancel')).toContain('Nothing was charged')
    expect(checkoutReturnMessage(null)).toBeNull()
  })
})
