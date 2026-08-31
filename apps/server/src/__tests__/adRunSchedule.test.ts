// Regression coverage for safe remote schedule editing — the closest cousin to budget editing,
// proving the revision pattern generalizes. Freezes a new MediaOrderRevision before attempting
// the mutation; a rejected mutation must leave AdRun pointing at its prior revision/schedule
// untouched. Mirrors adRunBudget.test.ts's exact Graph-API mocking; no real network calls.
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

function mockGraph(
  opts: {
    failScheduleUpdate?: boolean
    effectiveStartAt?: string
    effectiveEndAt?: string | null
  } = {},
) {
  const calls: GraphCall[] = []
  let currentStart = '2026-09-01T00:00:00+0000'
  let currentEnd: string | null = null
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
    // The schedule mutation POSTs directly to the ad set's own bare id.
    if (method === 'POST' && url.includes('/set_ext') && !url.includes('/insights')) {
      if (opts.failScheduleUpdate) {
        return json({ error: { message: 'Meta rejected the schedule change' } }, 500)
      }
      const params = new URLSearchParams(body)
      if (params.has('start_time')) currentStart = params.get('start_time')!
      if (params.has('end_time')) currentEnd = params.get('end_time') || null
      return json({ success: true })
    }
    if (url.includes('/ad_ext/insights')) {
      return json({
        data: [{ spend: '0', impressions: '0', reach: '0', clicks: '0', actions: [] }],
      })
    }
    if (url.includes('/set_ext')) {
      return json({
        daily_budget: '2500',
        start_time: opts.effectiveStartAt ?? currentStart,
        end_time: opts.effectiveEndAt !== undefined ? opts.effectiveEndAt : currentEnd,
      })
    }
    if (url.includes('/ad_ext')) return json({ effective_status: 'ACTIVE', issues_info: [] })
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
    data: { name: 'Schedule Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'Schedule Page',
      slug: `schedule-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    payload: { name: 'Schedule Test Ad', assetIds: [asset.id] },
  })
  const page = await createPublishedPage()
  const runRes = await app.inject({
    method: 'POST',
    url: `/advertisements/${advertisementRes.json().data.id}/runs`,
    headers: asAuth(testUserId),
    payload: {
      platform: 'META',
      budget: 25,
      startDate: '2026-09-01T00:00:00.000Z',
      destinationLandingPageId: page.id,
      idempotencyKey: `schedule-test-${Math.random()}`,
      orderSnapshot: {
        dailyBudget: 25,
        where: 'Facebook Feed',
        goal: 'Get Leads',
        assetIds: [asset.id],
      },
    },
  })
  return runRes.json().data
}

describe('AdRun schedule editing', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-schedule-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('a successful change creates a new revision, sends the mutation, and resyncs the effective schedule', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()
    expect(run.mediaOrderRevision.revision).toBe(1)
    const priorRevisionId = run.mediaOrderRevisionId

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: { startDate: '2026-09-15T00:00:00.000Z', endDate: '2026-09-30T00:00:00.000Z' },
    })
    expect(res.statusCode).toBe(200)
    const updated = res.json().data
    expect(updated.startDate).toBe('2026-09-15T00:00:00.000Z') // LOOPIE ordered
    expect(updated.endDate).toBe('2026-09-30T00:00:00.000Z')
    expect(updated.effectiveStartDate).toBeTruthy() // confirmed via a real resync
    expect(updated.mediaOrderRevision.revision).toBe(2)
    expect(updated.mediaOrderRevisionId).not.toBe(priorRevisionId)

    // History is retained, not overwritten.
    const revision1 = await db.mediaOrderRevision.findUniqueOrThrow({
      where: { id: priorRevisionId },
    })
    expect(revision1.endAt).toBeNull()
    expect(
      await db.mediaOrderRevision.count({ where: { advertisementId: run.advertisementId } }),
    ).toBe(2)
  })

  it('explicit no-end-date semantics: sending endDate null clears it, both locally and at the platform', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()

    const withEnd = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: { startDate: '2026-09-01T00:00:00.000Z', endDate: '2026-09-30T00:00:00.000Z' },
    })
    expect(withEnd.json().data.endDate).toBeTruthy()

    const cleared = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: { startDate: '2026-09-01T00:00:00.000Z', endDate: null },
    })
    expect(cleared.statusCode).toBe(200)
    expect(cleared.json().data.endDate).toBeNull()
    expect(cleared.json().data.mediaOrderRevision.endAt).toBeNull()
  })

  it('a rejected mutation keeps the new revision in history but never makes it effective', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()
    const priorRevisionId = run.mediaOrderRevisionId

    mockGraph({ failScheduleUpdate: true })
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: { startDate: '2026-10-01T00:00:00.000Z' },
    })
    expect(res.statusCode).toBe(502)

    const row = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(row.startDate?.toISOString()).toBe('2026-09-01T00:00:00.000Z') // untouched
    expect(row.mediaOrderRevisionId).toBe(priorRevisionId)

    const attempts = await db.mediaOrderRevision.findMany({
      where: { advertisementId: run.advertisementId },
      orderBy: { revision: 'asc' },
    })
    expect(attempts).toHaveLength(2)
    expect(attempts[1]!.id).not.toBe(row.mediaOrderRevisionId)
  })

  it('surfaces drift when the platform ultimately reports a different effective schedule than requested', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()

    mockGraph({ effectiveStartAt: '2026-09-16T00:00:00+0000' })
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: { startDate: '2026-09-15T00:00:00.000Z' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.startDate).toBe('2026-09-15T00:00:00.000Z') // what LOOPIE requested
    // What Facebook actually reports — a day later, never blended into the requested value.
    expect(res.json().data.effectiveStartDate).not.toBe(res.json().data.startDate)
  })

  it('refuses to edit schedule locally-only for a disconnected external run', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()
    await db.platformConnection.deleteMany({
      where: { businessId: testBusinessId, platform: 'META' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: { startDate: '2026-10-01T00:00:00.000Z' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/reconnect META/i)

    const row = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(row.startDate?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(
      await db.mediaOrderRevision.count({ where: { advertisementId: run.advertisementId } }),
    ).toBe(1)
  })

  it('409s an end date before the start date, and a missing start date, before ever touching the connector', async () => {
    enableMeta()
    const calls = mockGraph()
    await connectMeta()
    const run = await createSentAdRun()

    calls.length = 0
    const badOrder = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: { startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-09-01T00:00:00.000Z' },
    })
    expect(badOrder.statusCode).toBe(400)

    const missingStart = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: {},
    })
    expect(missingStart.statusCode).toBe(400)
    expect(calls.length).toBe(0)
  })
})
