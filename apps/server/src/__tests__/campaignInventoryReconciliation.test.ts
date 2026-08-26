// Filled-in integration test (not a generated stub) for campaign inventory reconciliation:
// updating a campaign's creatives/platforms must deterministically create, revive, or retire
// Deployment/AdUnit rows — never leave stale live inventory attached, and never hard-delete a
// row (attribution history references it).
import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function createCampaign(platforms: string[], creativeIds: string[]) {
  const res = await app.inject({
    method: 'POST',
    url: '/campaigns',
    headers: asAuth(testUserId),
    payload: {
      name: 'Reconciliation Campaign',
      budget: 1000,
      startDate: new Date().toISOString(),
      destinationUrl: 'https://example.com',
      platforms,
      creativeIds,
    },
  })
  expect(res.statusCode).toBe(201)
  return res.json().data
}

async function updateCampaign(campaignId: string, body: Record<string, unknown>) {
  return app.inject({
    method: 'PATCH',
    url: `/campaigns/${campaignId}`,
    headers: asAuth(testUserId),
    payload: body,
  })
}

describe('campaign inventory reconciliation', () => {
  it('retires (never deletes) Deployment/AdUnit rows for combos dropped from creatives/platforms', async () => {
    const creativeA = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Creative A' },
    })
    const creativeB = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Creative B' },
    })

    const campaign = await createCampaign(['META', 'LOOPIE'], [creativeA.id, creativeB.id])

    const initialDeployments = await db.deployment.findMany({ where: { campaignId: campaign.id } })
    const initialAdUnits = await db.adUnit.findMany({ where: { campaignId: campaign.id } })
    expect(initialDeployments).toHaveLength(2) // META x {A, B}
    expect(initialAdUnits).toHaveLength(2) // LOOPIE x {A, B}
    expect(initialDeployments.every((d) => d.status === 'PENDING')).toBe(true)
    expect(initialAdUnits.every((a) => a.status === 'DRAFT')).toBe(true)

    // Simulate the campaign actually running before it's edited.
    await db.deployment.updateMany({
      where: { campaignId: campaign.id },
      data: { status: 'ACTIVE' },
    })
    await db.adUnit.updateMany({ where: { campaignId: campaign.id }, data: { status: 'ACTIVE' } })

    // Drop Creative B and the LOOPIE platform entirely.
    const updateRes = await updateCampaign(campaign.id, {
      creativeIds: [creativeA.id],
      platforms: ['META'],
    })
    expect(updateRes.statusCode).toBe(200)

    const deploymentsAfter = await db.deployment.findMany({ where: { campaignId: campaign.id } })
    const adUnitsAfter = await db.adUnit.findMany({ where: { campaignId: campaign.id } })

    // Nothing was deleted.
    expect(deploymentsAfter).toHaveLength(2)
    expect(adUnitsAfter).toHaveLength(2)

    // Creative A's META deployment is untouched (still desired, still ACTIVE).
    const survivingDeployment = deploymentsAfter.find((d) => d.creativeId === creativeA.id)!
    expect(survivingDeployment.status).toBe('ACTIVE')

    // Creative B's META deployment and both LOOPIE ad units are retired, not left live.
    const retiredDeployment = deploymentsAfter.find((d) => d.creativeId === creativeB.id)!
    expect(retiredDeployment.status).toBe('ENDED')
    expect(adUnitsAfter.every((a) => a.status === 'ENDED')).toBe(true)
  })

  it('revives a retired combo instead of creating a duplicate row when it is re-added', async () => {
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Creative C' },
    })
    const campaign = await createCampaign(['META'], [creative.id])

    const original = (await db.deployment.findMany({ where: { campaignId: campaign.id } }))[0]!
    expect(original.status).toBe('PENDING')

    // platforms can't be cleared to empty (minItems: 1 — use POST /campaigns/{id}/end instead).
    const emptyPlatformsRes = await updateCampaign(campaign.id, { platforms: [] })
    expect(emptyPlatformsRes.statusCode).toBe(400)

    // Removing all creatives, though, is a valid way to retire every combo without ending the campaign.
    const removeRes = await updateCampaign(campaign.id, { creativeIds: [] })
    expect(removeRes.statusCode).toBe(200)

    const afterRemoval = await db.deployment.findMany({ where: { campaignId: campaign.id } })
    expect(afterRemoval).toHaveLength(1)
    expect(afterRemoval[0]!.status).toBe('ENDED')

    const readdRes = await updateCampaign(campaign.id, { creativeIds: [creative.id] })
    expect(readdRes.statusCode).toBe(200)

    const afterReadd = await db.deployment.findMany({ where: { campaignId: campaign.id } })
    expect(afterReadd).toHaveLength(1) // revived, not duplicated
    expect(afterReadd[0]!.id).toBe(original.id)
    expect(afterReadd[0]!.status).toBe('PENDING')
  })

  it('a platforms-only update reconciles against the unchanged creative list', async () => {
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Creative D' },
    })
    const campaign = await createCampaign(['META'], [creative.id])

    const res = await updateCampaign(campaign.id, { platforms: ['META', 'LOOPIE'] })
    expect(res.statusCode).toBe(200)

    const adUnits = await db.adUnit.findMany({ where: { campaignId: campaign.id } })
    expect(adUnits).toHaveLength(1)
    expect(adUnits[0]!.creativeId).toBe(creative.id)
  })
})
