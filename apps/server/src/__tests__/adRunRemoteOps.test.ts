// Regression coverage for the "safe remote operations" slice — pause/resume/end now request a
// real status change at the platform (capability-driven), then resync to read back the platform's
// own confirmed state, rather than ever optimistically flipping LOOPIE's local status. Mirrors
// adRunProvisioning.test.ts / adRunSync.test.ts's exact Graph-API mocking; no real network calls.
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

function mockGraph(opts: { failUpdate?: boolean; effectiveStatus?: string } = {}) {
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
    if (url.includes('/act_1/ads')) return json({ id: 'ad_ext' })
    // Status-mutation POSTs go directly to the object's own bare id (no /act_.../ prefix).
    if (
      method === 'POST' &&
      !url.includes('/insights') &&
      (url.includes('/camp_ext') || url.includes('/set_ext') || url.includes('/ad_ext'))
    ) {
      if (opts.failUpdate)
        return json({ error: { message: 'Meta rejected the status update' } }, 500)
      return json({ success: true })
    }
    if (url.includes('/ad_ext/insights')) {
      return json({
        data: [{ spend: '0', impressions: '0', reach: '0', clicks: '0', actions: [] }],
      })
    }
    if (url.includes('/set_ext')) return json({ daily_budget: '2500' })
    if (url.includes('/ad_ext')) {
      return json({ effective_status: opts.effectiveStatus ?? 'ACTIVE', issues_info: [] })
    }
    return json({ error: { message: `unmocked ${url}` } }, 500)
  })
  return calls
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
    },
  })
}

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'Remote Ops Template',
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
      name: 'Remote Ops Page',
      slug: `remote-ops-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

async function createSentAdRun() {
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
    payload: { name: 'Remote Ops Ad', assetIds: [asset.id] },
  })
  const page = await createPublishedPage()
  const runRes = await app.inject({
    method: 'POST',
    url: `/advertisements/${advertisementRes.json().data.id}/runs`,
    headers: asAuth(testUserId),
    payload: {
      platform: 'META',
      budget: 25,
      destinationLandingPageId: page.id,
      idempotencyKey: `remote-ops-${Math.random()}`,
    },
  })
  return runRes.json().data
}

describe('AdRun remote operations', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-remote-ops-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('resume sends a real ACTIVE request to every object level, then confirms via resync', async () => {
    enableMeta()
    let calls = mockGraph({ effectiveStatus: 'ACTIVE' })
    await connectMeta()
    const run = await createSentAdRun()
    expect(run.status).toBe('PENDING')

    calls = mockGraph({ effectiveStatus: 'ACTIVE' })
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/resume`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const updated = res.json().data
    expect(updated.status).toBe('ACTIVE') // LOOPIE's own order state
    expect(updated.providerState).toBe('LIVE') // confirmed via a real resync, not assumed
    expect(updated.syncHealth).toBe('CURRENT')

    const statusCalls = calls.filter((c) => c.method === 'POST' && c.body.includes('status=ACTIVE'))
    expect(statusCalls.some((c) => c.url.includes('/camp_ext'))).toBe(true)
    expect(statusCalls.some((c) => c.url.includes('/set_ext'))).toBe(true)
    expect(statusCalls.some((c) => c.url.includes('/ad_ext'))).toBe(true)
  })

  it('pause sends PAUSED and end sends ARCHIVED, mapped correctly on resync', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'ACTIVE' })
    await connectMeta()
    const run = await createSentAdRun()
    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/resume`,
      headers: asAuth(testUserId),
    })

    const pauseCalls = mockGraph({ effectiveStatus: 'PAUSED' })
    const paused = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/pause`,
      headers: asAuth(testUserId),
    })
    expect(paused.json().data.status).toBe('PAUSED')
    expect(paused.json().data.providerState).toBe('PAUSED')
    expect(pauseCalls.some((c) => c.method === 'POST' && c.body.includes('status=PAUSED'))).toBe(
      true,
    )

    const endCalls = mockGraph({ effectiveStatus: 'ARCHIVED' })
    const ended = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/end`,
      headers: asAuth(testUserId),
    })
    expect(ended.json().data.status).toBe('ENDED')
    expect(ended.json().data.providerState).toBe('ENDED')
    expect(endCalls.some((c) => c.method === 'POST' && c.body.includes('status=ARCHIVED'))).toBe(
      true,
    )
  })

  it('a failed remote request never flips local status, and surfaces a real error', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'ACTIVE' })
    await connectMeta()
    const run = await createSentAdRun()

    mockGraph({ failUpdate: true })
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/resume`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(502)

    const row = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(row.status).toBe('PENDING') // unchanged — no optimistic flip on a failed request
  })

  it('falls back to a local-only transition when there is no connector for the platform (LOOPIE pages)', async () => {
    enableMeta()
    mockGraph()
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
      payload: { name: 'Page Ad', assetIds: [asset.id] },
    })
    const page = await createPublishedPage()
    const runRes = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisementRes.json().data.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'LOOPIE',
        placement: 'PAGE',
        budget: 0,
        destinationLandingPageId: page.id,
        idempotencyKey: `remote-ops-loopie-${Math.random()}`,
      },
    })
    const run = runRes.json().data
    expect(run.status).toBe('PENDING')

    const calls = mockGraph()
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/resume`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('ACTIVE')
    expect(calls.length).toBe(0) // no connector exists for LOOPIE — never touched the network
  })

  it('falls back to a local-only transition when the run was never actually sent (no external identity)', async () => {
    enableMeta()
    mockGraph()
    // No connectMeta() — the run gets created and left PENDING for manual entry (see
    // AdRunService._provision's documented "nothing to push to yet" path). No external object
    // exists at all here, so local-only is correct — this is not the disconnected-after-send case.
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
      payload: { name: 'Unconnected Ad', assetIds: [asset.id] },
    })
    const page = await createPublishedPage()
    const runRes = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisementRes.json().data.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'META',
        budget: 25,
        destinationLandingPageId: page.id,
        idempotencyKey: `remote-ops-unconnected-${Math.random()}`,
      },
    })
    expect(runRes.json().data.externalAdId).toBeNull()

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${runRes.json().data.id}/resume`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('ACTIVE')
    expect(res.json().data.providerState).toBeNull() // never synced — no connection to sync against
  })

  it('a real external run whose business is now disconnected refuses the request instead of degrading to local-only', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'ACTIVE' })
    await connectMeta()
    const run = await createSentAdRun()
    expect(run.externalAdId).toBeTruthy()

    // Disconnect after the run was actually sent — a real external object now exists that LOOPIE
    // has no credentials to reach.
    await db.platformConnection.deleteMany({
      where: { businessId: testBusinessId, platform: 'META' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/resume`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/reconnect META/i)

    // Neither axis moved — not LOOPIE's own status, not the platform's own (unsynced) truth. The
    // exact split this fix exists to prevent: "LOOPIE says Paused, Facebook keeps spending."
    const row = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(row.status).toBe('PENDING')
    expect(row.providerState).toBeNull()
    expect(row.syncHealth).toBe('NEVER_SYNCED')
  })
})
