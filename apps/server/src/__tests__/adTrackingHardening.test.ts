// Regression coverage for the ad-tracking hardening pass (code review, 2026-08-26): platform
// click-id capture, deterministic first-touch session attribution, ended campaigns/deleted
// creatives can't keep serving, and the full acquisition-to-revenue chain stays traceable end to
// end. See CLAUDE.md for the six-item fix list this covers.
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db, issueSid, verifySid } from '@project/db'

const app = buildTestApp()

async function createTemplateAndForm() {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Regression Template',
      isSystem: true,
      schema: {
        sections: [{ key: 'form', type: 'form-embed', order: 0, hideable: false, editable: [] }],
        themeTokens: [],
      },
    },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: 'Regression form',
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
    },
  })
  return { template, formId: formRes.json().data.id }
}

async function createPublishedPage(templateId: string, formId: string) {
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId,
      name: 'Regression Page',
      slug: `regression-page-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      formId,
    },
  })
  const page = pageRes.json().data
  await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/publish`,
    headers: asAuth(testUserId),
  })
  return page
}

describe('ad tracking hardening: full chain traceability', () => {
  it('campaign -> creative -> deployment -> click(+platform click id) -> landing page -> lead -> sale rolls up to campaign/creative/platform, then end() stops further tracking', async () => {
    const { template, formId } = await createTemplateAndForm()
    const page = await createPublishedPage(template.id, formId)

    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Regression Creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Regression Campaign',
        budget: 250,
        startDate: new Date(),
        destinationUrl: 'https://fallback.example.com',
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
        destinationLandingPageId: page.id,
        spend: 42.5,
      },
    })

    // Click carries the originating platform's own click id through.
    const clickRes = await app.inject({
      method: 'GET',
      url: `/r/${deployment.id}?click_id=fb.1.999.abc123`,
    })
    expect(clickRes.statusCode).toBe(302)
    expect(clickRes.headers['cache-control']).toBe('no-store')
    const sid = new URL(clickRes.headers.location as string).searchParams.get('sid')!
    const event = await db.attributionEvent.findFirstOrThrow({
      where: { deploymentId: deployment.id },
    })
    expect(event.clickId).toBe('fb.1.999.abc123')
    expect(verifySid(sid)?.sessionId).toBe(event.sessionId)

    // Landing page -> form submit -> Contact + Lead, attribution preserved end to end.
    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: sid,
        idempotencyKey: randomUUID(),
        data: { email: 'regression@example.com' },
      },
    })
    expect(submitRes.statusCode).toBe(201)
    const { contactId, leadId } = submitRes.json().data

    const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } })
    expect(lead.sourceType).toBe('DEPLOYMENT')
    expect(lead.sourceDeploymentId).toBe(deployment.id)
    expect(lead.clickId).toBe('fb.1.999.abc123')

    // Lead -> Sale, revenue rolls up to campaign / creative / platform performance.
    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId,
        leadId,
        amount: 500,
        date: new Date().toISOString(),
        idempotencyKey: 'ad-tracking-sale-1',
      },
    })
    expect(saleRes.statusCode).toBe(201)

    const perfRes = await app.inject({
      method: 'GET',
      url: `/campaigns/${campaign.id}/performance`,
      headers: asAuth(testUserId),
    })
    expect(perfRes.statusCode).toBe(200)
    const performance = perfRes.json().data
    expect(performance.leads).toBe(1)
    expect(performance.sales).toBe(1)
    expect(performance.revenue).toBe(500)
    const creativeRow = performance.byCreative.find((c: any) => c.creativeId === creative.id)
    expect(creativeRow.sales).toBe(1)
    const platformRow = performance.byPlatform.find((p: any) => p.platform === 'META')
    expect(platformRow.sales).toBe(1)

    // Ending the campaign must stop further serving/tracking, not just flip a status flag nobody
    // checks — a second click after end() must not create another AttributionEvent or redirect.
    const endRes = await app.inject({
      method: 'POST',
      url: `/campaigns/${campaign.id}/end`,
      headers: asAuth(testUserId),
    })
    expect(endRes.statusCode).toBe(200)

    const eventCountBefore = await db.attributionEvent.count({
      where: { deploymentId: deployment.id },
    })
    const clickAfterEnd = await app.inject({ method: 'GET', url: `/r/${deployment.id}` })
    expect(clickAfterEnd.statusCode).toBe(404)
    const eventCountAfter = await db.attributionEvent.count({
      where: { deploymentId: deployment.id },
    })
    expect(eventCountAfter).toBe(eventCountBefore)
  })

  it('first-touch across two separate campaigns: campaign A gets the conversion/revenue, campaign B keeps its click but no credit', async () => {
    const { template, formId } = await createTemplateAndForm()
    const page = await createPublishedPage(template.id, formId)

    const creativeA = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Creative A' },
    })
    const creativeB = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Creative B' },
    })
    const campaignA = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Campaign A',
        budget: 100,
        startDate: new Date(),
        platforms: ['META'],
        creativeLinks: { create: [{ creativeId: creativeA.id }] },
      },
    })
    const campaignB = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Campaign B',
        budget: 100,
        startDate: new Date(),
        platforms: ['GOOGLE'],
        creativeLinks: { create: [{ creativeId: creativeB.id }] },
      },
    })
    const deploymentA = await db.deployment.create({
      data: {
        campaignId: campaignA.id,
        creativeId: creativeA.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })
    const deploymentB = await db.deployment.create({
      data: {
        campaignId: campaignB.id,
        creativeId: creativeB.id,
        platform: 'GOOGLE',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })

    // Click A, then click B in the same still-open session, before ever converting.
    const clickA = await app.inject({ method: 'GET', url: `/r/${deploymentA.id}?click_id=A1` })
    const sid = new URL(clickA.headers.location as string).searchParams.get('sid')!
    const clickB = await app.inject({
      method: 'GET',
      url: `/r/${deploymentB.id}?sid=${sid}&click_id=B1`,
    })
    expect(clickB.statusCode).toBe(302)

    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: sid,
        idempotencyKey: randomUUID(),
        data: { email: 'multitouch@example.com' },
      },
    })
    expect(submitRes.statusCode).toBe(201)
    const { contactId, leadId } = submitRes.json().data

    const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } })
    expect(lead.sourceDeploymentId).toBe(deploymentA.id)
    expect(lead.clickId).toBe('A1')

    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId,
        leadId,
        amount: 300,
        date: new Date().toISOString(),
        idempotencyKey: 'ad-tracking-sale-2',
      },
    })
    expect(saleRes.statusCode).toBe(201)

    const perfA = (
      await app.inject({
        method: 'GET',
        url: `/campaigns/${campaignA.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    expect(perfA.sales).toBe(1)
    expect(perfA.revenue).toBe(300)

    const perfB = (
      await app.inject({
        method: 'GET',
        url: `/campaigns/${campaignB.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data
    // Campaign B's click was real and recorded (clicks/views > 0), it just earned no conversion
    // credit — the session's first touch (A) keeps the credit, not the most recent click.
    expect(perfB.clicks).toBe(1)
    expect(perfB.sales).toBe(0)
    expect(perfB.revenue).toBe(0)

    const eventB = await db.attributionEvent.findFirstOrThrow({
      where: { deploymentId: deploymentB.id },
    })
    expect(eventB.clickId).toBe('B1')
  })

  it('session boundary: a fresh session clicking B is attributed to B, not to a different session’s earlier click on A', async () => {
    const { template, formId } = await createTemplateAndForm()
    const page = await createPublishedPage(template.id, formId)

    const creativeA = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Boundary Creative A' },
    })
    const creativeB = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Boundary Creative B' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Session Boundary Campaign',
        budget: 100,
        startDate: new Date(),
        platforms: ['META'],
        creativeLinks: { create: [{ creativeId: creativeA.id }, { creativeId: creativeB.id }] },
      },
    })
    const deploymentA = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creativeA.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })
    const deploymentB = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creativeB.id,
        platform: 'META',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })

    // Session 1 clicks A and never converts.
    await app.inject({ method: 'GET', url: `/r/${deploymentA.id}` })

    // A completely separate visitor (fresh session) clicks B.
    const clickB = await app.inject({ method: 'GET', url: `/r/${deploymentB.id}` })
    const sidB = new URL(clickB.headers.location as string).searchParams.get('sid')!

    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: {
        sessionId: sidB,
        idempotencyKey: randomUUID(),
        data: { email: 'freshsession@example.com' },
      },
    })
    expect(submitRes.statusCode).toBe(201)
    const lead = await db.lead.findUniqueOrThrow({ where: { id: submitRes.json().data.leadId } })
    expect(lead.sourceDeploymentId).toBe(deploymentB.id)
  })

  it('a campaign past its endDate stops accepting tracked clicks even if nobody called end()', async () => {
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Expired Creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Expired Campaign',
        budget: 50,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        destinationUrl: 'https://fallback.example.com',
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
      },
    })

    const clickRes = await app.inject({ method: 'GET', url: `/r/${deployment.id}` })
    expect(clickRes.statusCode).toBe(404)
    const eventCount = await db.attributionEvent.count({ where: { deploymentId: deployment.id } })
    expect(eventCount).toBe(0)
  })
})
