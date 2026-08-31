// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, validateResponse, testBusinessId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('tracking API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []
    // Skipped trackLoopieEvent because payload could not be generated

    // getLoopieSession

    try {
      if (!'/t/session'.includes('{') || createdIds['t-session']) {
        // getLoopieSession is public (security: []) and requires businessId as a query param —
        // not something the generator can auto-fill for a GET request, hand-added here.
        const resgetLoopieSession = await app.inject({
          method: 'GET',
          url: `/t/session?businessId=${testBusinessId}`,
          // payload: {},
        })
        if (resgetLoopieSession.statusCode !== 200) {
          console.error(
            'getLoopieSession failed with ' + resgetLoopieSession.statusCode,
            resgetLoopieSession.json().message || resgetLoopieSession.json(),
          )
        }
        expect(resgetLoopieSession.statusCode).toBe(200)
        await validateResponse('getLoopieSession', 200, resgetLoopieSession.json())
      }
    } catch (e: any) {
      errors.push(new Error('getLoopieSession failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
