// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('creatives API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []
    // Skipped createCreative because payload could not be generated

    // listCreatives

    // listCreatives - auth check
    try {
      if (!'/creatives'.includes('{') || createdIds['creatives']) {
        const reslistCreativesAuth = await app.inject({ method: 'GET', url: `/creatives` })
        expect(reslistCreativesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listCreatives auth failed: ' + e.message))
    }

    try {
      if (!'/creatives'.includes('{') || createdIds['creatives']) {
        const reslistCreatives = await app.inject({
          method: 'GET',
          url: `/creatives`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistCreatives.statusCode !== 200) {
          console.error(
            'listCreatives failed with ' + reslistCreatives.statusCode,
            reslistCreatives.json().message || reslistCreatives.json(),
          )
        }
        expect(reslistCreatives.statusCode).toBe(200)
        await validateResponse('listCreatives', 200, reslistCreatives.json())
      }
    } catch (e: any) {
      errors.push(new Error('listCreatives failed: ' + e.message))
    }

    // getCreative

    // getCreative - auth check
    try {
      if (!'/creatives/{creativeId}'.includes('{') || createdIds['creatives']) {
        const resgetCreativeAuth = await app.inject({
          method: 'GET',
          url: `/creatives/${createdIds['creatives'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetCreativeAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getCreative auth failed: ' + e.message))
    }

    try {
      if (!'/creatives/{creativeId}'.includes('{') || createdIds['creatives']) {
        const resgetCreative = await app.inject({
          method: 'GET',
          url: `/creatives/${createdIds['creatives'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetCreative.statusCode !== 200) {
          console.error(
            'getCreative failed with ' + resgetCreative.statusCode,
            resgetCreative.json().message || resgetCreative.json(),
          )
        }
        expect(resgetCreative.statusCode).toBe(200)
        await validateResponse('getCreative', 200, resgetCreative.json())
      }
    } catch (e: any) {
      errors.push(new Error('getCreative failed: ' + e.message))
    }
    // Skipped updateCreative because payload could not be generated

    // deleteCreative

    // deleteCreative - auth check
    try {
      if (!'/creatives/{creativeId}'.includes('{') || createdIds['creatives']) {
        const resdeleteCreativeAuth = await app.inject({
          method: 'DELETE',
          url: `/creatives/${createdIds['creatives'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resdeleteCreativeAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteCreative auth failed: ' + e.message))
    }

    try {
      if (!'/creatives/{creativeId}'.includes('{') || createdIds['creatives']) {
        const resdeleteCreative = await app.inject({
          method: 'DELETE',
          url: `/creatives/${createdIds['creatives'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteCreative.statusCode !== 200) {
          console.error(
            'deleteCreative failed with ' + resdeleteCreative.statusCode,
            resdeleteCreative.json().message || resdeleteCreative.json(),
          )
        }
        expect(resdeleteCreative.statusCode).toBe(200)
        await validateResponse('deleteCreative', 200, resdeleteCreative.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteCreative failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
