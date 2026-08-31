// Regression coverage for safe remote targeting editing — the third field to go through the
// shared IN_PLACE mutation pipeline (see AdRunService._updateInPlaceField), proving it generalizes
// to a third field, not just two. Same contract as budget/schedule: freeze a new
// MediaOrderRevision before attempting the mutation; a rejected mutation (including a location
// that can't be resolved) must leave AdRun pointing at its prior revision/targeting untouched.
// Mirrors adRunSchedule.test.ts's exact Graph-API mocking; no real network calls.
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
    failTargetingUpdate?: boolean
    noLocationMatch?: boolean
    effectiveCountry?: string
    effectiveLocationName?: string
    effectiveRadius?: number
  } = {},
) {
  const calls: GraphCall[] = []
  let currentTargeting: Record<string, unknown> = { geo_locations: { countries: ['US'] } }
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
    if (url.includes('/search') && url.includes('type=adgeolocation')) {
      if (opts.noLocationMatch) return json({ data: [] })
      return json({ data: [{ key: 'geo_123', name: 'Austin, Texas' }] })
    }
    // The targeting mutation POSTs directly to the ad set's own bare id.
    if (method === 'POST' && url.includes('/set_ext') && !url.includes('/insights')) {
      if (opts.failTargetingUpdate) {
        return json({ error: { message: 'Meta rejected the targeting change' } }, 500)
      }
      const params = new URLSearchParams(body)
      if (params.has('targeting')) currentTargeting = JSON.parse(params.get('targeting')!)
      return json({ success: true })
    }
    if (url.includes('/ad_ext/insights')) {
      return json({
        data: [{ spend: '0', impressions: '0', reach: '0', clicks: '0', actions: [] }],
      })
    }
    if (url.includes('/set_ext')) {
      const targeting =
        opts.effectiveLocationName || opts.effectiveCountry
          ? opts.effectiveLocationName
            ? {
                geo_locations: {
                  custom_locations: [
                    { name: opts.effectiveLocationName, radius: opts.effectiveRadius ?? 10 },
                  ],
                },
              }
            : { geo_locations: { countries: [opts.effectiveCountry] } }
          : currentTargeting
      return json({
        daily_budget: '2500',
        start_time: '2026-09-01T00:00:00+0000',
        end_time: null,
        targeting,
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
      defaultCountry: 'US',
    },
  })
}

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: { name: 'Targeting Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'Targeting Page',
      slug: `targeting-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    payload: { name: 'Targeting Test Ad', assetIds: [asset.id] },
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
      idempotencyKey: `targeting-test-${Math.random()}`,
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

describe('AdRun targeting editing', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-targeting-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('a country-only change creates a new revision, sends the mutation, and resyncs effective targeting', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()
    expect(run.mediaOrderRevision.revision).toBe(1)
    const priorRevisionId = run.mediaOrderRevisionId

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/targeting`,
      headers: asAuth(testUserId),
      payload: { country: 'CA' },
    })
    expect(res.statusCode).toBe(200)
    const updated = res.json().data
    expect(updated.country).toBe('CA') // LOOPIE ordered
    expect(updated.locationNote).toBeNull()
    expect(updated.effectiveCountry).toBe('CA') // confirmed via a real resync
    expect(updated.mediaOrderRevision.revision).toBe(2)
    expect(updated.mediaOrderRevisionId).not.toBe(priorRevisionId)

    // History is retained, not overwritten.
    expect(
      await db.mediaOrderRevision.count({ where: { advertisementId: run.advertisementId } }),
    ).toBe(2)
  })

  it('a radius location resolves via Meta search and sends real custom_locations targeting', async () => {
    enableMeta()
    const calls = mockGraph()
    await connectMeta()
    const run = await createSentAdRun()

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/targeting`,
      headers: asAuth(testUserId),
      payload: { country: 'US', locationNote: 'Austin, TX', radiusMiles: 15 },
    })
    expect(res.statusCode).toBe(200)
    const updated = res.json().data
    expect(updated.locationNote).toBe('Austin, TX')
    expect(updated.radiusMiles).toBe(15)

    const searchCall = calls.find(
      (c) => c.url.includes('/search') && c.url.includes('type=adgeolocation'),
    )
    expect(searchCall).toBeTruthy()
    const mutationCall = calls.find(
      (c) => c.method === 'POST' && c.url.includes('/set_ext') && !c.url.includes('/insights'),
    )
    const sentTargeting = JSON.parse(new URLSearchParams(mutationCall!.body).get('targeting')!)
    expect(sentTargeting.geo_locations.custom_locations[0].key).toBe('geo_123')
    expect(sentTargeting.geo_locations.custom_locations[0].radius).toBe(15)
  })

  it('a location Meta cannot resolve is a rejected mutation, not a silent country-only fallback', async () => {
    enableMeta()
    mockGraph({ noLocationMatch: true })
    await connectMeta()
    const run = await createSentAdRun()
    const priorRevisionId = run.mediaOrderRevisionId

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/targeting`,
      headers: asAuth(testUserId),
      payload: { country: 'US', locationNote: 'Nowhereville', radiusMiles: 10 },
    })
    expect(res.statusCode).toBe(502)

    const row = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(row.locationNote).toBeNull() // untouched — never silently narrowed to country-only
    expect(row.mediaOrderRevisionId).toBe(priorRevisionId)
  })

  it('a rejected mutation keeps the new revision in history but never makes it effective', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()
    const priorRevisionId = run.mediaOrderRevisionId

    mockGraph({ failTargetingUpdate: true })
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/targeting`,
      headers: asAuth(testUserId),
      payload: { country: 'GB' },
    })
    expect(res.statusCode).toBe(502)

    const row = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(row.country).not.toBe('GB')
    expect(row.mediaOrderRevisionId).toBe(priorRevisionId)

    const attempts = await db.mediaOrderRevision.findMany({
      where: { advertisementId: run.advertisementId },
      orderBy: { revision: 'asc' },
    })
    expect(attempts).toHaveLength(2)
    expect(attempts[1]!.id).not.toBe(row.mediaOrderRevisionId)
  })

  it('surfaces drift when the platform ultimately reports different effective targeting than requested', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()

    mockGraph({ effectiveCountry: 'MX' })
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/targeting`,
      headers: asAuth(testUserId),
      payload: { country: 'CA' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.country).toBe('CA') // what LOOPIE requested
    // What Facebook actually reports — never blended into the requested value.
    expect(res.json().data.effectiveCountry).not.toBe(res.json().data.country)
  })

  it('refuses to edit targeting locally-only for a disconnected external run', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const run = await createSentAdRun()
    await db.platformConnection.deleteMany({
      where: { businessId: testBusinessId, platform: 'META' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/targeting`,
      headers: asAuth(testUserId),
      payload: { country: 'CA' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/reconnect META/i)

    const row = await db.adRun.findUniqueOrThrow({ where: { id: run.id } })
    expect(row.country).not.toBe('CA')
    expect(
      await db.mediaOrderRevision.count({ where: { advertisementId: run.advertisementId } }),
    ).toBe(1)
  })

  it('400s a missing country before ever touching the connector', async () => {
    enableMeta()
    const calls = mockGraph()
    await connectMeta()
    const run = await createSentAdRun()

    calls.length = 0
    const res = await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/targeting`,
      headers: asAuth(testUserId),
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(calls.length).toBe(0)
  })
})
