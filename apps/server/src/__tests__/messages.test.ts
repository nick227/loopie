// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('messages API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // listMessages
    
    // listMessages - auth check
    try {
      if (!'/messages'.includes('{') || createdIds['messages']) {
        const reslistMessagesAuth = await app.inject({ method: 'GET', url: `/messages` })
        expect(reslistMessagesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listMessages auth failed: ' + e.message))
    }

    try {
      if (!'/messages'.includes('{') || createdIds['messages']) {
        const reslistMessages = await app.inject({
          method: 'GET',
          url: `/messages`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistMessages.statusCode !== 200) {
          console.error('listMessages failed with ' + reslistMessages.statusCode, reslistMessages.json().message || reslistMessages.json())
        }
        expect(reslistMessages.statusCode).toBe(200)
        await validateResponse('listMessages', 200, reslistMessages.json())
      }
    } catch (e: any) {
      errors.push(new Error('listMessages failed: ' + e.message))
    }
    // Skipped createMessage because payload could not be generated

    // getMessage
    
    // getMessage - auth check
    try {
      if (!'/messages/{messageId}'.includes('{') || createdIds['messages']) {
        const resgetMessageAuth = await app.inject({ method: 'GET', url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetMessageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getMessage auth failed: ' + e.message))
    }

    try {
      if (!'/messages/{messageId}'.includes('{') || createdIds['messages']) {
        const resgetMessage = await app.inject({
          method: 'GET',
          url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetMessage.statusCode !== 200) {
          console.error('getMessage failed with ' + resgetMessage.statusCode, resgetMessage.json().message || resgetMessage.json())
        }
        expect(resgetMessage.statusCode).toBe(200)
        await validateResponse('getMessage', 200, resgetMessage.json())
      }
    } catch (e: any) {
      errors.push(new Error('getMessage failed: ' + e.message))
    }

    // updateMessage
    
    // updateMessage - auth check
    try {
      if (!'/messages/{messageId}'.includes('{') || createdIds['messages']) {
        const resupdateMessageAuth = await app.inject({ method: 'PATCH', url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resupdateMessageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateMessage auth failed: ' + e.message))
    }

    try {
      if (!'/messages/{messageId}'.includes('{') || createdIds['messages']) {
        const resupdateMessage = await app.inject({
          method: 'PATCH',
          url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateMessage.statusCode !== 200) {
          console.error('updateMessage failed with ' + resupdateMessage.statusCode, resupdateMessage.json().message || resupdateMessage.json())
        }
        expect(resupdateMessage.statusCode).toBe(200)
        await validateResponse('updateMessage', 200, resupdateMessage.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateMessage failed: ' + e.message))
    }

    // deleteMessage
    
    // deleteMessage - auth check
    try {
      if (!'/messages/{messageId}'.includes('{') || createdIds['messages']) {
        const resdeleteMessageAuth = await app.inject({ method: 'DELETE', url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resdeleteMessageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteMessage auth failed: ' + e.message))
    }

    try {
      if (!'/messages/{messageId}'.includes('{') || createdIds['messages']) {
        const resdeleteMessage = await app.inject({
          method: 'DELETE',
          url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteMessage.statusCode !== 200) {
          console.error('deleteMessage failed with ' + resdeleteMessage.statusCode, resdeleteMessage.json().message || resdeleteMessage.json())
        }
        expect(resdeleteMessage.statusCode).toBe(200)
        await validateResponse('deleteMessage', 200, resdeleteMessage.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteMessage failed: ' + e.message))
    }

    // sendMessage
    
    // sendMessage - auth check
    try {
      if (!'/messages/{messageId}/send'.includes('{') || createdIds['messages']) {
        const ressendMessageAuth = await app.inject({ method: 'POST', url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}/send` })
        expect(ressendMessageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('sendMessage auth failed: ' + e.message))
    }

    try {
      if (!'/messages/{messageId}/send'.includes('{') || createdIds['messages']) {
        const ressendMessage = await app.inject({
          method: 'POST',
          url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}/send`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (ressendMessage.statusCode === 201 && ressendMessage.json().data?.id) createdIds['messages'] = ressendMessage.json().data.id
        if (ressendMessage.statusCode !== 200) {
          console.error('sendMessage failed with ' + ressendMessage.statusCode, ressendMessage.json().message || ressendMessage.json())
        }
        expect(ressendMessage.statusCode).toBe(200)
        await validateResponse('sendMessage', 200, ressendMessage.json())
      }
    } catch (e: any) {
      errors.push(new Error('sendMessage failed: ' + e.message))
    }

    // testSendMessage
    
    // testSendMessage - auth check
    try {
      if (!'/messages/{messageId}/test-send'.includes('{') || createdIds['messages']) {
        const restestSendMessageAuth = await app.inject({ method: 'POST', url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}/test-send` })
        expect(restestSendMessageAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('testSendMessage auth failed: ' + e.message))
    }

    try {
      if (!'/messages/{messageId}/test-send'.includes('{') || createdIds['messages']) {
        const restestSendMessage = await app.inject({
          method: 'POST',
          url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}/test-send`,
          headers: asAuth(testUserId),
          payload: {
  "toEmailOrPhone": "test_string"
},
        })
        if (restestSendMessage.statusCode === 201 && restestSendMessage.json().data?.id) createdIds['messages'] = restestSendMessage.json().data.id
        if (restestSendMessage.statusCode !== 200) {
          console.error('testSendMessage failed with ' + restestSendMessage.statusCode, restestSendMessage.json().message || restestSendMessage.json())
        }
        expect(restestSendMessage.statusCode).toBe(200)
        await validateResponse('testSendMessage', 200, restestSendMessage.json())
      }
    } catch (e: any) {
      errors.push(new Error('testSendMessage failed: ' + e.message))
    }

    // getMessagePerformance
    
    // getMessagePerformance - auth check
    try {
      if (!'/messages/{messageId}/performance'.includes('{') || createdIds['messages']) {
        const resgetMessagePerformanceAuth = await app.inject({ method: 'GET', url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}/performance` })
        expect(resgetMessagePerformanceAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getMessagePerformance auth failed: ' + e.message))
    }

    try {
      if (!'/messages/{messageId}/performance'.includes('{') || createdIds['messages']) {
        const resgetMessagePerformance = await app.inject({
          method: 'GET',
          url: `/messages/${createdIds['messages'] || '00000000-0000-0000-0000-000000000001'}/performance`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetMessagePerformance.statusCode !== 200) {
          console.error('getMessagePerformance failed with ' + resgetMessagePerformance.statusCode, resgetMessagePerformance.json().message || resgetMessagePerformance.json())
        }
        expect(resgetMessagePerformance.statusCode).toBe(200)
        await validateResponse('getMessagePerformance', 200, resgetMessagePerformance.json())
      }
    } catch (e: any) {
      errors.push(new Error('getMessagePerformance failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
