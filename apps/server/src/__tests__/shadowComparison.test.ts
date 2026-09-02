// Regression coverage for the shadow-phase comparison tooling — see CLAUDE.md's Media/
// Advertisement/AdRun migration audit. Proves the comparator (a) reports a clean match for a
// genuinely healthy AdRun and (b) actually detects each class of defect it claims to detect,
// not just that it runs without throwing. The "clean" scenario is the acceptance bar itself:
// per the user's rule, cutover is only ready when every dimension is match/expected_model_difference.
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import { db } from '@project/db'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { compareSourcePair } from '../lib/shadowComparison'
import { saveMediaFile } from '../lib/mediaStorage'

const app = buildTestApp()

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Shadow Comparison Template',
      isSystem: true,
      schema: { sections: [], themeTokens: [] },
    },
  })
  const formRes = await app.inject({
    method: 'POST',
    url: '/forms',
    headers: asAuth(testUserId),
    payload: {
      name: 'Shadow Comparison Form',
      fields: [{ label: 'Email', fieldKey: 'email', type: 'EMAIL', required: true, order: 0 }],
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'Shadow Comparison Page',
      slug: `shadow-comparison-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

async function buildLegacyDeploymentWithConversion(page: { id: string }) {
  const creative = await db.creative.create({
    data: { businessId: testBusinessId, name: 'Shadow Legacy Creative' },
  })
  const campaign = await db.campaign.create({
    data: {
      businessId: testBusinessId,
      name: 'Shadow Legacy Campaign',
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
      destinationLandingPageId: page.id,
    },
  })
  const click = await app.inject({ method: 'GET', url: `/r/${deployment.id}` })
  const sid = new URL(click.headers.location as string).searchParams.get('sid')!
  const submit = await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/submissions`,
    payload: {
      sessionId: sid,
      idempotencyKey: randomUUID(),
      data: { email: `shadow-legacy-${Date.now()}@example.com` },
    },
  })
  const { contactId, leadId } = submit.json().data
  await app.inject({
    method: 'POST',
    url: '/sales',
    headers: asAuth(testUserId),
    payload: {
      contactId,
      leadId,
      amount: 400,
      date: new Date().toISOString(),
      idempotencyKey: `shadow-legacy-sale-${deployment.id}`,
    },
  })
  return deployment.id
}

