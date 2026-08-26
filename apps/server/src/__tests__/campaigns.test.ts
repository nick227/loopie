// Generated from openapi.yaml — fill in seeds and assertions.
// Run `pnpm test:generate` to add stubs for new routes.
// Both test users are pre-seeded: use testOtherUserId for cross-user permission tests.
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, validateResponse, testUserId, testOtherUserId } from './helpers'

const app = buildTestApp()

describe('listCampaigns', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/campaigns' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /campaigns', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/campaigns',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listCampaigns', 200, res.json())
  })
})

describe('createCampaign', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/campaigns' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /campaigns', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createCampaign', 201, res.json())
  })
})

describe('getCampaign', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/campaigns/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /campaigns/{campaignId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/campaigns/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getCampaign', 200, res.json())
  })
})

describe('updateCampaign', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/campaigns/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /campaigns/{campaignId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/campaigns/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateCampaign', 200, res.json())
  })
})

describe('pauseCampaign', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/campaigns/00000000-0000-0000-0000-000000000001/pause' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /campaigns/{campaignId}/pause', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/pause',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('pauseCampaign', 200, res.json())
  })
})

describe('resumeCampaign', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/campaigns/00000000-0000-0000-0000-000000000001/resume' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /campaigns/{campaignId}/resume', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/resume',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('resumeCampaign', 200, res.json())
  })
})

describe('endCampaign', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/campaigns/00000000-0000-0000-0000-000000000001/end' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /campaigns/{campaignId}/end', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/end',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('endCampaign', 200, res.json())
  })
})

describe('duplicateCampaign', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/campaigns/00000000-0000-0000-0000-000000000001/duplicate' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /campaigns/{campaignId}/duplicate', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/duplicate',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('duplicateCampaign', 201, res.json())
  })
})

describe('getCampaignPerformance', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/campaigns/00000000-0000-0000-0000-000000000001/performance' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /campaigns/{campaignId}/performance', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/performance',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getCampaignPerformance', 200, res.json())
  })
})

describe('listDeployments', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/campaigns/00000000-0000-0000-0000-000000000001/deployments' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /campaigns/{campaignId}/deployments', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/deployments',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listDeployments', 200, res.json())
  })
})

describe('createDeployment', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/campaigns/00000000-0000-0000-0000-000000000001/deployments' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /campaigns/{campaignId}/deployments', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/deployments',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('createDeployment', 201, res.json())
  })
})

describe('updateDeployment', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/deployments/00000000-0000-0000-0000-000000000001' })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /deployments/{deploymentId}', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'PATCH',
      url: '/deployments/00000000-0000-0000-0000-000000000001',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('updateDeployment', 200, res.json())
  })
})

describe('authorizeCampaignBudget', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/campaigns/00000000-0000-0000-0000-000000000001/budget-authorizations' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /campaigns/{campaignId}/budget-authorizations', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/budget-authorizations',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(201)
    await validateResponse('authorizeCampaignBudget', 201, res.json())
  })
})

describe('getCampaignFunding', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/campaigns/00000000-0000-0000-0000-000000000001/funding' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /campaigns/{campaignId}/funding', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/funding',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('getCampaignFunding', 200, res.json())
  })
})

describe('listCampaignLeads', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/campaigns/00000000-0000-0000-0000-000000000001/leads' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /campaigns/{campaignId}/leads', async () => {
    // TODO: seed domain data (test users are pre-seeded by buildTestApp)
    const res = await app.inject({
      method: 'GET',
      url: '/campaigns/00000000-0000-0000-0000-000000000001/leads',
      headers: asAuth(testUserId),
      // payload: {},
    })
    expect(res.statusCode).toBe(200)
    await validateResponse('listCampaignLeads', 200, res.json())
  })
})
