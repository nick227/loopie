// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('audiences API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // createAudience

    // createAudience - auth check
    try {
      if (!'/audiences'.includes('{') || createdIds['audiences']) {
        const rescreateAudienceAuth = await app.inject({ method: 'POST', url: `/audiences` })
        expect(rescreateAudienceAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createAudience auth failed: ' + e.message))
    }

    try {
      if (!'/audiences'.includes('{') || createdIds['audiences']) {
        const rescreateAudience = await app.inject({
          method: 'POST',
          url: `/audiences`,
          headers: asAuth(testUserId),
          payload: {
            name: 'test_string',
            type: 'SAVED_FILTER',
          },
        })
        if (rescreateAudience.statusCode === 201 && rescreateAudience.json().data?.id)
          createdIds['audiences'] = rescreateAudience.json().data.id
        if (rescreateAudience.statusCode !== 201) {
          console.error(
            'createAudience failed with ' + rescreateAudience.statusCode,
            rescreateAudience.json().message || rescreateAudience.json(),
          )
        }
        expect(rescreateAudience.statusCode).toBe(201)
        await validateResponse('createAudience', 201, rescreateAudience.json())
      }
    } catch (e: any) {
      errors.push(new Error('createAudience failed: ' + e.message))
    }

    // listAudiences

    // listAudiences - auth check
    try {
      if (!'/audiences'.includes('{') || createdIds['audiences']) {
        const reslistAudiencesAuth = await app.inject({ method: 'GET', url: `/audiences` })
        expect(reslistAudiencesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAudiences auth failed: ' + e.message))
    }

    try {
      if (!'/audiences'.includes('{') || createdIds['audiences']) {
        const reslistAudiences = await app.inject({
          method: 'GET',
          url: `/audiences`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAudiences.statusCode !== 200) {
          console.error(
            'listAudiences failed with ' + reslistAudiences.statusCode,
            reslistAudiences.json().message || reslistAudiences.json(),
          )
        }
        expect(reslistAudiences.statusCode).toBe(200)
        await validateResponse('listAudiences', 200, reslistAudiences.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAudiences failed: ' + e.message))
    }

    // getAudience

    // getAudience - auth check
    try {
      if (!'/audiences/{audienceId}'.includes('{') || createdIds['audiences']) {
        const resgetAudienceAuth = await app.inject({
          method: 'GET',
          url: `/audiences/${createdIds['audiences'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetAudienceAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAudience auth failed: ' + e.message))
    }

    try {
      if (!'/audiences/{audienceId}'.includes('{') || createdIds['audiences']) {
        const resgetAudience = await app.inject({
          method: 'GET',
          url: `/audiences/${createdIds['audiences'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAudience.statusCode !== 200) {
          console.error(
            'getAudience failed with ' + resgetAudience.statusCode,
            resgetAudience.json().message || resgetAudience.json(),
          )
        }
        expect(resgetAudience.statusCode).toBe(200)
        await validateResponse('getAudience', 200, resgetAudience.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAudience failed: ' + e.message))
    }

    // listAudienceContacts

    // listAudienceContacts - auth check
    try {
      if (!'/audiences/{audienceId}/contacts'.includes('{') || createdIds['audiences']) {
        const reslistAudienceContactsAuth = await app.inject({
          method: 'GET',
          url: `/audiences/${createdIds['audiences'] || '00000000-0000-0000-0000-000000000001'}/contacts`,
        })
        expect(reslistAudienceContactsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAudienceContacts auth failed: ' + e.message))
    }

    try {
      if (!'/audiences/{audienceId}/contacts'.includes('{') || createdIds['audiences']) {
        const reslistAudienceContacts = await app.inject({
          method: 'GET',
          url: `/audiences/${createdIds['audiences'] || '00000000-0000-0000-0000-000000000001'}/contacts`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAudienceContacts.statusCode !== 200) {
          console.error(
            'listAudienceContacts failed with ' + reslistAudienceContacts.statusCode,
            reslistAudienceContacts.json().message || reslistAudienceContacts.json(),
          )
        }
        expect(reslistAudienceContacts.statusCode).toBe(200)
        await validateResponse('listAudienceContacts', 200, reslistAudienceContacts.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAudienceContacts failed: ' + e.message))
    }

    // updateAudience

    // updateAudience - auth check
    try {
      if (!'/audiences/{audienceId}'.includes('{') || createdIds['audiences']) {
        const resupdateAudienceAuth = await app.inject({
          method: 'PATCH',
          url: `/audiences/${createdIds['audiences'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateAudienceAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAudience auth failed: ' + e.message))
    }

    try {
      if (!'/audiences/{audienceId}'.includes('{') || createdIds['audiences']) {
        const resupdateAudience = await app.inject({
          method: 'PATCH',
          url: `/audiences/${createdIds['audiences'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateAudience.statusCode !== 200) {
          console.error(
            'updateAudience failed with ' + resupdateAudience.statusCode,
            resupdateAudience.json().message || resupdateAudience.json(),
          )
        }
        expect(resupdateAudience.statusCode).toBe(200)
        await validateResponse('updateAudience', 200, resupdateAudience.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAudience failed: ' + e.message))
    }

    // deleteAudience

    // deleteAudience - auth check
    try {
      if (!'/audiences/{audienceId}'.includes('{') || createdIds['audiences']) {
        const resdeleteAudienceAuth = await app.inject({
          method: 'DELETE',
          url: `/audiences/${createdIds['audiences'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resdeleteAudienceAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteAudience auth failed: ' + e.message))
    }

    try {
      if (!'/audiences/{audienceId}'.includes('{') || createdIds['audiences']) {
        const resdeleteAudience = await app.inject({
          method: 'DELETE',
          url: `/audiences/${createdIds['audiences'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteAudience.statusCode !== 200) {
          console.error(
            'deleteAudience failed with ' + resdeleteAudience.statusCode,
            resdeleteAudience.json().message || resdeleteAudience.json(),
          )
        }
        expect(resdeleteAudience.statusCode).toBe(200)
        await validateResponse('deleteAudience', 200, resdeleteAudience.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteAudience failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