async function buildAdRunWithConversion(page: { id: string }) {
  const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
  const asset = await db.asset.create({
    data: {
      businessId: testBusinessId,
      type: 'IMAGE',
      name: 'Shadow AdRun Pixel',
      url: saved.url,
      mimeType: 'image/png',
    },
  })
  const advertisementRes = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(testUserId),
    payload: { name: 'Shadow AdRun Advertisement', assetIds: [asset.id] },
  })
  const advertisement = advertisementRes.json().data
  const createRes = await app.inject({
    method: 'POST',
    url: `/advertisements/${advertisement.id}/runs`,
    headers: asAuth(testUserId),
    payload: {
      platform: 'META',
      destinationLandingPageId: page.id,
      idempotencyKey: `shadow-adrun-${advertisement.id}`,
    },
  })
  const adRun = createRes.json().data
  await app.inject({
    method: 'POST',
    url: `/ad-runs/${adRun.id}/resume`,
    headers: asAuth(testUserId),
  })

  const click = await app.inject({ method: 'GET', url: `/r/adrun/${adRun.id}` })
  const sid = new URL(click.headers.location as string).searchParams.get('sid')!
  const submit = await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/submissions`,
    payload: {
      sessionId: sid,
      idempotencyKey: randomUUID(),
      data: { email: `shadow-adrun-${Date.now()}@example.com` },
    },
  })
  const { contactId, leadId } = submit.json().data
  const saleRes = await app.inject({
    method: 'POST',
    url: '/sales',
    headers: asAuth(testUserId),
    payload: {
      contactId,
      leadId,
      amount: 250,
      date: new Date().toISOString(),
      idempotencyKey: `shadow-adrun-sale-${adRun.id}`,
    },
  })
  return { adRunId: adRun.id, leadId, saleId: saleRes.json().data.id }
}

describe('shadow comparison: clean, healthy activity', () => {
  it('reports match/expected_model_difference on every dimension and is ready for cutover', async () => {
    const page = await createPublishedPage()
    const deploymentId = await buildLegacyDeploymentWithConversion(page)
    const { adRunId } = await buildAdRunWithConversion(page)

    const report = await compareSourcePair(
      testBusinessId,
      { kind: 'DEPLOYMENT', id: deploymentId },
      adRunId,
    )

    for (const f of report.findings) {
      expect(['match', 'expected_model_difference']).toContain(f.status)
    }
    expect(report.readyForCutover).toBe(true)

    const revenue = report.findings.find((f) => f.dimension === 'attributedRevenue')!
    expect(revenue.next).toBe(250)
    const leads = report.findings.find((f) => f.dimension === 'leadIds')!
    expect(leads.next).toBe(1)
  })

  it('a reversed sale is reflected correctly and the run stays ready for cutover', async () => {
    const page = await createPublishedPage()
    const deploymentId = await buildLegacyDeploymentWithConversion(page)
    const { adRunId, saleId } = await buildAdRunWithConversion(page)

    await app.inject({
      method: 'POST',
      url: `/sales/${saleId}/reverse`,
      headers: asAuth(testUserId),
    })

    const report = await compareSourcePair(
      testBusinessId,
      { kind: 'DEPLOYMENT', id: deploymentId },
      adRunId,
    )
    const revenue = report.findings.find((f) => f.dimension === 'attributedRevenue')!
    expect(revenue.status).toBe('match')
    expect(revenue.next).toBe(0) // reversed sale excluded
    const reversals = report.findings.find((f) => f.dimension === 'reversals')!
    expect(reversals.legacy).toBe(1) // 1 reversed
    expect(reversals.next).toBe(0) // 0 still active
    expect(report.readyForCutover).toBe(true)
  })
})

describe('shadow comparison: defect detection', () => {
  it('flags a lead whose sourceType disagrees with sourceAdRunId — the exact regression class from the reverted rewrite', async () => {
    const page = await createPublishedPage()
    const deploymentId = await buildLegacyDeploymentWithConversion(page)
    const { adRunId, leadId } = await buildAdRunWithConversion(page)

    // Simulate the exact corruption the earlier concurrent-session bug produced: sourceAdRunId
    // set, but sourceType left as something else.
    await db.lead.update({ where: { id: leadId }, data: { sourceType: 'AD_UNIT' } })

    const report = await compareSourcePair(
      testBusinessId,
      { kind: 'DEPLOYMENT', id: deploymentId },
      adRunId,
    )
    const leads = report.findings.find((f) => f.dimension === 'leadIds')!
    expect(leads.status).toBe('migration_defect')
    expect(report.readyForCutover).toBe(false)
  })

  it('flags a sale that failed to inherit sourceAdRunId from its lead', async () => {
    const page = await createPublishedPage()
    const deploymentId = await buildLegacyDeploymentWithConversion(page)
    const { adRunId, saleId } = await buildAdRunWithConversion(page)

    await db.sale.update({
      where: { id: saleId },
      data: { sourceAdRunId: null, sourceType: 'MANUAL' },
    })

    const report = await compareSourcePair(
      testBusinessId,
      { kind: 'DEPLOYMENT', id: deploymentId },
      adRunId,
    )
    const sales = report.findings.find((f) => f.dimension === 'saleIds')!
    expect(sales.status).toBe('migration_defect')
    expect(report.readyForCutover).toBe(false)
  })

  it('flags denormalized click/conversion counters that drifted from the real underlying rows', async () => {
    const page = await createPublishedPage()
    const deploymentId = await buildLegacyDeploymentWithConversion(page)
    const { adRunId } = await buildAdRunWithConversion(page)

    await db.adRun.update({ where: { id: adRunId }, data: { clicks: 999 } })

    const report = await compareSourcePair(
      testBusinessId,
      { kind: 'DEPLOYMENT', id: deploymentId },
      adRunId,
    )
    const counts = report.findings.find((f) => f.dimension === 'clickConversionCounts')!
    expect(counts.status).toBe('migration_defect')
    expect(report.readyForCutover).toBe(false)
  })

  it('flags the VALIDATION_FAILED-with-a-real-externalAdId invariant violation', async () => {
    const page = await createPublishedPage()
    const deploymentId = await buildLegacyDeploymentWithConversion(page)
    const { adRunId } = await buildAdRunWithConversion(page)

    // This AdRun genuinely succeeded (has a real externalAdId from buildAdRunWithConversion's
    // mocked-free path — actually it never called a connector since no PlatformConnection exists,
    // so externalAdId is null here; force the invariant-violating state directly to prove
    // detection).
    await db.adRun.update({
      where: { id: adRunId },
      data: { status: 'VALIDATION_FAILED', externalAdId: 'ad_should_not_exist' },
    })

    const report = await compareSourcePair(
      testBusinessId,
      { kind: 'DEPLOYMENT', id: deploymentId },
      adRunId,
    )
    const status = report.findings.find((f) => f.dimension === 'statusTransitions')!
    expect(status.status).toBe('migration_defect')
    expect(report.readyForCutover).toBe(false)
  })
})
