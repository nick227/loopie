// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('affiliates API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // listAffiliateClasses
    
    // listAffiliateClasses - auth check
    try {
      if (!'/affiliate-classes'.includes('{') || createdIds['affiliate-classes']) {
        const reslistAffiliateClassesAuth = await app.inject({ method: 'GET', url: `/affiliate-classes` })
        expect(reslistAffiliateClassesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAffiliateClasses auth failed: ' + e.message))
    }

    try {
      if (!'/affiliate-classes'.includes('{') || createdIds['affiliate-classes']) {
        const reslistAffiliateClasses = await app.inject({
          method: 'GET',
          url: `/affiliate-classes`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAffiliateClasses.statusCode !== 200) {
          console.error('listAffiliateClasses failed with ' + reslistAffiliateClasses.statusCode, reslistAffiliateClasses.json().message || reslistAffiliateClasses.json())
        }
        expect(reslistAffiliateClasses.statusCode).toBe(200)
        await validateResponse('listAffiliateClasses', 200, reslistAffiliateClasses.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAffiliateClasses failed: ' + e.message))
    }

    // createAffiliateClass
    
    // createAffiliateClass - auth check
    try {
      if (!'/affiliate-classes'.includes('{') || createdIds['affiliate-classes']) {
        const rescreateAffiliateClassAuth = await app.inject({ method: 'POST', url: `/affiliate-classes` })
        expect(rescreateAffiliateClassAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createAffiliateClass auth failed: ' + e.message))
    }

    try {
      if (!'/affiliate-classes'.includes('{') || createdIds['affiliate-classes']) {
        const rescreateAffiliateClass = await app.inject({
          method: 'POST',
          url: `/affiliate-classes`,
          headers: asAuth(testUserId),
          payload: {
  "name": "test_string",
  "maxAffiliateRateBps": 0,
  "maxManagerShareBps": 0
},
        })
        if (rescreateAffiliateClass.statusCode === 201 && rescreateAffiliateClass.json().data?.id) createdIds['affiliate-classes'] = rescreateAffiliateClass.json().data.id
        if (rescreateAffiliateClass.statusCode !== 201) {
          console.error('createAffiliateClass failed with ' + rescreateAffiliateClass.statusCode, rescreateAffiliateClass.json().message || rescreateAffiliateClass.json())
        }
        expect(rescreateAffiliateClass.statusCode).toBe(201)
        await validateResponse('createAffiliateClass', 201, rescreateAffiliateClass.json())
      }
    } catch (e: any) {
      errors.push(new Error('createAffiliateClass failed: ' + e.message))
    }

    // getAffiliateClass
    
    // getAffiliateClass - auth check
    try {
      if (!'/affiliate-classes/{classId}'.includes('{') || createdIds['affiliate-classes']) {
        const resgetAffiliateClassAuth = await app.inject({ method: 'GET', url: `/affiliate-classes/${createdIds['affiliate-classes'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetAffiliateClassAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAffiliateClass auth failed: ' + e.message))
    }

    try {
      if (!'/affiliate-classes/{classId}'.includes('{') || createdIds['affiliate-classes']) {
        const resgetAffiliateClass = await app.inject({
          method: 'GET',
          url: `/affiliate-classes/${createdIds['affiliate-classes'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAffiliateClass.statusCode !== 200) {
          console.error('getAffiliateClass failed with ' + resgetAffiliateClass.statusCode, resgetAffiliateClass.json().message || resgetAffiliateClass.json())
        }
        expect(resgetAffiliateClass.statusCode).toBe(200)
        await validateResponse('getAffiliateClass', 200, resgetAffiliateClass.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAffiliateClass failed: ' + e.message))
    }

    // updateAffiliateClass
    
    // updateAffiliateClass - auth check
    try {
      if (!'/affiliate-classes/{classId}'.includes('{') || createdIds['affiliate-classes']) {
        const resupdateAffiliateClassAuth = await app.inject({ method: 'PATCH', url: `/affiliate-classes/${createdIds['affiliate-classes'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resupdateAffiliateClassAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAffiliateClass auth failed: ' + e.message))
    }

    try {
      if (!'/affiliate-classes/{classId}'.includes('{') || createdIds['affiliate-classes']) {
        const resupdateAffiliateClass = await app.inject({
          method: 'PATCH',
          url: `/affiliate-classes/${createdIds['affiliate-classes'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateAffiliateClass.statusCode !== 200) {
          console.error('updateAffiliateClass failed with ' + resupdateAffiliateClass.statusCode, resupdateAffiliateClass.json().message || resupdateAffiliateClass.json())
        }
        expect(resupdateAffiliateClass.statusCode).toBe(200)
        await validateResponse('updateAffiliateClass', 200, resupdateAffiliateClass.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAffiliateClass failed: ' + e.message))
    }

    // listAffiliateDeals
    
    // listAffiliateDeals - auth check
    try {
      if (!'/affiliate-deals'.includes('{') || createdIds['affiliate-deals']) {
        const reslistAffiliateDealsAuth = await app.inject({ method: 'GET', url: `/affiliate-deals` })
        expect(reslistAffiliateDealsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAffiliateDeals auth failed: ' + e.message))
    }

    try {
      if (!'/affiliate-deals'.includes('{') || createdIds['affiliate-deals']) {
        const reslistAffiliateDeals = await app.inject({
          method: 'GET',
          url: `/affiliate-deals`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAffiliateDeals.statusCode !== 200) {
          console.error('listAffiliateDeals failed with ' + reslistAffiliateDeals.statusCode, reslistAffiliateDeals.json().message || reslistAffiliateDeals.json())
        }
        expect(reslistAffiliateDeals.statusCode).toBe(200)
        await validateResponse('listAffiliateDeals', 200, reslistAffiliateDeals.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAffiliateDeals failed: ' + e.message))
    }

    // createAffiliateDeal
    
    // createAffiliateDeal - auth check
    try {
      if (!'/affiliate-deals'.includes('{') || createdIds['affiliate-deals']) {
        const rescreateAffiliateDealAuth = await app.inject({ method: 'POST', url: `/affiliate-deals` })
        expect(rescreateAffiliateDealAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createAffiliateDeal auth failed: ' + e.message))
    }

    try {
      if (!'/affiliate-deals'.includes('{') || createdIds['affiliate-deals']) {
        const rescreateAffiliateDeal = await app.inject({
          method: 'POST',
          url: `/affiliate-deals`,
          headers: asAuth(testUserId),
          payload: {
  "name": "test_string",
  "affiliateRateBps": 0,
  "payoutThresholdMinor": 0
},
        })
        if (rescreateAffiliateDeal.statusCode === 201 && rescreateAffiliateDeal.json().data?.id) createdIds['affiliate-deals'] = rescreateAffiliateDeal.json().data.id
        if (rescreateAffiliateDeal.statusCode !== 201) {
          console.error('createAffiliateDeal failed with ' + rescreateAffiliateDeal.statusCode, rescreateAffiliateDeal.json().message || rescreateAffiliateDeal.json())
        }
        expect(rescreateAffiliateDeal.statusCode).toBe(201)
        await validateResponse('createAffiliateDeal', 201, rescreateAffiliateDeal.json())
      }
    } catch (e: any) {
      errors.push(new Error('createAffiliateDeal failed: ' + e.message))
    }

    // getAffiliateDeal
    
    // getAffiliateDeal - auth check
    try {
      if (!'/affiliate-deals/{dealId}'.includes('{') || createdIds['affiliate-deals']) {
        const resgetAffiliateDealAuth = await app.inject({ method: 'GET', url: `/affiliate-deals/${createdIds['affiliate-deals'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetAffiliateDealAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAffiliateDeal auth failed: ' + e.message))
    }

    try {
      if (!'/affiliate-deals/{dealId}'.includes('{') || createdIds['affiliate-deals']) {
        const resgetAffiliateDeal = await app.inject({
          method: 'GET',
          url: `/affiliate-deals/${createdIds['affiliate-deals'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAffiliateDeal.statusCode !== 200) {
          console.error('getAffiliateDeal failed with ' + resgetAffiliateDeal.statusCode, resgetAffiliateDeal.json().message || resgetAffiliateDeal.json())
        }
        expect(resgetAffiliateDeal.statusCode).toBe(200)
        await validateResponse('getAffiliateDeal', 200, resgetAffiliateDeal.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAffiliateDeal failed: ' + e.message))
    }

    // updateAffiliateDeal
    
    // updateAffiliateDeal - auth check
    try {
      if (!'/affiliate-deals/{dealId}'.includes('{') || createdIds['affiliate-deals']) {
        const resupdateAffiliateDealAuth = await app.inject({ method: 'PATCH', url: `/affiliate-deals/${createdIds['affiliate-deals'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resupdateAffiliateDealAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAffiliateDeal auth failed: ' + e.message))
    }

    try {
      if (!'/affiliate-deals/{dealId}'.includes('{') || createdIds['affiliate-deals']) {
        const resupdateAffiliateDeal = await app.inject({
          method: 'PATCH',
          url: `/affiliate-deals/${createdIds['affiliate-deals'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {
  "affiliateRateBps": 0,
  "payoutThresholdMinor": 0
},
        })
        if (resupdateAffiliateDeal.statusCode !== 200) {
          console.error('updateAffiliateDeal failed with ' + resupdateAffiliateDeal.statusCode, resupdateAffiliateDeal.json().message || resupdateAffiliateDeal.json())
        }
        expect(resupdateAffiliateDeal.statusCode).toBe(200)
        await validateResponse('updateAffiliateDeal', 200, resupdateAffiliateDeal.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAffiliateDeal failed: ' + e.message))
    }

    // listAffiliates
    
    // listAffiliates - auth check
    try {
      if (!'/affiliates'.includes('{') || createdIds['affiliates']) {
        const reslistAffiliatesAuth = await app.inject({ method: 'GET', url: `/affiliates` })
        expect(reslistAffiliatesAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listAffiliates auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates'.includes('{') || createdIds['affiliates']) {
        const reslistAffiliates = await app.inject({
          method: 'GET',
          url: `/affiliates`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistAffiliates.statusCode !== 200) {
          console.error('listAffiliates failed with ' + reslistAffiliates.statusCode, reslistAffiliates.json().message || reslistAffiliates.json())
        }
        expect(reslistAffiliates.statusCode).toBe(200)
        await validateResponse('listAffiliates', 200, reslistAffiliates.json())
      }
    } catch (e: any) {
      errors.push(new Error('listAffiliates failed: ' + e.message))
    }
    // Skipped createAffiliate because payload could not be generated

    // getMyAffiliate
    
    // getMyAffiliate - auth check
    try {
      if (!'/affiliates/me'.includes('{') || createdIds['affiliates']) {
        const resgetMyAffiliateAuth = await app.inject({ method: 'GET', url: `/affiliates/me` })
        expect(resgetMyAffiliateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getMyAffiliate auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates/me'.includes('{') || createdIds['affiliates']) {
        const resgetMyAffiliate = await app.inject({
          method: 'GET',
          url: `/affiliates/me`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetMyAffiliate.statusCode !== 200) {
          console.error('getMyAffiliate failed with ' + resgetMyAffiliate.statusCode, resgetMyAffiliate.json().message || resgetMyAffiliate.json())
        }
        expect(resgetMyAffiliate.statusCode).toBe(200)
        await validateResponse('getMyAffiliate', 200, resgetMyAffiliate.json())
      }
    } catch (e: any) {
      errors.push(new Error('getMyAffiliate failed: ' + e.message))
    }

    // getAffiliate
    
    // getAffiliate - auth check
    try {
      if (!'/affiliates/{affiliateId}'.includes('{') || createdIds['affiliates']) {
        const resgetAffiliateAuth = await app.inject({ method: 'GET', url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resgetAffiliateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAffiliate auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates/{affiliateId}'.includes('{') || createdIds['affiliates']) {
        const resgetAffiliate = await app.inject({
          method: 'GET',
          url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAffiliate.statusCode !== 200) {
          console.error('getAffiliate failed with ' + resgetAffiliate.statusCode, resgetAffiliate.json().message || resgetAffiliate.json())
        }
        expect(resgetAffiliate.statusCode).toBe(200)
        await validateResponse('getAffiliate', 200, resgetAffiliate.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAffiliate failed: ' + e.message))
    }

    // updateAffiliate
    
    // updateAffiliate - auth check
    try {
      if (!'/affiliates/{affiliateId}'.includes('{') || createdIds['affiliates']) {
        const resupdateAffiliateAuth = await app.inject({ method: 'PATCH', url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}` })
        expect(resupdateAffiliateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateAffiliate auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates/{affiliateId}'.includes('{') || createdIds['affiliates']) {
        const resupdateAffiliate = await app.inject({
          method: 'PATCH',
          url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateAffiliate.statusCode !== 200) {
          console.error('updateAffiliate failed with ' + resupdateAffiliate.statusCode, resupdateAffiliate.json().message || resupdateAffiliate.json())
        }
        expect(resupdateAffiliate.statusCode).toBe(200)
        await validateResponse('updateAffiliate', 200, resupdateAffiliate.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateAffiliate failed: ' + e.message))
    }

    // getAffiliateEarnings
    
    // getAffiliateEarnings - auth check
    try {
      if (!'/affiliates/{affiliateId}/earnings'.includes('{') || createdIds['affiliates']) {
        const resgetAffiliateEarningsAuth = await app.inject({ method: 'GET', url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/earnings` })
        expect(resgetAffiliateEarningsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getAffiliateEarnings auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates/{affiliateId}/earnings'.includes('{') || createdIds['affiliates']) {
        const resgetAffiliateEarnings = await app.inject({
          method: 'GET',
          url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/earnings`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetAffiliateEarnings.statusCode !== 200) {
          console.error('getAffiliateEarnings failed with ' + resgetAffiliateEarnings.statusCode, resgetAffiliateEarnings.json().message || resgetAffiliateEarnings.json())
        }
        expect(resgetAffiliateEarnings.statusCode).toBe(200)
        await validateResponse('getAffiliateEarnings', 200, resgetAffiliateEarnings.json())
      }
    } catch (e: any) {
      errors.push(new Error('getAffiliateEarnings failed: ' + e.message))
    }

    // createAffiliateConnectOnboarding
    
    // createAffiliateConnectOnboarding - auth check
    try {
      if (!'/affiliates/{affiliateId}/connect/onboarding'.includes('{') || createdIds['affiliates']) {
        const rescreateAffiliateConnectOnboardingAuth = await app.inject({ method: 'POST', url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/connect/onboarding` })
        expect(rescreateAffiliateConnectOnboardingAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createAffiliateConnectOnboarding auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates/{affiliateId}/connect/onboarding'.includes('{') || createdIds['affiliates']) {
        const rescreateAffiliateConnectOnboarding = await app.inject({
          method: 'POST',
          url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/connect/onboarding`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (rescreateAffiliateConnectOnboarding.statusCode === 201 && rescreateAffiliateConnectOnboarding.json().data?.id) createdIds['affiliates'] = rescreateAffiliateConnectOnboarding.json().data.id
        if (rescreateAffiliateConnectOnboarding.statusCode !== 201) {
          console.error('createAffiliateConnectOnboarding failed with ' + rescreateAffiliateConnectOnboarding.statusCode, rescreateAffiliateConnectOnboarding.json().message || rescreateAffiliateConnectOnboarding.json())
        }
        expect(rescreateAffiliateConnectOnboarding.statusCode).toBe(201)
        await validateResponse('createAffiliateConnectOnboarding', 201, rescreateAffiliateConnectOnboarding.json())
      }
    } catch (e: any) {
      errors.push(new Error('createAffiliateConnectOnboarding failed: ' + e.message))
    }

    // syncAffiliateConnect
    
    // syncAffiliateConnect - auth check
    try {
      if (!'/affiliates/{affiliateId}/connect/sync'.includes('{') || createdIds['affiliates']) {
        const ressyncAffiliateConnectAuth = await app.inject({ method: 'POST', url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/connect/sync` })
        expect(ressyncAffiliateConnectAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('syncAffiliateConnect auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates/{affiliateId}/connect/sync'.includes('{') || createdIds['affiliates']) {
        const ressyncAffiliateConnect = await app.inject({
          method: 'POST',
          url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/connect/sync`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (ressyncAffiliateConnect.statusCode === 201 && ressyncAffiliateConnect.json().data?.id) createdIds['affiliates'] = ressyncAffiliateConnect.json().data.id
        if (ressyncAffiliateConnect.statusCode !== 200) {
          console.error('syncAffiliateConnect failed with ' + ressyncAffiliateConnect.statusCode, ressyncAffiliateConnect.json().message || ressyncAffiliateConnect.json())
        }
        expect(ressyncAffiliateConnect.statusCode).toBe(200)
        await validateResponse('syncAffiliateConnect', 200, ressyncAffiliateConnect.json())
      }
    } catch (e: any) {
      errors.push(new Error('syncAffiliateConnect failed: ' + e.message))
    }

    // pauseAffiliate
    
    // pauseAffiliate - auth check
    try {
      if (!'/affiliates/{affiliateId}/pause'.includes('{') || createdIds['affiliates']) {
        const respauseAffiliateAuth = await app.inject({ method: 'POST', url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/pause` })
        expect(respauseAffiliateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('pauseAffiliate auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates/{affiliateId}/pause'.includes('{') || createdIds['affiliates']) {
        const respauseAffiliate = await app.inject({
          method: 'POST',
          url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/pause`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (respauseAffiliate.statusCode === 201 && respauseAffiliate.json().data?.id) createdIds['affiliates'] = respauseAffiliate.json().data.id
        if (respauseAffiliate.statusCode !== 200) {
          console.error('pauseAffiliate failed with ' + respauseAffiliate.statusCode, respauseAffiliate.json().message || respauseAffiliate.json())
        }
        expect(respauseAffiliate.statusCode).toBe(200)
        await validateResponse('pauseAffiliate', 200, respauseAffiliate.json())
      }
    } catch (e: any) {
      errors.push(new Error('pauseAffiliate failed: ' + e.message))
    }

    // resumeAffiliate
    
    // resumeAffiliate - auth check
    try {
      if (!'/affiliates/{affiliateId}/resume'.includes('{') || createdIds['affiliates']) {
        const resresumeAffiliateAuth = await app.inject({ method: 'POST', url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/resume` })
        expect(resresumeAffiliateAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('resumeAffiliate auth failed: ' + e.message))
    }

    try {
      if (!'/affiliates/{affiliateId}/resume'.includes('{') || createdIds['affiliates']) {
        const resresumeAffiliate = await app.inject({
          method: 'POST',
          url: `/affiliates/${createdIds['affiliates'] || '00000000-0000-0000-0000-000000000001'}/resume`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resresumeAffiliate.statusCode === 201 && resresumeAffiliate.json().data?.id) createdIds['affiliates'] = resresumeAffiliate.json().data.id
        if (resresumeAffiliate.statusCode !== 200) {
          console.error('resumeAffiliate failed with ' + resresumeAffiliate.statusCode, resresumeAffiliate.json().message || resresumeAffiliate.json())
        }
        expect(resresumeAffiliate.statusCode).toBe(200)
        await validateResponse('resumeAffiliate', 200, resresumeAffiliate.json())
      }
    } catch (e: any) {
      errors.push(new Error('resumeAffiliate failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map(e => e.message).join('\n'))
    }
  })
})
