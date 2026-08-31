// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('platforms API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // getPlatformConnection

    // getPlatformConnection - auth check
    try {
      if (!'/platforms/{platform}'.includes('{') || createdIds['platforms']) {
        const resgetPlatformConnectionAuth = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetPlatformConnectionAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getPlatformConnection auth failed: ' + e.message))
    }

    try {
      if (!'/platforms/{platform}'.includes('{') || createdIds['platforms']) {
        const resgetPlatformConnection = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetPlatformConnection.statusCode !== 200) {
          console.error(
            'getPlatformConnection failed with ' + resgetPlatformConnection.statusCode,
            resgetPlatformConnection.json().message || resgetPlatformConnection.json(),
          )
        }
        expect(resgetPlatformConnection.statusCode).toBe(200)
        await validateResponse('getPlatformConnection', 200, resgetPlatformConnection.json())
      }
    } catch (e: any) {
      errors.push(new Error('getPlatformConnection failed: ' + e.message))
    }

    // startPlatformOAuth

    // startPlatformOAuth - auth check
    try {
      if (!'/platforms/{platform}/oauth/start'.includes('{') || createdIds['platforms']) {
        const resstartPlatformOAuthAuth = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}/oauth/start`,
        })
        expect(resstartPlatformOAuthAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('startPlatformOAuth auth failed: ' + e.message))
    }

    try {
      if (!'/platforms/{platform}/oauth/start'.includes('{') || createdIds['platforms']) {
        const resstartPlatformOAuth = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}/oauth/start`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resstartPlatformOAuth.statusCode !== 200) {
          console.error(
            'startPlatformOAuth failed with ' + resstartPlatformOAuth.statusCode,
            resstartPlatformOAuth.json().message || resstartPlatformOAuth.json(),
          )
        }
        expect(resstartPlatformOAuth.statusCode).toBe(200)
        await validateResponse('startPlatformOAuth', 200, resstartPlatformOAuth.json())
      }
    } catch (e: any) {
      errors.push(new Error('startPlatformOAuth failed: ' + e.message))
    }

    // handlePlatformOAuthCallback

    try {
      if (!'/platforms/{platform}/oauth/callback'.includes('{') || createdIds['platforms']) {
        const reshandlePlatformOAuthCallback = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}/oauth/callback`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reshandlePlatformOAuthCallback.statusCode !== 200) {
          console.error(
            'handlePlatformOAuthCallback failed with ' + reshandlePlatformOAuthCallback.statusCode,
            reshandlePlatformOAuthCallback.json().message || reshandlePlatformOAuthCallback.json(),
          )
        }
        expect(reshandlePlatformOAuthCallback.statusCode).toBe(200)
        await validateResponse(
          'handlePlatformOAuthCallback',
          200,
          reshandlePlatformOAuthCallback.json(),
        )
      }
    } catch (e: any) {
      errors.push(new Error('handlePlatformOAuthCallback failed: ' + e.message))
    }

    // listPlatformAccounts

    // listPlatformAccounts - auth check
    try {
      if (!'/platforms/{platform}/accounts'.includes('{') || createdIds['platforms']) {
        const reslistPlatformAccountsAuth = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}/accounts`,
        })
        expect(reslistPlatformAccountsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listPlatformAccounts auth failed: ' + e.message))
    }

    try {
      if (!'/platforms/{platform}/accounts'.includes('{') || createdIds['platforms']) {
        const reslistPlatformAccounts = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}/accounts`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistPlatformAccounts.statusCode !== 200) {
          console.error(
            'listPlatformAccounts failed with ' + reslistPlatformAccounts.statusCode,
            reslistPlatformAccounts.json().message || reslistPlatformAccounts.json(),
          )
        }
        expect(reslistPlatformAccounts.statusCode).toBe(200)
        await validateResponse('listPlatformAccounts', 200, reslistPlatformAccounts.json())
      }
    } catch (e: any) {
      errors.push(new Error('listPlatformAccounts failed: ' + e.message))
    }

    // listPlatformPages

    // listPlatformPages - auth check
    try {
      if (!'/platforms/{platform}/pages'.includes('{') || createdIds['platforms']) {
        const reslistPlatformPagesAuth = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}/pages`,
        })
        expect(reslistPlatformPagesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listPlatformPages auth failed: ' + e.message))
    }

    try {
      if (!'/platforms/{platform}/pages'.includes('{') || createdIds['platforms']) {
        const reslistPlatformPages = await app.inject({
          method: 'GET',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}/pages`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistPlatformPages.statusCode !== 200) {
          console.error(
            'listPlatformPages failed with ' + reslistPlatformPages.statusCode,
            reslistPlatformPages.json().message || reslistPlatformPages.json(),
          )
        }
        expect(reslistPlatformPages.statusCode).toBe(200)
        await validateResponse('listPlatformPages', 200, reslistPlatformPages.json())
      }
    } catch (e: any) {
      errors.push(new Error('listPlatformPages failed: ' + e.message))
    }

    // updatePlatformConnection

    // updatePlatformConnection - auth check
    try {
      if (!'/platforms/{platform}'.includes('{') || createdIds['platforms']) {
        const resupdatePlatformConnectionAuth = await app.inject({
          method: 'PATCH',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdatePlatformConnectionAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updatePlatformConnection auth failed: ' + e.message))
    }

    try {
      if (!'/platforms/{platform}'.includes('{') || createdIds['platforms']) {
        const resupdatePlatformConnection = await app.inject({
          method: 'PATCH',
          url: `/platforms/${createdIds['platforms'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdatePlatformConnection.statusCode !== 200) {
          console.error(
            'updatePlatformConnection failed with ' + resupdatePlatformConnection.statusCode,
            resupdatePlatformConnection.json().message || resupdatePlatformConnection.json(),
          )
        }
        expect(resupdatePlatformConnection.statusCode).toBe(200)
        await validateResponse('updatePlatformConnection', 200, resupdatePlatformConnection.json())
      }
    } catch (e: any) {
      errors.push(new Error('updatePlatformConnection failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
