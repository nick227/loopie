// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()
const createdIds: Record<string, string> = { default: '00000000-0000-0000-0000-000000000001' }

describe('campaigns API', () => {
  it('runs CRUD lifecycle', async (ctx) => {
    const errors: Error[] = []

    // createCampaign

    // createCampaign - auth check
    try {
      if (!'/campaigns'.includes('{') || createdIds['campaigns']) {
        const rescreateCampaignAuth = await app.inject({ method: 'POST', url: `/campaigns` })
        expect(rescreateCampaignAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('createCampaign auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns'.includes('{') || createdIds['campaigns']) {
        const rescreateCampaign = await app.inject({
          method: 'POST',
          url: `/campaigns`,
          headers: asAuth(testUserId),
          payload: {
            name: 'test_string',
          },
        })
        if (rescreateCampaign.statusCode === 201 && rescreateCampaign.json().data?.id)
          createdIds['campaigns'] = rescreateCampaign.json().data.id
        if (rescreateCampaign.statusCode !== 201) {
          console.error(
            'createCampaign failed with ' + rescreateCampaign.statusCode,
            rescreateCampaign.json().message || rescreateCampaign.json(),
          )
        }
        expect(rescreateCampaign.statusCode).toBe(201)
        await validateResponse('createCampaign', 201, rescreateCampaign.json())
      }
    } catch (e: any) {
      errors.push(new Error('createCampaign failed: ' + e.message))
    }

    // pauseCampaign

    // pauseCampaign - auth check
    try {
      if (!'/campaigns/{campaignId}/pause'.includes('{') || createdIds['campaigns']) {
        const respauseCampaignAuth = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/pause`,
        })
        expect(respauseCampaignAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('pauseCampaign auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}/pause'.includes('{') || createdIds['campaigns']) {
        const respauseCampaign = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/pause`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (respauseCampaign.statusCode === 201 && respauseCampaign.json().data?.id)
          createdIds['campaigns'] = respauseCampaign.json().data.id
        if (respauseCampaign.statusCode !== 200) {
          console.error(
            'pauseCampaign failed with ' + respauseCampaign.statusCode,
            respauseCampaign.json().message || respauseCampaign.json(),
          )
        }
        expect(respauseCampaign.statusCode).toBe(200)
        await validateResponse('pauseCampaign', 200, respauseCampaign.json())
      }
    } catch (e: any) {
      errors.push(new Error('pauseCampaign failed: ' + e.message))
    }

    // resumeCampaign

    // resumeCampaign - auth check
    try {
      if (!'/campaigns/{campaignId}/resume'.includes('{') || createdIds['campaigns']) {
        const resresumeCampaignAuth = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/resume`,
        })
        expect(resresumeCampaignAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('resumeCampaign auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}/resume'.includes('{') || createdIds['campaigns']) {
        const resresumeCampaign = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/resume`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resresumeCampaign.statusCode === 201 && resresumeCampaign.json().data?.id)
          createdIds['campaigns'] = resresumeCampaign.json().data.id
        if (resresumeCampaign.statusCode !== 200) {
          console.error(
            'resumeCampaign failed with ' + resresumeCampaign.statusCode,
            resresumeCampaign.json().message || resresumeCampaign.json(),
          )
        }
        expect(resresumeCampaign.statusCode).toBe(200)
        await validateResponse('resumeCampaign', 200, resresumeCampaign.json())
      }
    } catch (e: any) {
      errors.push(new Error('resumeCampaign failed: ' + e.message))
    }

    // endCampaign

    // endCampaign - auth check
    try {
      if (!'/campaigns/{campaignId}/end'.includes('{') || createdIds['campaigns']) {
        const resendCampaignAuth = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/end`,
        })
        expect(resendCampaignAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('endCampaign auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}/end'.includes('{') || createdIds['campaigns']) {
        const resendCampaign = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/end`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resendCampaign.statusCode === 201 && resendCampaign.json().data?.id)
          createdIds['campaigns'] = resendCampaign.json().data.id
        if (resendCampaign.statusCode !== 200) {
          console.error(
            'endCampaign failed with ' + resendCampaign.statusCode,
            resendCampaign.json().message || resendCampaign.json(),
          )
        }
        expect(resendCampaign.statusCode).toBe(200)
        await validateResponse('endCampaign', 200, resendCampaign.json())
      }
    } catch (e: any) {
      errors.push(new Error('endCampaign failed: ' + e.message))
    }

    // duplicateCampaign

    // duplicateCampaign - auth check
    try {
      if (!'/campaigns/{campaignId}/duplicate'.includes('{') || createdIds['campaigns']) {
        const resduplicateCampaignAuth = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/duplicate`,
        })
        expect(resduplicateCampaignAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('duplicateCampaign auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}/duplicate'.includes('{') || createdIds['campaigns']) {
        const resduplicateCampaign = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/duplicate`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resduplicateCampaign.statusCode === 201 && resduplicateCampaign.json().data?.id)
          createdIds['campaigns'] = resduplicateCampaign.json().data.id
        if (resduplicateCampaign.statusCode !== 201) {
          console.error(
            'duplicateCampaign failed with ' + resduplicateCampaign.statusCode,
            resduplicateCampaign.json().message || resduplicateCampaign.json(),
          )
        }
        expect(resduplicateCampaign.statusCode).toBe(201)
        await validateResponse('duplicateCampaign', 201, resduplicateCampaign.json())
      }
    } catch (e: any) {
      errors.push(new Error('duplicateCampaign failed: ' + e.message))
    }

    // authorizeCampaignBudget

    // authorizeCampaignBudget - auth check
    try {
      if (
        !'/campaigns/{campaignId}/budget-authorizations'.includes('{') ||
        createdIds['campaigns']
      ) {
        const resauthorizeCampaignBudgetAuth = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/budget-authorizations`,
        })
        expect(resauthorizeCampaignBudgetAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('authorizeCampaignBudget auth failed: ' + e.message))
    }

    try {
      if (
        !'/campaigns/{campaignId}/budget-authorizations'.includes('{') ||
        createdIds['campaigns']
      ) {
        const resauthorizeCampaignBudget = await app.inject({
          method: 'POST',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/budget-authorizations`,
          headers: asAuth(testUserId),
          payload: {
            amountMinor: 1,
            currency: 'tes',
            idempotencyKey: 'test_string',
          },
        })
        if (
          resauthorizeCampaignBudget.statusCode === 201 &&
          resauthorizeCampaignBudget.json().data?.id
        )
          createdIds['campaigns'] = resauthorizeCampaignBudget.json().data.id
        if (resauthorizeCampaignBudget.statusCode !== 201) {
          console.error(
            'authorizeCampaignBudget failed with ' + resauthorizeCampaignBudget.statusCode,
            resauthorizeCampaignBudget.json().message || resauthorizeCampaignBudget.json(),
          )
        }
        expect(resauthorizeCampaignBudget.statusCode).toBe(201)
        await validateResponse('authorizeCampaignBudget', 201, resauthorizeCampaignBudget.json())
      }
    } catch (e: any) {
      errors.push(new Error('authorizeCampaignBudget failed: ' + e.message))
    }
    // Skipped createDeployment because payload could not be generated

    // pushDeployment

    // pushDeployment - auth check
    try {
      if (!'/deployments/{deploymentId}/push'.includes('{') || createdIds['deployments']) {
        const respushDeploymentAuth = await app.inject({
          method: 'POST',
          url: `/deployments/${createdIds['deployments'] || '00000000-0000-0000-0000-000000000001'}/push`,
        })
        expect(respushDeploymentAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('pushDeployment auth failed: ' + e.message))
    }

    try {
      if (!'/deployments/{deploymentId}/push'.includes('{') || createdIds['deployments']) {
        const respushDeployment = await app.inject({
          method: 'POST',
          url: `/deployments/${createdIds['deployments'] || '00000000-0000-0000-0000-000000000001'}/push`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (respushDeployment.statusCode === 201 && respushDeployment.json().data?.id)
          createdIds['deployments'] = respushDeployment.json().data.id
        if (respushDeployment.statusCode !== 200) {
          console.error(
            'pushDeployment failed with ' + respushDeployment.statusCode,
            respushDeployment.json().message || respushDeployment.json(),
          )
        }
        expect(respushDeployment.statusCode).toBe(200)
        await validateResponse('pushDeployment', 200, respushDeployment.json())
      }
    } catch (e: any) {
      errors.push(new Error('pushDeployment failed: ' + e.message))
    }

    // listCampaigns

    // listCampaigns - auth check
    try {
      if (!'/campaigns'.includes('{') || createdIds['campaigns']) {
        const reslistCampaignsAuth = await app.inject({ method: 'GET', url: `/campaigns` })
        expect(reslistCampaignsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listCampaigns auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns'.includes('{') || createdIds['campaigns']) {
        const reslistCampaigns = await app.inject({
          method: 'GET',
          url: `/campaigns`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistCampaigns.statusCode !== 200) {
          console.error(
            'listCampaigns failed with ' + reslistCampaigns.statusCode,
            reslistCampaigns.json().message || reslistCampaigns.json(),
          )
        }
        expect(reslistCampaigns.statusCode).toBe(200)
        await validateResponse('listCampaigns', 200, reslistCampaigns.json())
      }
    } catch (e: any) {
      errors.push(new Error('listCampaigns failed: ' + e.message))
    }

    // getCampaign

    // getCampaign - auth check
    try {
      if (!'/campaigns/{campaignId}'.includes('{') || createdIds['campaigns']) {
        const resgetCampaignAuth = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetCampaignAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getCampaign auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}'.includes('{') || createdIds['campaigns']) {
        const resgetCampaign = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetCampaign.statusCode !== 200) {
          console.error(
            'getCampaign failed with ' + resgetCampaign.statusCode,
            resgetCampaign.json().message || resgetCampaign.json(),
          )
        }
        expect(resgetCampaign.statusCode).toBe(200)
        await validateResponse('getCampaign', 200, resgetCampaign.json())
      }
    } catch (e: any) {
      errors.push(new Error('getCampaign failed: ' + e.message))
    }

    // getCampaignPerformance

    // getCampaignPerformance - auth check
    try {
      if (!'/campaigns/{campaignId}/performance'.includes('{') || createdIds['campaigns']) {
        const resgetCampaignPerformanceAuth = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/performance`,
        })
        expect(resgetCampaignPerformanceAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getCampaignPerformance auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}/performance'.includes('{') || createdIds['campaigns']) {
        const resgetCampaignPerformance = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/performance`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetCampaignPerformance.statusCode !== 200) {
          console.error(
            'getCampaignPerformance failed with ' + resgetCampaignPerformance.statusCode,
            resgetCampaignPerformance.json().message || resgetCampaignPerformance.json(),
          )
        }
        expect(resgetCampaignPerformance.statusCode).toBe(200)
        await validateResponse('getCampaignPerformance', 200, resgetCampaignPerformance.json())
      }
    } catch (e: any) {
      errors.push(new Error('getCampaignPerformance failed: ' + e.message))
    }

    // getCampaignFunding

    // getCampaignFunding - auth check
    try {
      if (!'/campaigns/{campaignId}/funding'.includes('{') || createdIds['campaigns']) {
        const resgetCampaignFundingAuth = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/funding`,
        })
        expect(resgetCampaignFundingAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getCampaignFunding auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}/funding'.includes('{') || createdIds['campaigns']) {
        const resgetCampaignFunding = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/funding`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetCampaignFunding.statusCode !== 200) {
          console.error(
            'getCampaignFunding failed with ' + resgetCampaignFunding.statusCode,
            resgetCampaignFunding.json().message || resgetCampaignFunding.json(),
          )
        }
        expect(resgetCampaignFunding.statusCode).toBe(200)
        await validateResponse('getCampaignFunding', 200, resgetCampaignFunding.json())
      }
    } catch (e: any) {
      errors.push(new Error('getCampaignFunding failed: ' + e.message))
    }

    // listCampaignLeads

    // listCampaignLeads - auth check
    try {
      if (!'/campaigns/{campaignId}/leads'.includes('{') || createdIds['campaigns']) {
        const reslistCampaignLeadsAuth = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/leads`,
        })
        expect(reslistCampaignLeadsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listCampaignLeads auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}/leads'.includes('{') || createdIds['campaigns']) {
        const reslistCampaignLeads = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/leads`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistCampaignLeads.statusCode !== 200) {
          console.error(
            'listCampaignLeads failed with ' + reslistCampaignLeads.statusCode,
            reslistCampaignLeads.json().message || reslistCampaignLeads.json(),
          )
        }
        expect(reslistCampaignLeads.statusCode).toBe(200)
        await validateResponse('listCampaignLeads', 200, reslistCampaignLeads.json())
      }
    } catch (e: any) {
      errors.push(new Error('listCampaignLeads failed: ' + e.message))
    }

    // listDeployments

    // listDeployments - auth check
    try {
      if (!'/campaigns/{campaignId}/deployments'.includes('{') || createdIds['campaigns']) {
        const reslistDeploymentsAuth = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/deployments`,
        })
        expect(reslistDeploymentsAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('listDeployments auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}/deployments'.includes('{') || createdIds['campaigns']) {
        const reslistDeployments = await app.inject({
          method: 'GET',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}/deployments`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (reslistDeployments.statusCode !== 200) {
          console.error(
            'listDeployments failed with ' + reslistDeployments.statusCode,
            reslistDeployments.json().message || reslistDeployments.json(),
          )
        }
        expect(reslistDeployments.statusCode).toBe(200)
        await validateResponse('listDeployments', 200, reslistDeployments.json())
      }
    } catch (e: any) {
      errors.push(new Error('listDeployments failed: ' + e.message))
    }

    // getDeployment

    // getDeployment - auth check
    try {
      if (!'/deployments/{deploymentId}'.includes('{') || createdIds['deployments']) {
        const resgetDeploymentAuth = await app.inject({
          method: 'GET',
          url: `/deployments/${createdIds['deployments'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resgetDeploymentAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('getDeployment auth failed: ' + e.message))
    }

    try {
      if (!'/deployments/{deploymentId}'.includes('{') || createdIds['deployments']) {
        const resgetDeployment = await app.inject({
          method: 'GET',
          url: `/deployments/${createdIds['deployments'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          // payload: {},
        })
        if (resgetDeployment.statusCode !== 200) {
          console.error(
            'getDeployment failed with ' + resgetDeployment.statusCode,
            resgetDeployment.json().message || resgetDeployment.json(),
          )
        }
        expect(resgetDeployment.statusCode).toBe(200)
        await validateResponse('getDeployment', 200, resgetDeployment.json())
      }
    } catch (e: any) {
      errors.push(new Error('getDeployment failed: ' + e.message))
    }

    // updateCampaign

    // updateCampaign - auth check
    try {
      if (!'/campaigns/{campaignId}'.includes('{') || createdIds['campaigns']) {
        const resupdateCampaignAuth = await app.inject({
          method: 'PATCH',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateCampaignAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateCampaign auth failed: ' + e.message))
    }

    try {
      if (!'/campaigns/{campaignId}'.includes('{') || createdIds['campaigns']) {
        const resupdateCampaign = await app.inject({
          method: 'PATCH',
          url: `/campaigns/${createdIds['campaigns'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateCampaign.statusCode !== 200) {
          console.error(
            'updateCampaign failed with ' + resupdateCampaign.statusCode,
            resupdateCampaign.json().message || resupdateCampaign.json(),
          )
        }
        expect(resupdateCampaign.statusCode).toBe(200)
        await validateResponse('updateCampaign', 200, resupdateCampaign.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateCampaign failed: ' + e.message))
    }

    // updateDeployment

    // updateDeployment - auth check
    try {
      if (!'/deployments/{deploymentId}'.includes('{') || createdIds['deployments']) {
        const resupdateDeploymentAuth = await app.inject({
          method: 'PATCH',
          url: `/deployments/${createdIds['deployments'] || '00000000-0000-0000-0000-000000000001'}`,
        })
        expect(resupdateDeploymentAuth.statusCode).toBe(401)
      }
    } catch (e: any) {
      errors.push(new Error('updateDeployment auth failed: ' + e.message))
    }

    try {
      if (!'/deployments/{deploymentId}'.includes('{') || createdIds['deployments']) {
        const resupdateDeployment = await app.inject({
          method: 'PATCH',
          url: `/deployments/${createdIds['deployments'] || '00000000-0000-0000-0000-000000000001'}`,
          headers: asAuth(testUserId),
          payload: {},
        })
        if (resupdateDeployment.statusCode !== 200) {
          console.error(
            'updateDeployment failed with ' + resupdateDeployment.statusCode,
            resupdateDeployment.json().message || resupdateDeployment.json(),
          )
        }
        expect(resupdateDeployment.statusCode).toBe(200)
        await validateResponse('updateDeployment', 200, resupdateDeployment.json())
      }
    } catch (e: any) {
      errors.push(new Error('updateDeployment failed: ' + e.message))
    }
    if (errors.length > 0) {
      throw new Error('Lifecycle failed:\n' + errors.map((e) => e.message).join('\n'))
    }
  })
})
