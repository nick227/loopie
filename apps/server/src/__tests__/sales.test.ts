// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('sales API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // listSales
    
    // listSales - auth check
    try {
      if (!'/sales'.includes('{') || createdIds['sales']) {
        const reslistSalesAuth = await app.inject({ method: 'GET', url: `/sales` })
        expect(reslistSalesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listSales auth failed: ' + e.message))
    }

    try {
      if (!'/sales'.includes('{') || createdIds['sales']) {
        const reslistSales = await app.inject({
          method: 'GET',
          url: `/sales`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistSales.statusCode !== 200) {
          console.error('listSales failed with ' + reslistSales.statusCode, reslistSales.json().message || reslistSales.json())
        }
        expect(reslistSales.statusCode).toBe(200)
        await validateResponse('listSales', 200, reslistSales.json())
      }
    } catch (e: any) {
      errors.push(new Error('listSales failed: ' + e.message))
    }
    // Skipped createSale because payload could not be generated

    // getSale
    
    // getSale - auth check
    try {
      if (!'/sales/{saleId}'.includes('{') || createdIds['sales']) {
        const resgetSaleAuth = await app.inject({ method: 'GET', url: `/sales/${createdIds['sales'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetSaleAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getSale auth failed: ' + e.message))
    }

    try {
      if (!'/sales/{saleId}'.includes('{') || createdIds['sales']) {
        const resgetSale = await app.inject({
          method: 'GET',
          url: `/sales/${createdIds['sales'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetSale.statusCode !== 200) {
          console.error('getSale failed with ' + resgetSale.statusCode, resgetSale.json().message || resgetSale.json())
        }
        expect(resgetSale.statusCode).toBe(200)
        await validateResponse('getSale', 200, resgetSale.json())
      }
    } catch (e: any) {
      errors.push(new Error('getSale failed: ' + e.message))
    }

    // reverseSale
    
    // reverseSale - auth check
    try {
      if (!'/sales/{saleId}/reverse'.includes('{') || createdIds['sales']) {
        const resreverseSaleAuth = await app.inject({ method: 'POST', url: `/sales/${createdIds['sales'] || '00000000-0000-0000-0000-000000000001'}/reverse` })
        expect(resreverseSaleAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('reverseSale auth failed: ' + e.message))
    }

    try {
      if (!'/sales/{saleId}/reverse'.includes('{') || createdIds['sales']) {
        const resreverseSale = await app.inject({
          method: 'POST',
          url: `/sales/${createdIds['sales'] || '00000000-0000-0000-0000-000000000001'}/reverse`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resreverseSale.statusCode === 201 && resreverseSale.json().data?.id) createdIds['sales'] = resreverseSale.json().data.id
        if (resreverseSale.statusCode !== 200) {
          console.error('reverseSale failed with ' + resreverseSale.statusCode, resreverseSale.json().message || resreverseSale.json())
        }
        expect(resreverseSale.statusCode).toBe(200)
        await validateResponse('reverseSale', 200, resreverseSale.json())
      }
    } catch (e: any) {
      errors.push(new Error('reverseSale failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
