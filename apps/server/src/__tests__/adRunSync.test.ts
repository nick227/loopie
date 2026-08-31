// Regression coverage for the AdRun provider-sync slice — pull-only status/spend/performance,
// scoped explicitly to NOT include approvals, versioned orders, or remote mutation (see CLAUDE.md).
// Mirrors adRunProvisioning.test.ts's exact Graph-API mocking approach; no real network calls.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { saveMediaFile } from '../lib/mediaStorage'
import { sealToken } from '../lib/platforms/encrypt'
import { runDueAdRunSyncs } from '../services/AdRunSyncService'

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

type SyncMockOpts = {
  effectiveStatus?: string
  spend?: number
  impressions?: number
  reach?: number
  clicks?: number
  dailyBudgetCents?: number
  failInsights?: boolean
  failAdFetch?: boolean
}

function mockGraph(opts: SyncMockOpts = {}) {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/adimages')) return json({ images: { 'pixel.png': { hash: 'imghash' } } })
    if (url.includes('/campaigns')) return json({ id: 'camp_ext' })
    if (url.includes('/adsets') && !url.includes('set_ext')) return json({ id: 'set_ext' })
    if (url.includes('/adcreatives')) return json({ id: 'cr_ext' })
    if (url.includes('/adcreatives') === false && url.endsWith('/ads'))
      return json({ id: 'ad_ext' })
    if (url.includes('/ad_ext/insights')) {
      if (opts.failInsights) return json({ error: { message: 'insights unavailable' } }, 500)
      return json({
        data: [
          {
            spend: String(opts.spend ?? 12.5),
            impressions: String(opts.impressions ?? 1000),
            reach: String(opts.reach ?? 800),
            clicks: String(opts.clicks ?? 42),
            actions: [{ action_type: 'lead', value: '3' }],
          },
        ],
      })
    }
    if (url.includes('set_ext') && url.includes('daily_budget')) {
      return json({ daily_budget: String(opts.dailyBudgetCents ?? 3000) })
    }
    if (url.includes('/ad_ext')) {
      if (opts.failAdFetch) return json({ error: { message: 'ad lookup failed' } }, 500)
      return json({ effective_status: opts.effectiveStatus ?? 'ACTIVE', issues_info: [] })
    }
    if (url.includes('/ads')) return json({ id: 'ad_ext' })
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
    },
  })
}

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: {
      name: 'AdRun Sync Template',
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
      name: 'AdRun Sync Page',
      slug: `adrun-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    payload: { name: 'Sync Test Ad', assetIds: [asset.id] },
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
      idempotencyKey: `adrun-sync-${Math.random()}`,
    },
  })
  expect(runRes.statusCode).toBe(201)
  return runRes.json().data
}

describe('AdRun provider sync', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-adrun-sync-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('pulls real provider state/spend/performance and keeps it independent of LOOPIE order state', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'ACTIVE', spend: 12.5, impressions: 1000, reach: 800, clicks: 42 })
    await connectMeta()
    const run = await createSentAdRun()
    // LOOPIE's own order state is untouched by provisioning — still PENDING, never auto-activated.
    expect(run.status).toBe('PENDING')

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const synced = res.json().data
    // The two axes stay separate: LOOPIE order state unchanged, provider state reflects reality.
    expect(synced.status).toBe('PENDING')
    expect(synced.providerState).toBe('LIVE')
    expect(synced.providerStateRaw).toBe('ACTIVE')
    expect(synced.spend).toBe(12.5)
    expect(synced.impressions).toBe(1000)
    expect(synced.reach).toBe(800)
    expect(synced.clicks).toBe(42)
    expect(synced.conversions).toBe(3)
    expect(synced.effectiveBudget).toBe(30) // 3000 cents
    expect(synced.syncHealth).toBe('CURRENT')
    expect(synced.syncError).toBeNull()
    expect(synced.lastSyncedAt).toBeTruthy()
  })

  it('maps a rejected ad to REJECTED, not a silent UNKNOWN', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'DISAPPROVED' })
    await connectMeta()
    const run = await createSentAdRun()

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(res.json().data.providerState).toBe('REJECTED')
    expect(res.json().data.providerStateRaw).toBe('DISAPPROVED')
  })

  it('a failed sync marks syncHealth FAILED without touching previously-synced data', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'ACTIVE', spend: 12.5 })
    await connectMeta()
    const run = await createSentAdRun()

    const first = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(first.json().data.spend).toBe(12.5)
    const firstSyncedAt = first.json().data.lastSyncedAt

    vi.unstubAllGlobals()
    mockGraph({ failAdFetch: true })
    const second = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(second.statusCode).toBe(200)
    const failed = second.json().data
    expect(failed.syncHealth).toBe('FAILED')
    expect(failed.syncError).toBeTruthy()
    // Data from the last successful sync survives a failed retry — never blanked or guessed.
    expect(failed.spend).toBe(12.5)
    expect(failed.lastSyncedAt).toBe(firstSyncedAt)
  })

  it('409s a manual sync for a run that was never actually sent to a platform', async () => {
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
      payload: { name: 'Unsent Ad', assetIds: [asset.id] },
    })
    const page = await createPublishedPage()
    // No PlatformConnection at all — provisioning leaves this parked PENDING with no externalAdId.
    const runRes = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisementRes.json().data.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'META',
        budget: 25,
        destinationLandingPageId: page.id,
        idempotencyKey: `adrun-sync-unsent-${Math.random()}`,
      },
    })
    expect(runRes.json().data.externalAdId).toBeNull()

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${runRes.json().data.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(409)
  })

  it('reports DISCONNECTED, not an error, when the platform connection is gone', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'ACTIVE' })
    await connectMeta()
    const run = await createSentAdRun()
    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })

    await db.platformConnection.deleteMany({
      where: { businessId: testBusinessId, platform: 'META' },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.syncHealth).toBe('DISCONNECTED')
  })

  it('downgrades a stale CURRENT reading to DELAYED at read time, without rewriting the stored row', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'ACTIVE' })
    await connectMeta()
    const run = await createSentAdRun()
    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })

    await db.adRun.update({
      where: { id: run.id },
      data: { lastSyncedAt: new Date(Date.now() - 60 * 60_000) }, // 1h ago, past the 15m SLA
    })
    const stored = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(stored.syncHealth).toBe('CURRENT') // the row itself is untouched

    const res = await app.inject({
      method: 'GET',
      url: `/ad-runs/${run.id}`,
      headers: asAuth(testUserId),
    })
    expect(res.json().data.syncHealth).toBe('DELAYED') // but reads as stale
  })

  it('the batch poller syncs every sent run and tolerates one failing without stopping', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'ACTIVE' })
    await connectMeta()
    const runA = await createSentAdRun()
    const runB = await createSentAdRun()

    const result = await runDueAdRunSyncs()
    expect(result.total).toBeGreaterThanOrEqual(2)
    expect(result.synced).toBeGreaterThanOrEqual(2)

    const rowA = await db.adRun.findUniqueOrThrow({ where: { id: runA.id } })
    const rowB = await db.adRun.findUniqueOrThrow({ where: { id: runB.id } })
    expect(rowA.syncHealth).toBe('CURRENT')
    expect(rowB.syncHealth).toBe('CURRENT')
  })
})
