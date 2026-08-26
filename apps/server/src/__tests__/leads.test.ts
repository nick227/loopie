// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('leads API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // listLeads
    
    // listLeads - auth check
    try {
      if (!'/leads'.includes('{') || createdIds['leads']) {
        const reslistLeadsAuth = await app.inject({ method: 'GET', url: `/leads` })
        expect(reslistLeadsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listLeads auth failed: ' + e.message))
    }

    try {
      if (!'/leads'.includes('{') || createdIds['leads']) {
        const reslistLeads = await app.inject({
          method: 'GET',
          url: `/leads`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistLeads.statusCode !== 200) {
          console.error('listLeads failed with ' + reslistLeads.statusCode, reslistLeads.json().message || reslistLeads.json())
        }
        expect(reslistLeads.statusCode).toBe(200)
        await validateResponse('listLeads', 200, reslistLeads.json())
      }
    } catch (e: any) {
      errors.push(new Error('listLeads failed: ' + e.message))
    }

    // getLead
    
    // getLead - auth check
    try {
      if (!'/leads/{leadId}'.includes('{') || createdIds['leads']) {
        const resgetLeadAuth = await app.inject({ method: 'GET', url: `/leads/${createdIds['leads'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetLeadAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getLead auth failed: ' + e.message))
    }

    try {
      if (!'/leads/{leadId}'.includes('{') || createdIds['leads']) {
        const resgetLead = await app.inject({
          method: 'GET',
          url: `/leads/${createdIds['leads'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetLead.statusCode !== 200) {
          console.error('getLead failed with ' + resgetLead.statusCode, resgetLead.json().message || resgetLead.json())
        }
        expect(resgetLead.statusCode).toBe(200)
        await validateResponse('getLead', 200, resgetLead.json())
      }
    } catch (e: any) {
      errors.push(new Error('getLead failed: ' + e.message))
    }

    // updateLead
    
    // updateLead - auth check
    try {
      if (!'/leads/{leadId}'.includes('{') || createdIds['leads']) {
        const resupdateLeadAuth = await app.inject({ method: 'PATCH', url: `/leads/${createdIds['leads'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resupdateLeadAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateLead auth failed: ' + e.message))
    }

    try {
      if (!'/leads/{leadId}'.includes('{') || createdIds['leads']) {
        const resupdateLead = await app.inject({
          method: 'PATCH',
          url: `/leads/${createdIds['leads'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateLead.statusCode !== 200) {
          console.error('updateLead failed with ' + resupdateLead.statusCode, resupdateLead.json().message || resupdateLead.json())
        }
        expect(resupdateLead.statusCode).toBe(200)
        await validateResponse('updateLead', 200, resupdateLead.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateLead failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
