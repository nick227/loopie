// Filled-in integration test (not a generated stub) for closing the deployment contract gap:
// GET /deployments/{deploymentId} previously didn't exist at all — apps/web's UpdateDeploymentPage
// had to render with an empty form because there was no way to fetch a single deployment by id
// without also knowing its campaignId. See CLAUDE.md "Deployment Contract Gap".
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function seedDeployment() {
  const creative = await db.creative.create({
    data: { businessId: testBusinessId, name: 'Deployment Creative' },
  })
  const campaign = await db.campaign.create({
    data: {
      businessId: testBusinessId,
      name: 'Deployment Campaign',
      budget: 100,
      startDate: new Date(),
      platforms: ['META'],
      creativeLinks: { create: [{ creativeId: creative.id }] },
    },
  })
  const deployment = await db.deployment.create({
    data: {
      campaignId: campaign.id,
      creativeId: creative.id,
      platform: 'META',
      status: 'ACTIVE',
      spend: 42.5,
    },
  })
  return deployment
}

describe('getDeployment', () => {
  it('returns a deployment by id, standalone from its campaign', async () => {
    const deployment = await seedDeployment()

    const res = await app.inject({
      method: 'GET',
      url: `/deployments/${deployment.id}`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(data.id).toBe(deployment.id)
    expect(data.platform).toBe('META')
    expect(data.spend).toBe(42.5)
  })

  it('404s for a deployment belonging to another business', async () => {
    const deployment = await seedDeployment()

    const res = await app.inject({
      method: 'GET',
      url: `/deployments/${deployment.id}`,
      headers: asAuth(testOtherUserId),
    })
    expect(res.statusCode).toBe(404)
  })

  it('404s for a nonexistent deployment id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/deployments/00000000-0000-0000-0000-000000000099',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(404)
  })
})
