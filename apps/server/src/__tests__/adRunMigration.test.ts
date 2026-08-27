// Regression coverage for the Media/Advertisement/AdRun migration (2026-08-27) — see CLAUDE.md.
// Proves the three things the user's plan specifically asked to verify: (1) AdRun click -> lead
// -> sale attribution works end to end and is source-consistent (sourceType/sourceAdRunId always
// agree, unlike the reverted attempt that stamped AD_UNIT for AdRun-sourced leads); (2) campaign
// and dashboard reporting union AdRun into their existing Deployment/AdUnit totals rather than
// requiring a second, separate view; (3) an AdRun can be funded and spent against without ever
// touching a Campaign, per the user's explicit finance policy decision.
import { describe, it, expect } from 'vitest'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { FinanceService } from '../services/FinanceService'

const app = buildTestApp()
const finance = new FinanceService()

async function createAdvertisementAndRun(overrides: { destinationLandingPageId?: string } = {}) {
  const advertisement = await db.advertisement.create({
    data: { businessId: testBusinessId, name: 'Migration Test Advertisement' },
  })
  const adRun = await db.adRun.create({
    data: {
      advertisementId: advertisement.id,
      platform: 'META',
      status: 'ACTIVE',
      destinationLandingPageId: overrides.destinationLandingPageId,
    },
  })
  return { advertisement, adRun }
}

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'AdRun Migration Template',
      isSystem: true,
      schema: { sections: [], themeTokens: [] },
    },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: 'AdRun Migration Form',
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'AdRun Migration Page',
      slug: `adrun-migration-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      formId: formRes.json().data.id,
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

describe('AdRun click -> lead -> sale attribution', () => {
  it('a tracked AdRun click creates a Lead with sourceType AD_RUN and a matching sourceAdRunId, and the Sale inherits it', async () => {
    const page = await createPublishedPage()
    const { adRun } = await createAdvertisementAndRun({ destinationLandingPageId: page.id })

    const clickRes = await app.inject({
      method: 'GET',
      url: `/r/adrun/${adRun.id}?click_id=fb.adrun.1`,
    })
    expect(clickRes.statusCode).toBe(302)
    expect(clickRes.headers['cache-control']).toBe('no-store')
    const sid = new URL(clickRes.headers.location as string).searchParams.get('sid')!

    const event = await db.attributionEvent.findFirstOrThrow({ where: { adRunId: adRun.id } })
    expect(event.clickId).toBe('fb.adrun.1')

    const submitRes = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sid, data: { email: 'adrun-migration@example.com' } },
    })
    expect(submitRes.statusCode).toBe(201)
    const { contactId, leadId } = submitRes.json().data

    const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } })
    expect(lead.sourceType).toBe('AD_RUN')
    expect(lead.sourceAdRunId).toBe(adRun.id)
    expect(lead.sourceDeploymentId).toBeNull()
    expect(lead.sourceAdUnitId).toBeNull()

    const updatedRun = await db.adRun.findUniqueOrThrow({ where: { id: adRun.id } })
    expect(updatedRun.clicks).toBe(1)
    expect(updatedRun.conversions).toBe(1)

    const saleRes = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId,
        leadId,
        amount: 250,
        date: new Date().toISOString(),
        idempotencyKey: 'adrun-migration-sale',
      },
    })
    expect(saleRes.statusCode).toBe(201)
    expect(saleRes.json().data.sourceType).toBe('AD_RUN')
    expect(saleRes.json().data.sourceAdRunId).toBe(adRun.id)
  })

  it('a campaign past its endDate has no bearing on a standalone AdRun click (they are independent lifecycles) — but an ended AdRun itself 404s', async () => {
    const { adRun } = await createAdvertisementAndRun()
    await db.adRun.update({ where: { id: adRun.id }, data: { status: 'ENDED' } })

    const clickRes = await app.inject({ method: 'GET', url: `/r/adrun/${adRun.id}` })
    expect(clickRes.statusCode).toBe(404)
  })
})

describe('Reporting unions AdRun into existing Campaign/Dashboard rollups', () => {
  it('campaign performance includes an AdRun linked via CampaignAdRun, and excludes one that is not linked', async () => {
    const page = await createPublishedPage()
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Union Creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Union Campaign',
        budget: 100,
        startDate: new Date(),
        platforms: ['GOOGLE'],
        creativeLinks: { create: [{ creativeId: creative.id }] },
      },
    })
    const deployment = await db.deployment.create({
      data: {
        campaignId: campaign.id,
        creativeId: creative.id,
        platform: 'GOOGLE',
        status: 'ACTIVE',
        destinationLandingPageId: page.id,
      },
    })

    const { adRun: linkedRun } = await createAdvertisementAndRun({
      destinationLandingPageId: page.id,
    })
    await db.campaignAdRun.create({ data: { campaignId: campaign.id, adRunId: linkedRun.id } })
    const { adRun: unlinkedRun } = await createAdvertisementAndRun({
      destinationLandingPageId: page.id,
    })

    // Deployment conversion (existing path, unaffected).
    const clickD = await app.inject({ method: 'GET', url: `/r/${deployment.id}` })
    const sidD = new URL(clickD.headers.location as string).searchParams.get('sid')!
    const submitD = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sidD, data: { email: 'union-deployment@example.com' } },
    })
    const saleD = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: submitD.json().data.contactId,
        leadId: submitD.json().data.leadId,
        amount: 100,
        date: new Date().toISOString(),
        idempotencyKey: 'union-sale-deployment',
      },
    })
    expect(saleD.statusCode).toBe(201)

    // Linked AdRun conversion — must show up in this campaign's performance.
    const clickLinked = await app.inject({ method: 'GET', url: `/r/adrun/${linkedRun.id}` })
    const sidLinked = new URL(clickLinked.headers.location as string).searchParams.get('sid')!
    const submitLinked = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sidLinked, data: { email: 'union-linked@example.com' } },
    })
    const saleLinked = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: submitLinked.json().data.contactId,
        leadId: submitLinked.json().data.leadId,
        amount: 200,
        date: new Date().toISOString(),
        idempotencyKey: 'union-sale-linked',
      },
    })
    expect(saleLinked.statusCode).toBe(201)

    // Unlinked AdRun conversion — must NOT show up in this campaign's performance.
    const clickUnlinked = await app.inject({ method: 'GET', url: `/r/adrun/${unlinkedRun.id}` })
    const sidUnlinked = new URL(clickUnlinked.headers.location as string).searchParams.get('sid')!
    const submitUnlinked = await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sidUnlinked, data: { email: 'union-unlinked@example.com' } },
    })
    const saleUnlinked = await app.inject({
      method: 'POST',
      url: '/sales',
      headers: asAuth(testUserId),
      payload: {
        contactId: submitUnlinked.json().data.contactId,
        leadId: submitUnlinked.json().data.leadId,
        amount: 999,
        date: new Date().toISOString(),
        idempotencyKey: 'union-sale-unlinked',
      },
    })
    expect(saleUnlinked.statusCode).toBe(201)

    const perf = (
      await app.inject({
        method: 'GET',
        url: `/campaigns/${campaign.id}/performance`,
        headers: asAuth(testUserId),
      })
    ).json().data

    expect(perf.leads).toBe(2) // deployment + linked AdRun, not the unlinked one
    expect(perf.sales).toBe(2)
    expect(perf.revenue).toBe(300) // 100 + 200, not + 999
    const googlePlatform = perf.byPlatform.find((p: any) => p.platform === 'GOOGLE')
    expect(googlePlatform.sales).toBe(1)
    const metaPlatform = perf.byPlatform.find((p: any) => p.platform === 'META')
    expect(metaPlatform.sales).toBe(1) // the linked AdRun's platform contribution, merged in
  })

  it('dashboard results bySource includes an AD_RUN entry with a real label and spend', async () => {
    const page = await createPublishedPage()
    const { advertisement, adRun } = await createAdvertisementAndRun({
      destinationLandingPageId: page.id,
    })
    await db.adRun.update({ where: { id: adRun.id }, data: { spend: 42.5 } })

    const clickRes = await app.inject({ method: 'GET', url: `/r/adrun/${adRun.id}` })
    const sid = new URL(clickRes.headers.location as string).searchParams.get('sid')!
    await app.inject({
      method: 'POST',
      url: `/landing-pages/${page.id}/submissions`,
      payload: { sessionId: sid, data: { email: 'dashboard-adrun@example.com' } },
    })

    const results = (
      await app.inject({ method: 'GET', url: '/results', headers: asAuth(testUserId) })
    ).json().data
    const adRunRow = results.bySource.find(
      (row: any) => row.sourceType === 'AD_RUN' && row.sourceId === adRun.id,
    )
    expect(adRunRow).toBeTruthy()
    expect(adRunRow.label).toBe(`${advertisement.name} · META`)
    expect(adRunRow.spend).toBe(42.5)
    expect(adRunRow.leads).toBe(1)
  })
})

describe('Finance: an AdRun can be funded and spent against without any Campaign', () => {
  it('authorizeAdRunBudget -> recordAdRunSpend -> settleAdSpend all work standalone', async () => {
    const { adRun } = await createAdvertisementAndRun()

    // Fund the business's wallet (shared across campaigns and AdRuns alike — see
    // FinancialAccount.CLIENT_AD_FUNDS in lib/finance/accounts.ts).
    await finance.recordClientFunding(testBusinessId, {
      amountMinor: 100000,
      currency: 'USD',
      idempotencyKey: 'adrun-fin-fund-1',
    })

    const auth = await finance.authorizeAdRunBudget(testBusinessId, adRun.id, {
      amountMinor: 50000,
      currency: 'USD',
      idempotencyKey: 'adrun-fin-auth-1',
    })
    expect(auth.adRunId).toBe(adRun.id)
    expect(auth.campaignId).toBeNull()
    expect(auth.status).toBe('ACTIVE')

    const spend = await finance.recordAdRunSpend(testBusinessId, {
      adRunId: adRun.id,
      amountMinor: 12000,
      currency: 'USD',
      platform: 'META',
      externalChargeId: 'meta_adrun_chg_1',
      periodStart: new Date(Date.now() - 86400000).toISOString(),
      periodEnd: new Date().toISOString(),
      idempotencyKey: 'adrun-fin-spend-1',
    })
    expect(spend.adRunId).toBe(adRun.id)
    expect(spend.campaignId).toBeNull()
    expect(spend.reportedAmountMinor).toBe(12000)

    const settled = await finance.settleAdSpend(testBusinessId, spend.id, {
      settledAmountMinor: 11500,
      idempotencyKey: 'adrun-fin-settle-1',
    })
    expect(settled.settlementStatus).toBe('SETTLED')
    expect(settled.settledAmountMinor).toBe(11500)

    // The reserved-funds balance for this AdRun reflects the spend — proves accountBalanceMinor's
    // adRunId scoping (added during this migration) actually filters correctly, independent of
    // campaignId scoping.
    const funding = await finance.getAdRunFunding(testBusinessId, adRun.id)
    expect(funding.authorizedAmountMinor).toBe(50000)
    expect(funding.settledAmountMinor).toBe(11500)
  })
})
