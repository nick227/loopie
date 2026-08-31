// Regression coverage for step 6b of the Media/Advertisement/AdRun migration — the declarative
// "create and provision" AdRun command — see CLAUDE.md's migration audit. Mirrors
// platformConnector.test.ts's exact Graph-API mocking approach so this doesn't make real network
// calls. Proves the seven safeguards the user asked for explicitly, one test (or pair) each.
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

type GraphCall = { url: string; method: string; body: string }

function json(data: unknown, status = 200) {
  return { ok: status < 400, json: async () => data }
}

function mockGraph(opts: { failAdCreate?: boolean } = {}) {
  const calls: GraphCall[] = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? init.body : ''
    calls.push({ url, method, body })
    if (url.includes('/adimages')) return json({ images: { 'pixel.png': { hash: 'imghash' } } })
    if (url.includes('/act_1/campaigns')) return json({ id: 'camp_ext' })
    if (url.includes('/act_1/adsets')) return json({ id: 'set_ext' })
    if (url.includes('/act_1/adcreatives')) return json({ id: 'cr_ext' })
    if (url.includes('/act_1/ads')) {
      if (opts.failAdCreate) return json({ error: { message: 'ad rejected by policy' } }, 400)
      return json({ id: 'ad_ext' })
    }
    // Remote status mutations (pause/resume/end) and the resync that follows them — bare object
    // ids, no /act_1/ prefix. Not this file's own focus (see adRunRemoteOps.test.ts for that),
    // but the cascade test below now genuinely calls resume, so these need to succeed.
    if (
      method === 'POST' &&
      !url.includes('/insights') &&
      (url.includes('/camp_ext') || url.includes('/set_ext') || url.includes('/ad_ext'))
    ) {
      return json({ success: true })
    }
    if (url.includes('/ad_ext/insights')) {
      return json({
        data: [{ spend: '0', impressions: '0', reach: '0', clicks: '0', actions: [] }],
      })
    }
    if (url.includes('/set_ext')) return json({ daily_budget: '2500' })
    if (url.includes('/ad_ext')) return json({ effective_status: 'ACTIVE', issues_info: [] })
    return json({ error: { message: `unmocked ${url}` } }, 500)
  })
  return calls
}

function enableMeta() {
  for (const [key, value] of Object.entries(META_ENV)) vi.stubEnv(key, value)
}

