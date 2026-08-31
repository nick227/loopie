// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('ad-units API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []
    // Skipped createAdUnit because payload could not be generated

    // listAdUnits

    // listAdUnits - auth check
    try {
      if (!'/ad-units'.includes('{') || createdIds['ad-units']) {
        const reslistAdUnitsAuth = await app.inject({ method: 'GET', url: `/ad-units` })
        expect(reslistAdUnitsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAdUnits auth failed: ' + e.message))
    }

    try {
      if (!'/ad-units'.includes('{') || createdIds['ad-units']) {
        const reslistAdUnits = await app.inject({
          method: 'GET',
          url: `/ad-units`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAdUnits.statusCode !== 200) {
          console.error(
            'listAdUnits failed with ' + reslistAdUnits.statusCode,
            reslistAdUnits.json().message || reslistAdUnits.json(),
          )
        }
        expect(reslistAdUnits.statusCode).toBe(200)
        await validateResponse('listAdUnits', 200, reslistAdUnits.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAdUnits failed: ' + e.message))
    }

    // getAdUnit

    // getAdUnit - auth check
    try {
      if (!'/ad-units/{adUnitId}'.includes('{') || createdIds['ad-units']) {
        const resgetAdUnitAuth = await app.inject({
          method: 'GET',
          url: `/ad-units/${createdIds['ad-units'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetAdUnitAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAdUnit auth failed: ' + e.message))
    }

    try {
      if (!'/ad-units/{adUnitId}'.includes('{') || createdIds['ad-units']) {
        const resgetAdUnit = await app.inject({
          method: 'GET',
          url: `/ad-units/${createdIds['ad-units'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAdUnit.statusCode !== 200) {
          console.error(
            'getAdUnit failed with ' + resgetAdUnit.statusCode,
            resgetAdUnit.json().message || resgetAdUnit.json(),
          )
        }
        expect(resgetAdUnit.statusCode).toBe(200)
        await validateResponse('getAdUnit', 200, resgetAdUnit.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAdUnit failed: ' + e.message))
    }

    // updateAdUnit

    // updateAdUnit - auth check
    try {
      if (!'/ad-units/{adUnitId}'.includes('{') || createdIds['ad-units']) {
        const resupdateAdUnitAuth = await app.inject({
          method: 'PATCH',
          url: `/ad-units/${createdIds['ad-units'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateAdUnitAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAdUnit auth failed: ' + e.message))
    }

    try {
      if (!'/ad-units/{adUnitId}'.includes('{') || createdIds['ad-units']) {
        const resupdateAdUnit = await app.inject({
          method: 'PATCH',
          url: `/ad-units/${createdIds['ad-units'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateAdUnit.statusCode !== 200) {
          console.error(
            'updateAdUnit failed with ' + resupdateAdUnit.statusCode,
            resupdateAdUnit.json().message || resupdateAdUnit.json(),
          )
        }
        expect(resupdateAdUnit.statusCode).toBe(200)
        await validateResponse('updateAdUnit', 200, resupdateAdUnit.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAdUnit failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
