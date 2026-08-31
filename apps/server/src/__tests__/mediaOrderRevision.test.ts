// Regression coverage for the Phase 1 (scoped down) media-order versioning slice — see
// mediaOrderRevision.ts's doc comment. Proves the durable-record guarantee: numbered per
// destination, immutable once frozen, and idempotent-safe. Mirrors adRunProvisioning.test.ts's
// exact Graph-API mocking so this makes no real network calls.
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

function mockGraph() {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/adimages')) return json({ images: { 'pixel.png': { hash: 'imghash' } } })
    // pushDraft resolves a real locationNote via Meta's own ad-geolocation search before sending
    // targeting — not exercised by this file's own assertions, just needs a match so push succeeds.
    if (url.includes('/search') && url.includes('type=adgeolocation')) {
      return json({ data: [{ key: 'geo_123', name: 'Austin, Texas' }] })
    }
    if (url.includes('/campaigns')) return json({ id: 'camp_ext' })
    if (url.includes('/adsets')) return json({ id: 'set_ext' })
    if (url.includes('/adcreatives')) return json({ id: 'cr_ext' })
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
      accountName: 'Acme Ads',
      currency: 'USD',
      pageId: 'page_1',
    },
  })
}

async function createAdvertisementWithImage(name = 'Revision Test Ad') {
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
  const res = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(testUserId),
    payload: { name, assetIds: [asset.id] },
  })
  return { advertisement: res.json().data, assetId: asset.id }
}

