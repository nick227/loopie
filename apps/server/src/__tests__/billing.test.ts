// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('billing API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // getBilling
    
    // getBilling - auth check
    try {
      if (!'/billing'.includes('{') || createdIds['billing']) {
        const resgetBillingAuth = await app.inject({ method: 'GET', url: `/billing` })
        expect(resgetBillingAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getBilling auth failed: ' + e.message))
    }

    try {
      if (!'/billing'.includes('{') || createdIds['billing']) {
        const resgetBilling = await app.inject({
          method: 'GET',
          url: `/billing`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetBilling.statusCode !== 200) {
          console.error('getBilling failed with ' + resgetBilling.statusCode, resgetBilling.json().message || resgetBilling.json())
        }
        expect(resgetBilling.statusCode).toBe(200)
        await validateResponse('getBilling', 200, resgetBilling.json())
      }
    } catch (e: any) {
      errors.push(new Error('getBilling failed: ' + e.message))
    }

    // createBillingCheckout
    
    // createBillingCheckout - auth check
    try {
      if (!'/billing/checkout'.includes('{') || createdIds['billing']) {
        const rescreateBillingCheckoutAuth = await app.inject({ method: 'POST', url: `/billing/checkout` })
        expect(rescreateBillingCheckoutAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createBillingCheckout auth failed: ' + e.message))
    }

    try {
      if (!'/billing/checkout'.includes('{') || createdIds['billing']) {
        const rescreateBillingCheckout = await app.inject({
          method: 'POST',
          url: `/billing/checkout`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (rescreateBillingCheckout.statusCode === 201 && rescreateBillingCheckout.json().data?.id) createdIds['billing'] = rescreateBillingCheckout.json().data.id
        if (rescreateBillingCheckout.statusCode !== 201) {
          console.error('createBillingCheckout failed with ' + rescreateBillingCheckout.statusCode, rescreateBillingCheckout.json().message || rescreateBillingCheckout.json())
        }
        expect(rescreateBillingCheckout.statusCode).toBe(201)
        await validateResponse('createBillingCheckout', 201, rescreateBillingCheckout.json())
      }
    } catch (e: any) {
      errors.push(new Error('createBillingCheckout failed: ' + e.message))
    }

    // createBillingPortal
    
    // createBillingPortal - auth check
    try {
      if (!'/billing/portal'.includes('{') || createdIds['billing']) {
        const rescreateBillingPortalAuth = await app.inject({ method: 'POST', url: `/billing/portal` })
        expect(rescreateBillingPortalAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createBillingPortal auth failed: ' + e.message))
    }

    try {
      if (!'/billing/portal'.includes('{') || createdIds['billing']) {
        const rescreateBillingPortal = await app.inject({
          method: 'POST',
          url: `/billing/portal`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (rescreateBillingPortal.statusCode === 201 && rescreateBillingPortal.json().data?.id) createdIds['billing'] = rescreateBillingPortal.json().data.id
        if (rescreateBillingPortal.statusCode !== 201) {
          console.error('createBillingPortal failed with ' + rescreateBillingPortal.statusCode, rescreateBillingPortal.json().message || rescreateBillingPortal.json())
        }
        expect(rescreateBillingPortal.statusCode).toBe(201)
        await validateResponse('createBillingPortal', 201, rescreateBillingPortal.json())
      }
    } catch (e: any) {
      errors.push(new Error('createBillingPortal failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
