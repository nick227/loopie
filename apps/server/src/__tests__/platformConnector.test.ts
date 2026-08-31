import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { saveMediaFile } from '../lib/mediaStorage'
import { issueOAuthState } from '../lib/platforms/oauthState'
import { sealToken, unsealToken } from '../lib/platforms/encrypt'

const app = buildTestApp()

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const META_ENV = {
  META_APP_ID: 'app-id',
  META_APP_SECRET: 'app-secret',
  META_REDIRECT_URI: 'http://localhost:3001/platforms/META/oauth/callback',
  SESSION_SECRET: 'test-session-secret-at-least-32-chars',
}

type GraphCall = { url: string; body: string }

function json(data: unknown, status = 200) {
  return { ok: status < 400, json: async () => data }
}

function mockGraph() {
  const calls: GraphCall[] = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const body = typeof init?.body === 'string' ? init.body : ''
    calls.push({ url, body })
    if (url.includes('/oauth/access_token')) {
      return json({ access_token: 'RAW_TOKEN', expires_in: 3600 })
    }
    if (url.includes('/me/adaccounts')) {
      return json({
        data: [
          { id: 'act_1', name: 'Acme Ads', currency: 'USD', timezone_name: 'America/Chicago' },
        ],
      })
    }
    if (url.includes('/me/accounts')) {
      return json({ data: [{ id: 'page_1', name: 'Acme Page' }] })
    }
    if (url.includes('/me')) return json({ id: 'user_1' })
    if (url.includes('/adimages')) {
      return json({ images: { 'pixel.png': { hash: 'imghash' } } })
    }
    if (url.includes('/campaigns')) return json({ id: 'camp_ext' })
    if (url.includes('/adsets')) return json({ id: 'set_ext' })
    if (url.includes('/adcreatives')) return json({ id: 'cr_ext' })
    if (url.includes('/ads')) return json({ id: 'ad_ext' })
    return json({ error: { message: `unmocked ${url}` } }, 500)
  })
  return calls
}

function enableMeta() {
  for (const [key, value] of Object.entries(META_ENV)) vi.stubEnv(key, value)
}

async function seedImageCreative() {
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
  return db.creative.create({
    data: {
      businessId: testBusinessId,
      name: 'Hero',
      assets: { create: [{ assetId: asset.id }] },
    },
  })
}

