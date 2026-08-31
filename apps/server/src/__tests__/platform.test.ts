// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('platform API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // getPlatformCapabilities

    // getPlatformCapabilities - auth check
    try {
      if (!'/platform-capabilities'.includes('{') || createdIds['platform-capabilities']) {
        const resgetPlatformCapabilitiesAuth = await app.inject({
          method: 'GET',
          url: `/platform-capabilities`,
        })
        expect(resgetPlatformCapabilitiesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getPlatformCapabilities auth failed: ' + e.message))
    }

    try {
      if (!'/platform-capabilities'.includes('{') || createdIds['platform-capabilities']) {
        const resgetPlatformCapabilities = await app.inject({
          method: 'GET',
          url: `/platform-capabilities`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetPlatformCapabilities.statusCode !== 200) {
          console.error(
            'getPlatformCapabilities failed with ' + resgetPlatformCapabilities.statusCode,
            resgetPlatformCapabilities.json().message || resgetPlatformCapabilities.json(),
          )
        }
        expect(resgetPlatformCapabilities.statusCode).toBe(200)
        await validateResponse('getPlatformCapabilities', 200, resgetPlatformCapabilities.json())
      }
    } catch (e: any) {
      errors.push(new Error('getPlatformCapabilities failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
