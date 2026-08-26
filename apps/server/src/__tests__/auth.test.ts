// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('auth API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // register
    
    try {
      if (!'/auth/register'.includes('{') || createdIds['auth']) {
        const resregister = await app.inject({
          method: 'POST',
          url: `/auth/register`,
          headers: asAuth(testUserId),
          payload: {
  "email": "test@example.com",
  "password": "test_string",
  "businessName": "test_string"
},
        })
        if (resregister.statusCode === 201 && resregister.json().data?.id) createdIds['auth'] = resregister.json().data.id
        if (resregister.statusCode !== 201) {
          console.error('register failed with ' + resregister.statusCode, resregister.json().message || resregister.json())
        }
        expect(resregister.statusCode).toBe(201)
        await validateResponse('register', 201, resregister.json())
      }
    } catch (e: any) {
      errors.push(new Error('register failed: ' + e.message))
    }

    // login
    
    try {
      if (!'/auth/login'.includes('{') || createdIds['auth']) {
        const reslogin = await app.inject({
          method: 'POST',
          url: `/auth/login`,
          headers: asAuth(testUserId),
          payload: {
        "email": "test@example.com",
        "password": "password123"
      },
        })
        if (reslogin.statusCode === 201 && reslogin.json().data?.id) createdIds['auth'] = reslogin.json().data.id
        if (reslogin.statusCode !== 200) {
          console.error('login failed with ' + reslogin.statusCode, reslogin.json().message || reslogin.json())
        }
        expect(reslogin.statusCode).toBe(200)
        await validateResponse('login', 200, reslogin.json())
      }
    } catch (e: any) {
      errors.push(new Error('login failed: ' + e.message))
    }

    // logout
    
    // logout - auth check
    try {
      if (!'/auth/logout'.includes('{') || createdIds['auth']) {
        const reslogoutAuth = await app.inject({ method: 'POST', url: `/auth/logout` })
        expect(reslogoutAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('logout auth failed: ' + e.message))
    }

    try {
      if (!'/auth/logout'.includes('{') || createdIds['auth']) {
        const reslogout = await app.inject({
          method: 'POST',
          url: `/auth/logout`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslogout.statusCode === 201 && reslogout.json().data?.id) createdIds['auth'] = reslogout.json().data.id
        if (reslogout.statusCode !== 200) {
          console.error('logout failed with ' + reslogout.statusCode, reslogout.json().message || reslogout.json())
        }
        expect(reslogout.statusCode).toBe(200)
        await validateResponse('logout', 200, reslogout.json())
      }
    } catch (e: any) {
      errors.push(new Error('logout failed: ' + e.message))
    }

    // getCurrentUser
    
    // getCurrentUser - auth check
    try {
      if (!'/auth/me'.includes('{') || createdIds['auth']) {
        const resgetCurrentUserAuth = await app.inject({ method: 'GET', url: `/auth/me` })
        expect(resgetCurrentUserAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getCurrentUser auth failed: ' + e.message))
    }

    try {
      if (!'/auth/me'.includes('{') || createdIds['auth']) {
        const resgetCurrentUser = await app.inject({
          method: 'GET',
          url: `/auth/me`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetCurrentUser.statusCode !== 200) {
          console.error('getCurrentUser failed with ' + resgetCurrentUser.statusCode, resgetCurrentUser.json().message || resgetCurrentUser.json())
        }
        expect(resgetCurrentUser.statusCode).toBe(200)
        await validateResponse('getCurrentUser', 200, resgetCurrentUser.json())
      }
    } catch (e: any) {
      errors.push(new Error('getCurrentUser failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
