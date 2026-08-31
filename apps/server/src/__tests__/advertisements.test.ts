// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('advertisements API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // createAdvertisement

    // createAdvertisement - auth check
    try {
      if (!'/advertisements'.includes('{') || createdIds['advertisements']) {
        const rescreateAdvertisementAuth = await app.inject({
          method: 'POST',
          url: `/advertisements`,
        })
        expect(rescreateAdvertisementAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createAdvertisement auth failed: ' + e.message))
    }

    try {
      if (!'/advertisements'.includes('{') || createdIds['advertisements']) {
        const rescreateAdvertisement = await app.inject({
          method: 'POST',
          url: `/advertisements`,
          headers: asAuth(testUserId),
          payload: {
            name: 'test_string',
          },
        })
        if (rescreateAdvertisement.statusCode === 201 && rescreateAdvertisement.json().data?.id)
          createdIds['advertisements'] = rescreateAdvertisement.json().data.id
        if (rescreateAdvertisement.statusCode !== 201) {
          console.error(
            'createAdvertisement failed with ' + rescreateAdvertisement.statusCode,
            rescreateAdvertisement.json().message || rescreateAdvertisement.json(),
          )
        }
        expect(rescreateAdvertisement.statusCode).toBe(201)
        await validateResponse('createAdvertisement', 201, rescreateAdvertisement.json())
      }
    } catch (e: any) {
      errors.push(new Error('createAdvertisement failed: ' + e.message))
    }

    // createAdRun

    // createAdRun - auth check
    try {
      if (!'/advertisements/{advertisementId}/runs'.includes('{') || createdIds['advertisements']) {
        const rescreateAdRunAuth = await app.inject({
          method: 'POST',
          url: `/advertisements/${createdIds['advertisements'] || '00000000-0000-0000-0000-000000000001'}/runs`,
        })
        expect(rescreateAdRunAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createAdRun auth failed: ' + e.message))
    }

    try {
      if (!'/advertisements/{advertisementId}/runs'.includes('{') || createdIds['advertisements']) {
        const rescreateAdRun = await app.inject({
          method: 'POST',
          url: `/advertisements/${createdIds['advertisements'] || '00000000-0000-0000-0000-000000000001'}/runs`,
          headers: asAuth(testUserId),
          payload: {
            platform: 'META',
            idempotencyKey: 'test_string',
          },
        })
        if (rescreateAdRun.statusCode === 201 && rescreateAdRun.json().data?.id)
          createdIds['advertisements'] = rescreateAdRun.json().data.id
        if (rescreateAdRun.statusCode !== 201) {
          console.error(
            'createAdRun failed with ' + rescreateAdRun.statusCode,
            rescreateAdRun.json().message || rescreateAdRun.json(),
          )
        }
        expect(rescreateAdRun.statusCode).toBe(201)
        await validateResponse('createAdRun', 201, rescreateAdRun.json())
      }
    } catch (e: any) {
      errors.push(new Error('createAdRun failed: ' + e.message))
    }

    // pauseAdRun

    // pauseAdRun - auth check
    try {
      if (!'/ad-runs/{adRunId}/pause'.includes('{') || createdIds['ad-runs']) {
        const respauseAdRunAuth = await app.inject({
          method: 'POST',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}/pause`,
        })
        expect(respauseAdRunAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('pauseAdRun auth failed: ' + e.message))
    }

    try {
      if (!'/ad-runs/{adRunId}/pause'.includes('{') || createdIds['ad-runs']) {
        const respauseAdRun = await app.inject({
          method: 'POST',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}/pause`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (respauseAdRun.statusCode === 201 && respauseAdRun.json().data?.id)
          createdIds['ad-runs'] = respauseAdRun.json().data.id
        if (respauseAdRun.statusCode !== 200) {
          console.error(
            'pauseAdRun failed with ' + respauseAdRun.statusCode,
            respauseAdRun.json().message || respauseAdRun.json(),
          )
        }
        expect(respauseAdRun.statusCode).toBe(200)
        await validateResponse('pauseAdRun', 200, respauseAdRun.json())
      }
    } catch (e: any) {
      errors.push(new Error('pauseAdRun failed: ' + e.message))
    }

    // resumeAdRun

    // resumeAdRun - auth check
    try {
      if (!'/ad-runs/{adRunId}/resume'.includes('{') || createdIds['ad-runs']) {
        const resresumeAdRunAuth = await app.inject({
          method: 'POST',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}/resume`,
        })
        expect(resresumeAdRunAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('resumeAdRun auth failed: ' + e.message))
    }

    try {
      if (!'/ad-runs/{adRunId}/resume'.includes('{') || createdIds['ad-runs']) {
        const resresumeAdRun = await app.inject({
          method: 'POST',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}/resume`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resresumeAdRun.statusCode === 201 && resresumeAdRun.json().data?.id)
          createdIds['ad-runs'] = resresumeAdRun.json().data.id
        if (resresumeAdRun.statusCode !== 200) {
          console.error(
            'resumeAdRun failed with ' + resresumeAdRun.statusCode,
            resresumeAdRun.json().message || resresumeAdRun.json(),
          )
        }
        expect(resresumeAdRun.statusCode).toBe(200)
        await validateResponse('resumeAdRun', 200, resresumeAdRun.json())
      }
    } catch (e: any) {
      errors.push(new Error('resumeAdRun failed: ' + e.message))
    }

    // endAdRun

    // endAdRun - auth check
    try {
      if (!'/ad-runs/{adRunId}/end'.includes('{') || createdIds['ad-runs']) {
        const resendAdRunAuth = await app.inject({
          method: 'POST',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}/end`,
        })
        expect(resendAdRunAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('endAdRun auth failed: ' + e.message))
    }

    try {
      if (!'/ad-runs/{adRunId}/end'.includes('{') || createdIds['ad-runs']) {
        const resendAdRun = await app.inject({
          method: 'POST',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}/end`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resendAdRun.statusCode === 201 && resendAdRun.json().data?.id)
          createdIds['ad-runs'] = resendAdRun.json().data.id
        if (resendAdRun.statusCode !== 200) {
          console.error(
            'endAdRun failed with ' + resendAdRun.statusCode,
            resendAdRun.json().message || resendAdRun.json(),
          )
        }
        expect(resendAdRun.statusCode).toBe(200)
        await validateResponse('endAdRun', 200, resendAdRun.json())
      }
    } catch (e: any) {
      errors.push(new Error('endAdRun failed: ' + e.message))
    }

    // listAdvertisements

    // listAdvertisements - auth check
    try {
      if (!'/advertisements'.includes('{') || createdIds['advertisements']) {
        const reslistAdvertisementsAuth = await app.inject({
          method: 'GET',
          url: `/advertisements`,
        })
        expect(reslistAdvertisementsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAdvertisements auth failed: ' + e.message))
    }

    try {
      if (!'/advertisements'.includes('{') || createdIds['advertisements']) {
        const reslistAdvertisements = await app.inject({
          method: 'GET',
          url: `/advertisements`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAdvertisements.statusCode !== 200) {
          console.error(
            'listAdvertisements failed with ' + reslistAdvertisements.statusCode,
            reslistAdvertisements.json().message || reslistAdvertisements.json(),
          )
        }
        expect(reslistAdvertisements.statusCode).toBe(200)
        await validateResponse('listAdvertisements', 200, reslistAdvertisements.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAdvertisements failed: ' + e.message))
    }

    // getAdvertisement

    // getAdvertisement - auth check
    try {
      if (!'/advertisements/{advertisementId}'.includes('{') || createdIds['advertisements']) {
        const resgetAdvertisementAuth = await app.inject({
          method: 'GET',
          url: `/advertisements/${createdIds['advertisements'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetAdvertisementAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAdvertisement auth failed: ' + e.message))
    }

    try {
      if (!'/advertisements/{advertisementId}'.includes('{') || createdIds['advertisements']) {
        const resgetAdvertisement = await app.inject({
          method: 'GET',
          url: `/advertisements/${createdIds['advertisements'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAdvertisement.statusCode !== 200) {
          console.error(
            'getAdvertisement failed with ' + resgetAdvertisement.statusCode,
            resgetAdvertisement.json().message || resgetAdvertisement.json(),
          )
        }
        expect(resgetAdvertisement.statusCode).toBe(200)
        await validateResponse('getAdvertisement', 200, resgetAdvertisement.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAdvertisement failed: ' + e.message))
    }

    // listAdRuns

    // listAdRuns - auth check
    try {
      if (!'/advertisements/{advertisementId}/runs'.includes('{') || createdIds['advertisements']) {
        const reslistAdRunsAuth = await app.inject({
          method: 'GET',
          url: `/advertisements/${createdIds['advertisements'] || '00000000-0000-0000-0000-000000000001'}/runs`,
        })
        expect(reslistAdRunsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAdRuns auth failed: ' + e.message))
    }

    try {
      if (!'/advertisements/{advertisementId}/runs'.includes('{') || createdIds['advertisements']) {
        const reslistAdRuns = await app.inject({
          method: 'GET',
          url: `/advertisements/${createdIds['advertisements'] || '00000000-0000-0000-0000-000000000001'}/runs`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAdRuns.statusCode !== 200) {
          console.error(
            'listAdRuns failed with ' + reslistAdRuns.statusCode,
            reslistAdRuns.json().message || reslistAdRuns.json(),
          )
        }
        expect(reslistAdRuns.statusCode).toBe(200)
        await validateResponse('listAdRuns', 200, reslistAdRuns.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAdRuns failed: ' + e.message))
    }

    // getAdRun

    // getAdRun - auth check
    try {
      if (!'/ad-runs/{adRunId}'.includes('{') || createdIds['ad-runs']) {
        const resgetAdRunAuth = await app.inject({
          method: 'GET',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetAdRunAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAdRun auth failed: ' + e.message))
    }

    try {
      if (!'/ad-runs/{adRunId}'.includes('{') || createdIds['ad-runs']) {
        const resgetAdRun = await app.inject({
          method: 'GET',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAdRun.statusCode !== 200) {
          console.error(
            'getAdRun failed with ' + resgetAdRun.statusCode,
            resgetAdRun.json().message || resgetAdRun.json(),
          )
        }
        expect(resgetAdRun.statusCode).toBe(200)
        await validateResponse('getAdRun', 200, resgetAdRun.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAdRun failed: ' + e.message))
    }

    // updateAdvertisement

    // updateAdvertisement - auth check
    try {
      if (!'/advertisements/{advertisementId}'.includes('{') || createdIds['advertisements']) {
        const resupdateAdvertisementAuth = await app.inject({
          method: 'PATCH',
          url: `/advertisements/${createdIds['advertisements'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateAdvertisementAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAdvertisement auth failed: ' + e.message))
    }

    try {
      if (!'/advertisements/{advertisementId}'.includes('{') || createdIds['advertisements']) {
        const resupdateAdvertisement = await app.inject({
          method: 'PATCH',
          url: `/advertisements/${createdIds['advertisements'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateAdvertisement.statusCode !== 200) {
          console.error(
            'updateAdvertisement failed with ' + resupdateAdvertisement.statusCode,
            resupdateAdvertisement.json().message || resupdateAdvertisement.json(),
          )
        }
        expect(resupdateAdvertisement.statusCode).toBe(200)
        await validateResponse('updateAdvertisement', 200, resupdateAdvertisement.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAdvertisement failed: ' + e.message))
    }

    // updateAdRun

    // updateAdRun - auth check
    try {
      if (!'/ad-runs/{adRunId}'.includes('{') || createdIds['ad-runs']) {
        const resupdateAdRunAuth = await app.inject({
          method: 'PATCH',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateAdRunAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAdRun auth failed: ' + e.message))
    }

    try {
      if (!'/ad-runs/{adRunId}'.includes('{') || createdIds['ad-runs']) {
        const resupdateAdRun = await app.inject({
          method: 'PATCH',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateAdRun.statusCode !== 200) {
          console.error(
            'updateAdRun failed with ' + resupdateAdRun.statusCode,
            resupdateAdRun.json().message || resupdateAdRun.json(),
          )
        }
        expect(resupdateAdRun.statusCode).toBe(200)
        await validateResponse('updateAdRun', 200, resupdateAdRun.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAdRun failed: ' + e.message))
    }

    // deleteAdRun

    // deleteAdRun - auth check
    try {
      if (!'/ad-runs/{adRunId}'.includes('{') || createdIds['ad-runs']) {
        const resdeleteAdRunAuth = await app.inject({
          method: 'DELETE',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resdeleteAdRunAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('deleteAdRun auth failed: ' + e.message))
    }

    try {
      if (!'/ad-runs/{adRunId}'.includes('{') || createdIds['ad-runs']) {
        const resdeleteAdRun = await app.inject({
          method: 'DELETE',
          url: `/ad-runs/${createdIds['ad-runs'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resdeleteAdRun.statusCode !== 200) {
          console.error(
            'deleteAdRun failed with ' + resdeleteAdRun.statusCode,
            resdeleteAdRun.json().message || resdeleteAdRun.json(),
          )
        }
        expect(resdeleteAdRun.statusCode).toBe(200)
        await validateResponse('deleteAdRun', 200, resdeleteAdRun.json())
      }
    } catch (e: any) {
      errors.push(new Error('deleteAdRun failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
