import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
import { db } from '@project/db'

const app = buildTestApp()

async function seedAttributedLead() {
  const contact = await db.contact.create({
    data: { businessId: testBusinessId, name: 'Jordan Hale', email: `jordan-${Date.now()}@example.com` },
  })
  const creative = await db.creative.create({
    data: { businessId: testBusinessId, name: 'Raw Stories Creative' },
  })
  const campaign = await db.campaign.create({
    data: {
      businessId: testBusinessId,
      name: 'Stories Campaign',
      budget: 500,
      startDate: new Date(),
      platforms: ['META'],
      creativeLinks: { create: [{ creativeId: creative.id }] },
    },
  })
  const otherCampaign = await db.campaign.create({
    data: {
      businessId: testBusinessId,
      name: 'Other Campaign',
      budget: 100,
      startDate: new Date(),
      platforms: ['GOOGLE'],
      creativeLinks: { create: [{ creativeId: creative.id }] },
    },
  })
  const deployment = await db.deployment.create({
    data: { campaignId: campaign.id, creativeId: creative.id, platform: 'META', status: 'ACTIVE' },
  })
  const lead = await db.lead.create({
    data: {
      businessId: testBusinessId,
      contactId: contact.id,
      stage: 'QUALIFIED',
      estimatedValue: 850,
      sourceType: 'DEPLOYMENT',
      sourceDeploymentId: deployment.id,
      openSlot: 'OPEN',
    },
  })
  await db.interaction.create({
    data: { businessId: testBusinessId, contactId: contact.id, type: 'FORM_SUBMITTED' },
  })
  await db.sale.create({
    data: {
      businessId: testBusinessId,
      contactId: contact.id,
      leadId: lead.id,
      amount: 400,
      date: new Date(),
      sourceType: 'DEPLOYMENT',
      sourceDeploymentId: deployment.id,
    },
  })
  return { campaign, otherCampaign, contact }
}

describe('listCampaignLeads', () => {
  it('returns campaign-attributed outcomes and excludes other campaigns', async () => {
    const { campaign, otherCampaign, contact } = await seedAttributedLead()

    const res = await app.inject({
      method: 'GET',
      url: `/campaigns/${campaign.id}/leads`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].contactName).toBe('Jordan Hale')
    expect(body.data[0].contactId).toBe(contact.id)
    expect(body.data[0].stage).toBe('QUALIFIED')
    expect(body.data[0].sourceType).toBe('DEPLOYMENT')
    expect(body.data[0].platform).toBe('META')
    expect(body.data[0].sourceLabel).toContain('META')
    expect(body.data[0].attributedValue).toBe(400)
    expect(body.data[0].lastInteractionType).toBe('FORM_SUBMITTED')
    expect(body.data[0].followUpStatus).toBe('NONE')

    const other = await app.inject({
      method: 'GET',
      url: `/campaigns/${otherCampaign.id}/leads`,
      headers: asAuth(testUserId),
    })
    expect(other.statusCode).toBe(200)
    expect(other.json().data).toHaveLength(0)
  })

  it('does not leak another tenant campaign', async () => {
    const { campaign } = await seedAttributedLead()
    const res = await app.inject({
      method: 'GET',
      url: `/campaigns/${campaign.id}/leads`,
      headers: asAuth(testOtherUserId),
    })
    expect(res.statusCode).toBe(404)
  })
})
