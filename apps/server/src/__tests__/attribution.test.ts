// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('attribution API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []
    // Skipped submitLeadForm because payload could not be generated

    // trackDeploymentClick

    try {
      if (!'/r/{deploymentId}'.includes('{') || createdIds['r']) {
        const restrackDeploymentClick = await app.inject({
          method: 'GET',
          url: `/r/${createdIds['r'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (restrackDeploymentClick.statusCode !== 200) {
          console.error(
            'trackDeploymentClick failed with ' + restrackDeploymentClick.statusCode,
            restrackDeploymentClick.json().message || restrackDeploymentClick.json(),
          )
        }
        expect(restrackDeploymentClick.statusCode).toBe(200)
        await validateResponse('trackDeploymentClick', 200, restrackDeploymentClick.json())
      }
    } catch (e: any) {
      errors.push(new Error('trackDeploymentClick failed: ' + e.message))
    }

    // trackAdRunClick

    try {
      if (!'/r/adrun/{adRunId}'.includes('{') || createdIds['r-adrun']) {
        const restrackAdRunClick = await app.inject({
          method: 'GET',
          url: `/r/adrun/${createdIds['r-adrun'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (restrackAdRunClick.statusCode !== 200) {
          console.error(
            'trackAdRunClick failed with ' + restrackAdRunClick.statusCode,
            restrackAdRunClick.json().message || restrackAdRunClick.json(),
          )
        }
        expect(restrackAdRunClick.statusCode).toBe(200)
        await validateResponse('trackAdRunClick', 200, restrackAdRunClick.json())
      }
    } catch (e: any) {
      errors.push(new Error('trackAdRunClick failed: ' + e.message))
    }

    // trackAffiliateClick

    try {
      if (!'/r/affiliate/{affiliateId}'.includes('{') || createdIds['r-affiliate']) {
        const restrackAffiliateClick = await app.inject({
          method: 'GET',
          url: `/r/affiliate/${createdIds['r-affiliate'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (restrackAffiliateClick.statusCode !== 200) {
          console.error(
            'trackAffiliateClick failed with ' + restrackAffiliateClick.statusCode,
            restrackAffiliateClick.json().message || restrackAffiliateClick.json(),
          )
        }
        expect(restrackAffiliateClick.statusCode).toBe(200)
        await validateResponse('trackAffiliateClick', 200, restrackAffiliateClick.json())
      }
    } catch (e: any) {
      errors.push(new Error('trackAffiliateClick failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