async function createAdvertisementWithImage() {
  const saved = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
  const asset = await db.asset.create({
    data: {
      businessId: testBusinessId,
      type: 'IMAGE',
      name: 'Pixel',
      url: saved.url,
      mimeType: 'image/png',
    },
  })
  const advertisementRes = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(testUserId),
    payload: { name: 'Provisioning Test Ad', assetIds: [asset.id] },
  })
  expect(advertisementRes.statusCode).toBe(201)
  return advertisementRes.json().data
}

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'AdRun Provisioning Template',
      isSystem: true,
      schema: { sections: [], themeTokens: [] },
    },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'AdRun Provisioning Page',
      slug: `adrun-provisioning-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

async function connectMeta(overrides: { adAccountId?: string; pageId?: string } = {}) {
  return db.platformConnection.create({
    data: {
      businessId: testBusinessId,
      platform: 'META',
      accessTokenEnc: sealToken('RAW_TOKEN'),
      status: 'CONNECTED',
      adAccountId: overrides.adAccountId ?? 'act_1',
      pageId: overrides.pageId ?? 'page_1',
    },
  })
}

describe('AdRun declarative creation', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-adrun-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('is idempotent: a retried create with the same key returns the same AdRun and never re-provisions', async () => {
    enableMeta()
    const calls = mockGraph()
    await connectMeta()
    const advertisement = await createAdvertisementWithImage()

    const payload = { platform: 'META', budget: 50, idempotencyKey: 'adrun-create-retry-1' }
    const first = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload,
    })
    expect(first.statusCode).toBe(201)
    expect(first.json().data.status).toBe('PENDING')
    expect(first.json().data.externalAdId).toBe('ad_ext')

    const adSpendCallsBefore = calls.filter((c) => c.url.includes('/ads')).length
    const retry = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload,
    })
    expect(retry.statusCode).toBe(201)
    expect(retry.json().data.id).toBe(first.json().data.id)
    expect(calls.filter((c) => c.url.includes('/ads')).length).toBe(adSpendCallsBefore) // no second /ads call

    const rows = await db.adRun.count({ where: { advertisementId: advertisement.id } })
    expect(rows).toBe(1)
  })

  it('rejects invalid input before ever touching the connector (per-platform validation)', async () => {
    enableMeta()
    const calls = mockGraph()
    await connectMeta()
    const advertisement = await createAdvertisementWithImage()

    const loopie = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: { platform: 'LOOPIE', idempotencyKey: 'validation-loopie' },
    })
    // LOOPIE needs a landing page — rejected before any connector call.
    expect(loopie.statusCode).toBe(400)

    const badBudget = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: { platform: 'META', budget: -5, idempotencyKey: 'validation-budget' },
    })
    expect(badBudget.statusCode).toBe(400)

    const badDates = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'META',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
        idempotencyKey: 'validation-dates',
      },
    })
    expect(badDates.statusCode).toBe(400)

    expect(calls.length).toBe(0) // connector never touched
    expect(await db.adRun.count({ where: { advertisementId: advertisement.id } })).toBe(0)
  })

  it('creates a LOOPIE run on a named page with a $0 budget', async () => {
    const advertisement = await createAdvertisementWithImage()
    const page = await createPublishedPage()
    const res = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'LOOPIE',
        placement: 'PAGE',
        budget: 0,
        destinationLandingPageId: page.id,
        idempotencyKey: 'loopie-page-zero',
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.platform).toBe('LOOPIE')
    expect(res.json().data.placement).toBe('PAGE')
    expect(res.json().data.budget).toBe(0)
    expect(res.json().data.status).toBe('PENDING')
    expect(res.json().data.destinationLandingPageId).toBe(page.id)
  })

  it('connector failure leaves the run VALIDATION_FAILED, never looking live, and is retryable with the same key', async () => {
    enableMeta()
    mockGraph({ failAdCreate: true })
    await connectMeta()
    const advertisement = await createAdvertisementWithImage()

    const failed = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: { platform: 'META', idempotencyKey: 'adrun-connector-fail' },
    })
    expect(failed.statusCode).toBe(502)

    const row = await db.adRun.findFirstOrThrow({ where: { advertisementId: advertisement.id } })
    expect(row.status).toBe('VALIDATION_FAILED')
    expect(row.externalAdId).toBeNull()
    expect(row.previewUrl).toBeNull()

    // Retry with the same key, now against a working connector — must provision the *same* row.
    vi.unstubAllGlobals()
    mockGraph()
    const retried = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: { platform: 'META', idempotencyKey: 'adrun-connector-fail' },
    })
    expect(retried.statusCode).toBe(201)
    expect(retried.json().data.id).toBe(row.id)
    expect(retried.json().data.status).toBe('PENDING')
    expect(retried.json().data.externalAdId).toBe('ad_ext')
    expect(await db.adRun.count({ where: { advertisementId: advertisement.id } })).toBe(1)
  })

  it('previewUrl only populates once the external object actually exists', async () => {
    enableMeta()
    mockGraph()
    // No PlatformConnection at all — nothing to push to.
    const advertisement = await createAdvertisementWithImage()

    const unconnected = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: { platform: 'META', idempotencyKey: 'adrun-preview-unconnected' },
    })
    expect(unconnected.statusCode).toBe(201)
    expect(unconnected.json().data.status).toBe('PENDING') // parked for manual entry, not a failure
    expect(unconnected.json().data.previewUrl).toBeNull()
    expect(unconnected.json().data.externalAdId).toBeNull()

    await connectMeta()
    const connected = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: { platform: 'META', idempotencyKey: 'adrun-preview-connected' },
    })
    expect(connected.statusCode).toBe(201)
    expect(connected.json().data.previewUrl).toContain('facebook.com')
    expect(connected.json().data.previewUrl).toContain('camp_ext')
  })

  it('creates and provisions an AdRun with zero Campaign rows anywhere', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const advertisement = await createAdvertisementWithImage()

    const res = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: { platform: 'META', idempotencyKey: 'adrun-no-campaign' },
    })
    expect(res.statusCode).toBe(201)
    expect(await db.campaign.count({ where: { businessId: testBusinessId } })).toBe(0)
    expect(await db.campaignAdRun.count()).toBe(0)
  })

  it('pause/resume/end are deterministic local transitions, and campaign pause/resume/end cascade onto a linked AdRun', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const advertisement = await createAdvertisementWithImage()
    const created = (
      await app.inject({
        method: 'POST',
        url: `/advertisements/${advertisement.id}/runs`,
        headers: asAuth(testUserId),
        payload: { platform: 'META', idempotencyKey: 'adrun-cascade-1' },
      })
    ).json().data
    expect(created.status).toBe('PENDING')

    // Standalone resume/pause/end.
    const resumed = await app.inject({
      method: 'POST',
      url: `/ad-runs/${created.id}/resume`,
      headers: asAuth(testUserId),
    })
    expect(resumed.statusCode).toBe(200)
    expect(resumed.json().data.status).toBe('ACTIVE')

    const paused = await app.inject({
      method: 'POST',
      url: `/ad-runs/${created.id}/pause`,
      headers: asAuth(testUserId),
    })
    expect(paused.statusCode).toBe(200)
    expect(paused.json().data.status).toBe('PAUSED')

    // Link it under a Campaign and prove cascade parity.
    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Cascade Creative' },
    })
    const campaign = await db.campaign.create({
      data: {
        businessId: testBusinessId,
        name: 'Cascade Campaign',
        budget: 10,
        startDate: new Date(),
        platforms: ['META'],
        creativeLinks: { create: [{ creativeId: creative.id }] },
      },
    })
    await db.campaignAdRun.create({ data: { campaignId: campaign.id, adRunId: created.id } })

    const campaignResume = await app.inject({
      method: 'POST',
      url: `/campaigns/${campaign.id}/resume`,
      headers: asAuth(testUserId),
    })
    expect(campaignResume.statusCode).toBe(200)
    expect((await db.adRun.findUniqueOrThrow({ where: { id: created.id } })).status).toBe('ACTIVE')

    const campaignPause = await app.inject({
      method: 'POST',
      url: `/campaigns/${campaign.id}/pause`,
      headers: asAuth(testUserId),
    })
    expect(campaignPause.statusCode).toBe(200)
    expect((await db.adRun.findUniqueOrThrow({ where: { id: created.id } })).status).toBe('PAUSED')

    const campaignEnd = await app.inject({
      method: 'POST',
      url: `/campaigns/${campaign.id}/end`,
      headers: asAuth(testUserId),
    })
    expect(campaignEnd.statusCode).toBe(200)
    expect((await db.adRun.findUniqueOrThrow({ where: { id: created.id } })).status).toBe('ENDED')

    // Ending the campaign must not resurrect an ended AdRun via a later resume.
    const resumeAfterEnd = await app.inject({
      method: 'POST',
      url: `/ad-runs/${created.id}/resume`,
      headers: asAuth(testUserId),
    })
    expect(resumeAfterEnd.statusCode).toBe(409)
  })

  it('rejects deleting an AdRun with attributed activity; allows deleting a clean one', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const advertisement = await createAdvertisementWithImage()
    const clean = (
      await app.inject({
        method: 'POST',
        url: `/advertisements/${advertisement.id}/runs`,
        headers: asAuth(testUserId),
        payload: { platform: 'META', idempotencyKey: 'adrun-delete-clean' },
      })
    ).json().data
    const deleted = await app.inject({
      method: 'DELETE',
      url: `/ad-runs/${clean.id}`,
      headers: asAuth(testUserId),
    })
    expect(deleted.statusCode).toBe(200)
    expect(await db.adRun.findUnique({ where: { id: clean.id } })).toBeNull()

    const page = await createPublishedPage()
    const withAttribution = (
      await app.inject({
        method: 'POST',
        url: `/advertisements/${advertisement.id}/runs`,
        headers: asAuth(testUserId),
        payload: {
          platform: 'META',
          destinationLandingPageId: page.id,
          idempotencyKey: 'adrun-delete-attributed',
        },
      })
    ).json().data
    // A click only records against an ACTIVE ad run.
    await app.inject({
      method: 'POST',
      url: `/ad-runs/${withAttribution.id}/resume`,
      headers: asAuth(testUserId),
    })
    const click = await app.inject({ method: 'GET', url: `/r/adrun/${withAttribution.id}` })
    expect(click.statusCode).toBe(302)
    const blocked = await app.inject({
      method: 'DELETE',
      url: `/ad-runs/${withAttribution.id}`,
      headers: asAuth(testUserId),
    })
    expect(blocked.statusCode).toBe(409)
    expect(await db.adRun.findUnique({ where: { id: withAttribution.id } })).not.toBeNull()
  })

  it('source identity is immutable: update() cannot change platform or advertisementId', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const advertisement = await createAdvertisementWithImage()
    const created = (
      await app.inject({
        method: 'POST',
        url: `/advertisements/${advertisement.id}/runs`,
        headers: asAuth(testUserId),
        payload: { platform: 'META', idempotencyKey: 'adrun-immutable-1' },
      })
    ).json().data

    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/ad-runs/${created.id}`,
      headers: asAuth(testUserId),
      // platform/advertisementId are not part of UpdateAdRunInput at all — even if a caller sends
      // them, the service layer never reads them off the body.
      payload: { platform: 'GOOGLE', advertisementId: 'someone-elses-advertisement', spend: 12.5 },
    })
    expect(updateRes.statusCode).toBe(200)
    expect(updateRes.json().data.platform).toBe('META')
    expect(updateRes.json().data.advertisementId).toBe(advertisement.id)
    expect(updateRes.json().data.spend).toBe(12.5)
  })
})