async function createPublishedPage() {
  const template = await db.landingPageTemplate.create({
    data: { name: 'Revision Template', isSystem: true, schema: { sections: [], themeTokens: [] } },
  })
  const pageRes = await app.inject({
    method: 'POST',
    url: '/landing-pages',
    headers: asAuth(testUserId),
    payload: {
      templateId: template.id,
      name: 'Revision Page',
      slug: `revision-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

describe('Media order revisions', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-revision-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('freezes a numbered revision with the real account/order fields, linked from the AdRun', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisement, assetId } = await createAdvertisementWithImage()
    const page = await createPublishedPage()

    const res = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'META',
        placement: 'FEED',
        budget: 25,
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T00:00:00.000Z',
        destinationLandingPageId: page.id,
        idempotencyKey: 'revision-first-send',
        orderSnapshot: {
          dailyBudget: 25,
          where: 'Facebook Feed',
          goal: 'Get Leads',
          successEvent: 'Lead created',
          country: 'US',
          location: 'Austin + 25 miles',
          destinationLandingPageVersion: null,
          assetIds: [assetId],
        },
      },
    })
    expect(res.statusCode).toBe(201)
    const run = res.json().data
    expect(run.mediaOrderRevisionId).toBeTruthy()
    expect(run.mediaOrderRevision).toMatchObject({
      revision: 1,
      goal: 'Get Leads',
      successEvent: 'Lead created',
      country: 'US',
      locationNote: 'Austin + 25 miles',
      dailyBudgetMinor: 2500,
      accountName: 'Acme Ads',
      accountCurrency: 'USD',
      adAccountId: 'act_1',
      assetIds: [assetId],
    })
    expect(run.mediaOrderRevision.contentHash).toBeTruthy()
  })

  it('an idempotent retry returns the same revision, never a second one', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisement, assetId } = await createAdvertisementWithImage()
    const page = await createPublishedPage()
    const payload = {
      platform: 'META',
      budget: 25,
      destinationLandingPageId: page.id,
      idempotencyKey: 'revision-retry',
      orderSnapshot: {
        dailyBudget: 25,
        where: 'Facebook Feed',
        goal: 'Get Leads',
        assetIds: [assetId],
      },
    }

    const first = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload,
    })
    const retry = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload,
    })
    expect(retry.json().data.mediaOrderRevisionId).toBe(first.json().data.mediaOrderRevisionId)
    expect(
      await db.mediaOrderRevision.count({ where: { advertisementId: advertisement.id } }),
    ).toBe(1)
  })

  it('a relaunch to the same destination continues the revision sequence, not a fresh count', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisement, assetId } = await createAdvertisementWithImage()
    const page = await createPublishedPage()

    const first = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'META',
        placement: 'FEED',
        budget: 25,
        destinationLandingPageId: page.id,
        idempotencyKey: 'revision-relaunch-1',
        orderSnapshot: {
          dailyBudget: 25,
          where: 'Facebook Feed',
          goal: 'Get Leads',
          assetIds: [assetId],
        },
      },
    })
    expect(first.json().data.mediaOrderRevision.revision).toBe(1)

    const relaunch = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'META',
        placement: 'FEED',
        budget: 40, // the whole point of a relaunch: something actually changed
        destinationLandingPageId: page.id,
        supersedesRunId: first.json().data.id,
        idempotencyKey: 'revision-relaunch-2',
        orderSnapshot: {
          dailyBudget: 40,
          where: 'Facebook Feed',
          goal: 'Get Leads',
          assetIds: [assetId],
        },
      },
    })
    expect(relaunch.json().data.mediaOrderRevision.revision).toBe(2)
    expect(relaunch.json().data.mediaOrderRevision.dailyBudgetMinor).toBe(4000)
    // The old run was ended, but its own frozen revision 1 must still read exactly as it did.
    const supersededRun = await db.adRun.findUniqueOrThrow({ where: { id: first.json().data.id } })
    expect(supersededRun.status).toBe('ENDED')
    const revision1 = await db.mediaOrderRevision.findUniqueOrThrow({
      where: { id: supersededRun.mediaOrderRevisionId! },
    })
    expect(revision1.dailyBudgetMinor).toBe(2500)
  })

  it('editing the Advertisement after a send never rewrites the already-frozen revision', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisement, assetId } = await createAdvertisementWithImage('Original Name')
    const page = await createPublishedPage()

    const sent = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'META',
        budget: 25,
        destinationLandingPageId: page.id,
        idempotencyKey: 'revision-immutable',
        orderSnapshot: {
          dailyBudget: 25,
          where: 'Facebook Feed',
          goal: 'Get Leads',
          assetIds: [assetId],
        },
      },
    })
    const revisionId = sent.json().data.mediaOrderRevisionId

    // Rename the Advertisement and swap its media after the send.
    const saved2 = await saveMediaFile({ mimeType: 'image/png', data: PNG_1X1 })
    const asset2 = await db.asset.create({
      data: {
        businessId: testBusinessId,
        type: 'IMAGE',
        name: 'New Pixel',
        url: saved2.url,
        mimeType: 'image/png',
      },
    })
    await app.inject({
      method: 'PATCH',
      url: `/advertisements/${advertisement.id}`,
      headers: asAuth(testUserId),
      payload: { name: 'Renamed After Send', assetIds: [asset2.id] },
    })

    const revision = await db.mediaOrderRevision.findUniqueOrThrow({ where: { id: revisionId } })
    expect(revision.assetIds).toEqual([assetId]) // still the original asset, not the swapped one

    const runNow = await app.inject({
      method: 'GET',
      url: `/ad-runs/${sent.json().data.id}`,
      headers: asAuth(testUserId),
    })
    expect(runNow.json().data.mediaOrderRevision.assetIds).toEqual([assetId])
  })

  it('two different destinations on the same Advertisement get independent revision sequences', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisement, assetId } = await createAdvertisementWithImage()
    const page = await createPublishedPage()

    const metaRun = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'META',
        placement: 'FEED',
        budget: 25,
        destinationLandingPageId: page.id,
        idempotencyKey: 'revision-dest-meta',
        orderSnapshot: {
          dailyBudget: 25,
          where: 'Facebook Feed',
          goal: 'Get Leads',
          assetIds: [assetId],
        },
      },
    })
    const loopieRun = await app.inject({
      method: 'POST',
      url: `/advertisements/${advertisement.id}/runs`,
      headers: asAuth(testUserId),
      payload: {
        platform: 'LOOPIE',
        placement: 'PAGE',
        budget: 0,
        destinationLandingPageId: page.id,
        idempotencyKey: 'revision-dest-loopie',
        orderSnapshot: { dailyBudget: 0, where: 'Pages', goal: 'Get Leads', assetIds: [assetId] },
      },
    })
    expect(metaRun.json().data.mediaOrderRevision.revision).toBe(1)
    expect(loopieRun.json().data.mediaOrderRevision.revision).toBe(1)
  })
})