describe('platform connectors', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-platform-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('returns empty capabilities for an unregistered platform and 501 on connect/push', async () => {
    const get = await app.inject({
      method: 'GET',
      url: '/platforms/GOOGLE',
      headers: asAuth(testUserId),
    })
    expect(get.statusCode).toBe(200)
    expect(get.json().data.capabilities.oauth).toBe(false)
    expect(get.json().data.capabilities.pushDraft).toBe(false)

    const start = await app.inject({
      method: 'GET',
      url: '/platforms/GOOGLE/oauth/start',
      headers: asAuth(testUserId),
    })
    expect(start.statusCode).toBe(501)
    expect(start.json().error).toMatch(/platform-integration-matrix/)

    const creative = await db.creative.create({
      data: { businessId: testBusinessId, name: 'Google creative' },
    })
    const campaignRes = await app.inject({
      method: 'POST',
      url: '/campaigns',
      headers: asAuth(testUserId),
      payload: { name: 'Google campaign', platforms: ['GOOGLE'], creativeIds: [creative.id] },
    })
    expect(campaignRes.statusCode).toBe(201)
    const deployment = await db.deployment.findFirstOrThrow({
      where: { campaignId: campaignRes.json().data.id },
    })
    const push = await app.inject({
      method: 'POST',
      url: `/deployments/${deployment.id}/push`,
      headers: asAuth(testUserId),
    })
    expect(push.statusCode).toBe(501)
  })

  it('returns 503 when Meta env is unset', async () => {
    vi.stubEnv('META_APP_ID', '')
    vi.stubEnv('META_APP_SECRET', '')
    vi.stubEnv('META_REDIRECT_URI', '')
    const start = await app.inject({
      method: 'GET',
      url: '/platforms/META/oauth/start',
      headers: asAuth(testUserId),
    })
    expect(start.statusCode).toBe(503)
  })

  it('oauth start URL contains the app id and signed state', async () => {
    enableMeta()
    const res = await app.inject({
      method: 'GET',
      url: '/platforms/META/oauth/start?returnPath=/campaigns/abc',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    const url = new URL(res.json().data.url)
    expect(url.searchParams.get('client_id')).toBe('app-id')
    expect(url.searchParams.get('state')).toBeTruthy()
  })

  it('callback stores an encrypted token, not the raw access token', async () => {
    enableMeta()
    mockGraph()
    const state = issueOAuthState({
      businessId: testBusinessId,
      platform: 'META',
      returnPath: '/campaigns',
    })
    const res = await app.inject({
      method: 'GET',
      url: `/platforms/META/oauth/callback?code=ok&state=${encodeURIComponent(state)}`,
    })
    expect(res.statusCode).toBe(302)
    expect(String(res.headers.location)).toContain('connected=META')

    const row = await db.platformConnection.findUniqueOrThrow({
      where: { businessId_platform: { businessId: testBusinessId, platform: 'META' } },
    })
    expect(row.accessTokenEnc).not.toBe('RAW_TOKEN')
    expect(row.accessTokenEnc).not.toContain('RAW_TOKEN')
    expect(unsealToken(row.accessTokenEnc)).toBe('RAW_TOKEN')
    expect(row.status).toBe('INCOMPLETE')
  })

  it('selecting an ad account fetches and persists its real name/currency/timezone', async () => {
    enableMeta()
    mockGraph()
    await db.platformConnection.create({
      data: {
        businessId: testBusinessId,
        platform: 'META',
        accessTokenEnc: sealToken('RAW_TOKEN'),
        status: 'INCOMPLETE',
      },
    })

    const res = await app.inject({
      method: 'PATCH',
      url: '/platforms/META',
      headers: asAuth(testUserId),
      payload: { adAccountId: 'act_1' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.accountName).toBe('Acme Ads')
    expect(res.json().data.currency).toBe('USD')
    expect(res.json().data.timezone).toBe('America/Chicago')

    // Re-sending the same adAccountId (a no-op PATCH, e.g. also setting pageId) must not refetch —
    // the identity is only re-resolved on a genuine account change.
    const calls = mockGraph()
    const again = await app.inject({
      method: 'PATCH',
      url: '/platforms/META',
      headers: asAuth(testUserId),
      payload: { adAccountId: 'act_1', pageId: 'page_1' },
    })
    expect(again.statusCode).toBe(200)
    expect(again.json().data.accountName).toBe('Acme Ads')
    expect(calls.some((call) => call.url.includes('/me/adaccounts'))).toBe(false)
  })

  it('rejects push without a mapped Page; writes external ids as PENDING; second push is a no-op', async () => {
    enableMeta()
    const calls = mockGraph()
    await db.platformConnection.create({
      data: {
        businessId: testBusinessId,
        platform: 'META',
        accessTokenEnc: sealToken('RAW_TOKEN'),
        status: 'INCOMPLETE',
        adAccountId: 'act_1',
      },
    })
    const creative = await seedImageCreative()
    const campaignRes = await app.inject({
      method: 'POST',
      url: '/campaigns',
      headers: asAuth(testUserId),
      payload: {
        name: 'Push campaign',
        budget: 50,
        startDate: new Date().toISOString(),
        platforms: ['META'],
        creativeIds: [creative.id],
      },
    })
    expect(campaignRes.statusCode).toBe(201)
    const deployment = await db.deployment.findFirstOrThrow({
      where: { campaignId: campaignRes.json().data.id },
    })

    const missing = await app.inject({
      method: 'POST',
      url: `/deployments/${deployment.id}/push`,
      headers: asAuth(testUserId),
    })
    expect(missing.statusCode).toBe(409)

    await app.inject({
      method: 'PATCH',
      url: '/platforms/META',
      headers: asAuth(testUserId),
      payload: { pageId: 'page_1' },
    })

    const pushed = await app.inject({
      method: 'POST',
      url: `/deployments/${deployment.id}/push`,
      headers: asAuth(testUserId),
    })
    expect(pushed.statusCode).toBe(200)
    expect(pushed.json().data.status).toBe('PENDING')
    expect(pushed.json().data.externalCampaignId).toBe('camp_ext')
    expect(pushed.json().data.externalAdSetId).toBe('set_ext')
    expect(pushed.json().data.externalAdId).toBe('ad_ext')
    expect(calls.some((call) => call.body.includes('status=ACTIVE'))).toBe(false)
    expect(calls.some((call) => call.body.includes('status=PAUSED'))).toBe(true)

    const graphBefore = calls.length
    const again = await app.inject({
      method: 'POST',
      url: `/deployments/${deployment.id}/push`,
      headers: asAuth(testUserId),
    })
    expect(again.statusCode).toBe(200)
    expect(again.json().data.externalAdId).toBe('ad_ext')
    expect(calls.length).toBe(graphBefore)
  })
})
