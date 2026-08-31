// Regression coverage for the RECREATE path — replace-creative and replace-destination, both
// purpose-built entry points over the same createAndProvision command a first send already uses.
// The core guarantee under test: the prior run keeps delivering until the replacement is actually
// ready (never ended just because a replacement was *attempted*), and lineage (supersedesRunId,
// the continued MediaOrderRevision sequence) survives both success and failure. Mirrors
// adRunSchedule.test.ts's exact Graph-API mocking; no real network calls.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { saveMediaFile } from '../lib/mediaStorage'
import { sealToken } from '../lib/platforms/encrypt'

const app = buildTestApp()

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const META_ENV = {
  META_APP_ID: 'app-id',
  META_APP_SECRET: 'app-secret',
  META_REDIRECT_URI: 'http://localhost:3001/platforms/META/oauth/callback',
  SESSION_SECRET: 'test-session-secret-at-least-32-chars',
}

function json(data: unknown, status = 200) {
  return { ok: status < 400, json: async () => data }
}

function mockGraph(opts: { failPush?: boolean } = {}) {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.includes('/adimages')) return json({ images: { 'pixel.png': { hash: 'imghash' } } })
    if (url.includes('/act_1/campaigns')) {
      if (opts.failPush) return json({ error: { message: 'Meta rejected the campaign' } }, 500)
      return json({ id: 'camp_ext' })
    }
    if (url.includes('/act_1/adsets')) return json({ id: 'set_ext' })
    if (url.includes('/act_1/adcreatives')) return json({ id: 'cr_ext' })
    if (url.includes('/act_1/ads')) return json({ id: 'ad_ext' })
    if (method === 'POST' && url.includes('/set_ext') && !url.includes('/insights'))
      return json({ success: true })
    if (url.includes('/ad_ext/insights')) {
      return json({
        data: [{ spend: '0', impressions: '0', reach: '0', clicks: '0', actions: [] }],
      })
    }
    if (url.includes('/set_ext')) {
      return json({ daily_budget: '2500', start_time: '2026-09-01T00:00:00+0000', end_time: null })
    }
    if (url.includes('/ad_ext')) return json({ effective_status: 'ACTIVE', issues_info: [] })
    return json({ error: { message: `unmocked ${url}` } }, 500)
  })
}

function enableMeta() {
  for (const [key, value] of Object.entries(META_ENV)) vi.stubEnv(key, value)
}

async function connectMeta() {
  return db.platformConnection.create({
    data: {
      businessId: testBusinessId,
      platform: 'META',
      accessTokenEnc: sealToken('RAW_TOKEN'),
      status: 'CONNECTED',
      adAccountId: 'act_1',
      pageId: 'page_1',
      defaultCountry: 'US',
    },
  })
}

async function createAsset(name: string) {
  const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
  return db.asset.create({
    data: {
      businessId: testBusinessId,
      type: 'IMAGE',
      name,
      url: saved.url,
      mimeType: 'image/png',
    },
  })
}

async function createPublishedPage(name: string) {
  const template = await db.landingPageTemplate.create({
    data: { name: `${name} Template`, isSystem: true, schema: { sections: [], themeTokens: [] } },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  })
  const page = pageRes.json().data
  await app.inject({
    method: 'POST',
    url: `/landing-pages/${page.id}/publish`,
    headers: asAuth(testUserId),
  })
  return (
    await app.inject({
      method: 'GET',
      url: `/landing-pages/${page.id}`,
      headers: asAuth(testUserId),
    })
  ).json().data
}

async function createSentAdRun(assetId: string, pageId: string) {
  const advertisementRes = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(testUserId),
    payload: { name: 'Replace Test Ad', assetIds: [assetId] },
  })
  const advertisementId = advertisementRes.json().data.id
  const runRes = await app.inject({
    method: 'POST',
    url: `/advertisements/${advertisementId}/runs`,
    headers: asAuth(testUserId),
    payload: {
      platform: 'META',
      budget: 25,
      startDate: '2026-09-01T00:00:00.000Z',
      destinationLandingPageId: pageId,
      idempotencyKey: `replace-test-${Math.random()}`,
      orderSnapshot: { dailyBudget: 25, where: 'Facebook Feed', goal: 'Get Leads' },
    },
  })
  return { advertisementId, run: runRes.json().data }
}

