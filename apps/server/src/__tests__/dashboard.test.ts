// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('dashboard API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // getHomeSummary
    
    // getHomeSummary - auth check
    try {
      if (!'/home'.includes('{') || createdIds['home']) {
        const resgetHomeSummaryAuth = await app.inject({ method: 'GET', url: `/home` })
        expect(resgetHomeSummaryAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getHomeSummary auth failed: ' + e.message))
    }

    try {
      if (!'/home'.includes('{') || createdIds['home']) {
        const resgetHomeSummary = await app.inject({
          method: 'GET',
          url: `/home`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetHomeSummary.statusCode !== 200) {
          console.error('getHomeSummary failed with ' + resgetHomeSummary.statusCode, resgetHomeSummary.json().message || resgetHomeSummary.json())
        }
        expect(resgetHomeSummary.statusCode).toBe(200)
        await validateResponse('getHomeSummary', 200, resgetHomeSummary.json())
      }
    } catch (e: any) {
      errors.push(new Error('getHomeSummary failed: ' + e.message))
    }

    // getResultsSummary
    
    // getResultsSummary - auth check
    try {
      if (!'/results'.includes('{') || createdIds['results']) {
        const resgetResultsSummaryAuth = await app.inject({ method: 'GET', url: `/results` })
        expect(resgetResultsSummaryAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getResultsSummary auth failed: ' + e.message))
    }

    try {
      if (!'/results'.includes('{') || createdIds['results']) {
        const resgetResultsSummary = await app.inject({
          method: 'GET',
          url: `/results`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetResultsSummary.statusCode !== 200) {
          console.error('getResultsSummary failed with ' + resgetResultsSummary.statusCode, resgetResultsSummary.json().message || resgetResultsSummary.json())
        }
        expect(resgetResultsSummary.statusCode).toBe(200)
        await validateResponse('getResultsSummary', 200, resgetResultsSummary.json())
      }
    } catch (e: any) {
      errors.push(new Error('getResultsSummary failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
