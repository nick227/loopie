import { describe, it, expect } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId, testOtherBusinessId } from './helpers'
import { db, issueSid } from '@project/db'

const app = buildTestApp()

function visitorSid() {
  return issueSid().token
}

async function publishedPage(
  fields: Array<{ label: string; fieldKey: string; type: string; required: boolean }>,
) {
  const template = await db.landingPageTemplate.create({
    data: { name: 'Harden Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: { name: 'Harden form', fields },
  })
  expect(formRes.statusCode).toBe(201)
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'Harden Page',
      slug: `harden-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      formId: formRes.json().data.id,
    },
  })
  expect(pageRes.statusCode).toBe(201)
  const page = pageRes.json().data
  const publishRes = await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/publish`,
    headers: asAuth(testUserId),
  })
  expect(publishRes.statusCode).toBe(201)
  return page
}

describe('backend hardening', () => {
  it('reuses the same Contact and open Lead across concurrent-looking resubmits', async () => {
    const page = await publishedPage([
      { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true },
    ])

    const first = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: visitorSid(), data: { email: 'Same.Person@example.com' } },
    })
    const second = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: visitorSid(), data: { email: 'same.person@example.com' } },
    })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
    expect(second.json().data.contactId).toBe(first.json().data.contactId)
    expect(second.json().data.leadId).toBe(first.json().data.leadId)

    const leads = await db.lead.findMany({ where: { businessId: testBusinessId } })
    expect(leads).toHaveLength(1)
    const contacts = await db.contact.findMany({
      where: { businessId: testBusinessId, email: 'same.person@example.com' },
    })
    expect(contacts).toHaveLength(1)
  })

  it('rejects audience members that belong to another business', async () => {
    const foreign = await db.contact.create({
      data: { businessId: testOtherBusinessId, name: 'Bob', email: 'bob-foreign@example.com' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/audiences',
      headers: asAuth(testUserId),
      payload: { name: 'Stolen list', type: 'MANUAL_LIST', contactIds: [foreign.id] },
    })
    expect(res.statusCode).toBe(404)
  })

  it('rejects a campaign that references another business creative', async () => {
    const foreignCreative = await db.creative.create({
      data: { businessId: testOtherBusinessId, name: 'Not yours' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns',
      headers: asAuth(testUserId),
      payload: {
        name: 'Bad campaign',
        budget: 10,
        startDate: new Date().toISOString(),
        platforms: ['META'],
        creativeIds: [foreignCreative.id],
      },
    })
    expect(res.statusCode).toBe(404)
  })

  it('does not serve or accept submissions on a deleted page', async () => {
    const page = await publishedPage([
      { label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true },
    ])
    await app.inject({
      method: 'DELETE',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
    })

    const serve = await app.inject({ method: 'GET', url: `/p/${page.slug}` })
    expect(serve.statusCode).toBe(404)

    const submit = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: visitorSid(), data: { email: 'gone@example.com' } },
    })
    expect(submit.statusCode).toBe(404)
  })

  it('rejects unpublished form submits and missing required fields', async () => {
    const template = await db.landingPageTemplate.create({
      data: { name: 'Draft Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
    })
    const formRes = await app.inject({
      method: 'POST',
      url: '/forms',
      headers: asAuth(testUserId),
      payload: {
        name: 'Required form',
        fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true }],
      },
    })
    const pageRes = await app.inject({
      method: 'POST',
      url: '/landing-pages',
      headers: asAuth(testUserId),
      payload: {
        templateId: template.id,
        name: 'Draft Page',
        slug: `draft-${Date.now()}`,
        formId: formRes.json().data.id,
      },
    })
    const page = pageRes.json().data

    const unpublished = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: visitorSid(), data: { email: 'early@example.com' } },
    })
    expect(unpublished.statusCode).toBe(404)

    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/publish`,
      headers: asAuth(testUserId),
    })
    const missing = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: visitorSid(), data: {} },
    })
    expect(missing.statusCode).toBe(400)
  })

  it('copies sourceAdUnitId onto the Sale when a first-party ad lead converts', async () => {
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Loopie creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Loopie campaign',
        budget: 50,
        startDate: new Date(),
        platforms: ['LOOPIE'],
      },
    })
    const adUnit = await db.adUnit.create({
      data: {
        businessId: testBusinessId,
        campaignId: campaign.id,
        creativeId: creative.id,
        format: 'NATIVE',
        status: 'ACTIVE',
      },
    })
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Ada', email: 'ada-adunit@example.com' },
    })
    const lead = await db.lead.create({
      data: {
        businessId: testBusinessId,
        contactId: contact.id,
        sourceType: 'AD_UNIT',
        sourceAdUnitId: adUnit.id,
        openSlot: 'OPEN',
      },
    })

    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: contact.id,
        leadId: lead.id,
        amount: 120,
        date: new Date().toISOString(),
        idempotencyKey: 'hardening-sale-1',
      },
    })
    expect(saleRes.statusCode).toBe(201)
    expect(saleRes.json().data.sourceType).toBe('AD_UNIT')
    expect(saleRes.json().data.sourceAdUnitId).toBe(adUnit.id)

    const stored = await db.sale.findUniqueOrThrow({ where: { id: saleRes.json().data.id } })
    expect(stored.sourceAdUnitId).toBe(adUnit.id)
  })

  it('creates AdUnits instead of Deployments when a campaign includes LOOPIE', async () => {
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Inventory creative' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/campaigns',
      headers: asAuth(testUserId),
      payload: {
        name: 'Mixed inventory',
        budget: 200,
        startDate: new Date().toISOString(),
        platforms: ['META', 'LOOPIE'],
        creativeIds: [creative.id],
      },
    })
    expect(res.statusCode).toBe(201)
    const campaignId = res.json().data.id

    const deployments = await db.deployment.findMany({ where: { campaignId } })
    const adUnits = await db.adUnit.findMany({ where: { campaignId } })
    expect(deployments).toHaveLength(1)
    expect(deployments[0]?.platform).toBe('META')
    expect(adUnits).toHaveLength(1)
    expect(adUnits[0]?.format).toBe('DISPLAY_BANNER')
  })

  it('does not record clicks on a paused deployment', async () => {
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Paused creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Paused campaign',
        budget: 10,
        startDate: new Date(),
        destinationUrl: 'https://example.com',
        platforms: ['META'],
      },
    })
    const deployment = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creative.id,
        platform: 'META',
        status: 'PAUSED',
      },
    })
    const click = await app.inject({ method: 'GET', url: `/r/${deployment.id}` })
    expect(click.statusCode).toBe(404)
  })
})