describe('AdRun replace-creative / replace-destination', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-replace-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('replace-creative creates a new run, links it to the old one, continues the revision sequence, and ends the old run only once the replacement succeeds', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const original = await createAsset('Original')
    const page = await createPublishedPage('Replace Creative Page')
    const { advertisementId, run } = await createSentAdRun(original.id, page.id)
    expect(run.mediaOrderRevision.revision).toBe(1)

    const replacement = await createAsset('Replacement')
    await app.inject({
      method: 'PATCH',
      url: `/advertisements/${advertisementId}`,
      headers: asAuth(testUserId),
      payload: { assetIds: [replacement.id] },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/replace-creative`,
      headers: asAuth(testUserId),
      payload: {},
    })
    expect(res.statusCode).toBe(201)
    const newRun = res.json().data
    expect(newRun.id).not.toBe(run.id)
    expect(newRun.supersedesRunId).toBe(run.id)
    expect(newRun.mediaOrderRevision.revision).toBe(2)
    expect(newRun.mediaOrderRevision.assetIds).toEqual([replacement.id])
    // Carried forward, not lost: same budget/destination as the run being replaced.
    expect(newRun.budget).toBe(25)
    expect(newRun.destinationLandingPageId).toBe(page.id)

    const oldRow = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(oldRow.status).toBe('ENDED') // replacement succeeded, so now (and only now) ended
  })

  it("400s when the Advertisement's current media already matches the run's last revision", async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const asset = await createAsset('Unchanged')
    const page = await createPublishedPage('Unchanged Media Page')
    const { run } = await createSentAdRun(asset.id, page.id)

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/replace-creative`,
      headers: asAuth(testUserId),
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/nothing to replace/i)
  })

  it('a failed replacement leaves the prior run untouched and still delivering, never stranding the business with zero live runs', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const original = await createAsset('Original 2')
    const page = await createPublishedPage('Replace Creative Failure Page')
    const { advertisementId, run } = await createSentAdRun(original.id, page.id)

    const replacement = await createAsset('Replacement 2')
    await app.inject({
      method: 'PATCH',
      url: `/advertisements/${advertisementId}`,
      headers: asAuth(testUserId),
      payload: { assetIds: [replacement.id] },
    })

    mockGraph({ failPush: true })
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/replace-creative`,
      headers: asAuth(testUserId),
      payload: {},
    })
    expect(res.statusCode).toBe(502)

    const oldRow = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(oldRow.status).not.toBe('ENDED') // still live — the replacement never became ready

    const rows = await db.adRun.findMany({ where: { advertisementId } })
    expect(rows).toHaveLength(2)
    const failedRow = rows.find((r) => r.id !== run.id)!
    expect(failedRow.status).toBe('PROVISIONING_FAILED')
    expect(failedRow.supersedesRunId).toBe(run.id)
  })

  it('replace-destination creates a new run pointed at the new page, freezes its published version, and ends the old run', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const asset = await createAsset('Destination Asset')
    const oldPage = await createPublishedPage('Old Destination')
    const { run } = await createSentAdRun(asset.id, oldPage.id)
    const newPage = await createPublishedPage('New Destination')

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/replace-destination`,
      headers: asAuth(testUserId),
      payload: { destinationLandingPageId: newPage.id },
    })
    expect(res.statusCode).toBe(201)
    const newRun = res.json().data
    expect(newRun.supersedesRunId).toBe(run.id)
    expect(newRun.destinationLandingPageId).toBe(newPage.id)
    expect(newRun.mediaOrderRevision.destinationLandingPageId).toBe(newPage.id)
    expect(newRun.mediaOrderRevision.destinationLandingPageVersionId).toBe(
      newPage.publishedVersionId,
    )
    // The old destination's version must never leak onto the new destination's revision.
    expect(newRun.mediaOrderRevision.destinationLandingPageVersionId).not.toBe(
      run.mediaOrderRevision.destinationLandingPageVersionId,
    )

    const oldRow = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(oldRow.status).toBe('ENDED')
  })

  it("400s when the requested destination already matches the run's current destination", async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const asset = await createAsset('Same Destination Asset')
    const page = await createPublishedPage('Same Destination Page')
    const { run } = await createSentAdRun(asset.id, page.id)

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/replace-destination`,
      headers: asAuth(testUserId),
      payload: { destinationLandingPageId: page.id },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/nothing to replace/i)
  })
})
