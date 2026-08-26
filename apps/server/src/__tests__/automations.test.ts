// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('automations API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // listAutomations
    
    // listAutomations - auth check
    try {
      if (!'/automations'.includes('{') || createdIds['automations']) {
        const reslistAutomationsAuth = await app.inject({ method: 'GET', url: `/automations` })
        expect(reslistAutomationsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAutomations auth failed: ' + e.message))
    }

    try {
      if (!'/automations'.includes('{') || createdIds['automations']) {
        const reslistAutomations = await app.inject({
          method: 'GET',
          url: `/automations`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAutomations.statusCode !== 200) {
          console.error('listAutomations failed with ' + reslistAutomations.statusCode, reslistAutomations.json().message || reslistAutomations.json())
        }
        expect(reslistAutomations.statusCode).toBe(200)
        await validateResponse('listAutomations', 200, reslistAutomations.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAutomations failed: ' + e.message))
    }

    // createAutomation
    
    // createAutomation - auth check
    try {
      if (!'/automations'.includes('{') || createdIds['automations']) {
        const rescreateAutomationAuth = await app.inject({ method: 'POST', url: `/automations` })
        expect(rescreateAutomationAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createAutomation auth failed: ' + e.message))
    }

    try {
      if (!'/automations'.includes('{') || createdIds['automations']) {
        const rescreateAutomation = await app.inject({
          method: 'POST',
          url: `/automations`,
          headers: asAuth(testUserId),
          payload: {
  "name": "test_string",
  "trigger": "MESSAGE_SENT",
  "action": "SEND_EMAIL"
},
        })
        if (rescreateAutomation.statusCode === 201 && rescreateAutomation.json().data?.id) createdIds['automations'] = rescreateAutomation.json().data.id
        if (rescreateAutomation.statusCode !== 201) {
          console.error('createAutomation failed with ' + rescreateAutomation.statusCode, rescreateAutomation.json().message || rescreateAutomation.json())
        }
        expect(rescreateAutomation.statusCode).toBe(201)
        await validateResponse('createAutomation', 201, rescreateAutomation.json())
      }
    } catch (e: any) {
      errors.push(new Error('createAutomation failed: ' + e.message))
    }

    // getAutomation
    
    // getAutomation - auth check
    try {
      if (!'/automations/{automationId}'.includes('{') || createdIds['automations']) {
        const resgetAutomationAuth = await app.inject({ method: 'GET', url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetAutomationAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAutomation auth failed: ' + e.message))
    }

    try {
      if (!'/automations/{automationId}'.includes('{') || createdIds['automations']) {
        const resgetAutomation = await app.inject({
          method: 'GET',
          url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAutomation.statusCode !== 200) {
          console.error('getAutomation failed with ' + resgetAutomation.statusCode, resgetAutomation.json().message || resgetAutomation.json())
        }
        expect(resgetAutomation.statusCode).toBe(200)
        await validateResponse('getAutomation', 200, resgetAutomation.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAutomation failed: ' + e.message))
    }

    // updateAutomation
    
    // updateAutomation - auth check
    try {
      if (!'/automations/{automationId}'.includes('{') || createdIds['automations']) {
        const resupdateAutomationAuth = await app.inject({ method: 'PATCH', url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resupdateAutomationAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAutomation auth failed: ' + e.message))
    }

    try {
      if (!'/automations/{automationId}'.includes('{') || createdIds['automations']) {
        const resupdateAutomation = await app.inject({
          method: 'PATCH',
          url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateAutomation.statusCode !== 200) {
          console.error('updateAutomation failed with ' + resupdateAutomation.statusCode, resupdateAutomation.json().message || resupdateAutomation.json())
        }
        expect(resupdateAutomation.statusCode).toBe(200)
        await validateResponse('updateAutomation', 200, resupdateAutomation.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAutomation failed: ' + e.message))
    }

    // pauseAutomation
    
    // pauseAutomation - auth check
    try {
      if (!'/automations/{automationId}/pause'.includes('{') || createdIds['automations']) {
        const respauseAutomationAuth = await app.inject({ method: 'POST', url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}/pause` })
        expect(respauseAutomationAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('pauseAutomation auth failed: ' + e.message))
    }

    try {
      if (!'/automations/{automationId}/pause'.includes('{') || createdIds['automations']) {
        const respauseAutomation = await app.inject({
          method: 'POST',
          url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}/pause`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (respauseAutomation.statusCode === 201 && respauseAutomation.json().data?.id) createdIds['automations'] = respauseAutomation.json().data.id
        if (respauseAutomation.statusCode !== 200) {
          console.error('pauseAutomation failed with ' + respauseAutomation.statusCode, respauseAutomation.json().message || respauseAutomation.json())
        }
        expect(respauseAutomation.statusCode).toBe(200)
        await validateResponse('pauseAutomation', 200, respauseAutomation.json())
      }
    } catch (e: any) {
      errors.push(new Error('pauseAutomation failed: ' + e.message))
    }

    // resumeAutomation
    
    // resumeAutomation - auth check
    try {
      if (!'/automations/{automationId}/resume'.includes('{') || createdIds['automations']) {
        const resresumeAutomationAuth = await app.inject({ method: 'POST', url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}/resume` })
        expect(resresumeAutomationAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('resumeAutomation auth failed: ' + e.message))
    }

    try {
      if (!'/automations/{automationId}/resume'.includes('{') || createdIds['automations']) {
        const resresumeAutomation = await app.inject({
          method: 'POST',
          url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}/resume`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resresumeAutomation.statusCode === 201 && resresumeAutomation.json().data?.id) createdIds['automations'] = resresumeAutomation.json().data.id
        if (resresumeAutomation.statusCode !== 200) {
          console.error('resumeAutomation failed with ' + resresumeAutomation.statusCode, resresumeAutomation.json().message || resresumeAutomation.json())
        }
        expect(resresumeAutomation.statusCode).toBe(200)
        await validateResponse('resumeAutomation', 200, resresumeAutomation.json())
      }
    } catch (e: any) {
      errors.push(new Error('resumeAutomation failed: ' + e.message))
    }

    // listAutomationLogs
    
    // listAutomationLogs - auth check
    try {
      if (!'/automations/{automationId}/logs'.includes('{') || createdIds['automations']) {
        const reslistAutomationLogsAuth = await app.inject({ method: 'GET', url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}/logs` })
        expect(reslistAutomationLogsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAutomationLogs auth failed: ' + e.message))
    }

    try {
      if (!'/automations/{automationId}/logs'.includes('{') || createdIds['automations']) {
        const reslistAutomationLogs = await app.inject({
          method: 'GET',
          url: `/automations/${createdIds['automations'] || '00000000-0000-0000-0000-000000000001'}/logs`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAutomationLogs.statusCode !== 200) {
          console.error('listAutomationLogs failed with ' + reslistAutomationLogs.statusCode, reslistAutomationLogs.json().message || reslistAutomationLogs.json())
        }
        expect(reslistAutomationLogs.statusCode).toBe(200)
        await validateResponse('listAutomationLogs', 200, reslistAutomationLogs.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAutomationLogs failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
