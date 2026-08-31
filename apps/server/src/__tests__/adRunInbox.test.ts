// Regression coverage for the Inbox projection — the product decision recorded 2026-08-28: ad-run
// mutation events project into curated Inbox messages (InboxThread/InboxMessage), not the
// concurrent session's Activity feed. Proves the full mapped event set posts the right message,
// that one thread is reused per (Advertisement, platform) rather than fragmenting, and that
// routine/uninteresting syncs stay audit-only (no Inbox noise). Mirrors adRunReplace.test.ts's
// exact Graph-API mocking; no real network calls.
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

function mockGraph(
  opts: {
    failPush?: boolean
    failMutation?: boolean
    effectiveStatus?: string
    issues?: string[]
  } = {},
) {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.includes('/adimages')) return json({ images: { 'pixel.png': { hash: 'imghash' } } })
    if (url.includes('/search') && url.includes('type=adgeolocation')) {
      return json({ data: [{ key: 'geo_123', name: 'Austin, Texas' }] })
    }
    if (url.includes('/act_1/campaigns')) {
      if (opts.failPush) return json({ error: { message: 'Meta rejected the campaign' } }, 500)
      return json({ id: 'camp_ext' })
    }
    if (url.includes('/act_1/adsets')) return json({ id: 'set_ext' })
    if (url.includes('/act_1/adcreatives')) return json({ id: 'cr_ext' })
    if (url.includes('/act_1/ads')) return json({ id: 'ad_ext' })
    if (method === 'POST' && url.includes('/set_ext') && !url.includes('/insights')) {
      if (opts.failMutation) return json({ error: { message: 'Meta rejected the change' } }, 500)
      return json({ success: true })
    }
    if (url.includes('/ad_ext/insights')) {
      return json({
        data: [{ spend: '0', impressions: '0', reach: '0', clicks: '0', actions: [] }],
      })
    }
    if (url.includes('/set_ext')) {
      return json({ daily_budget: '2500', start_time: '2026-09-01T00:00:00+0000', end_time: null })
    }
    if (url.includes('/ad_ext')) {
      return json({
        effective_status: opts.effectiveStatus ?? 'ACTIVE',
        issues_info: (opts.issues ?? []).map((m) => ({ error_message: m })),
      })
    }
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
  return page
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

async function createSentAdRun() {
  const asset = await createAsset('Inbox Test Asset')
  const page = await createPublishedPage('Inbox Test Page')
  const advertisementRes = await app.inject({
    method: 'POST',
    url: '/advertisements',
    headers: asAuth(testUserId),
    payload: { name: 'Inbox Test Ad', assetIds: [asset.id] },
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
      destinationLandingPageId: page.id,
      idempotencyKey: `inbox-test-${Math.random()}`,
      orderSnapshot: { dailyBudget: 25, where: 'Facebook Feed', goal: 'Get Leads' },
    },
  })
  return { advertisementId, run: runRes.json().data, asset, page }
}

async function threadFor(advertisementId: string) {
  return db.inboxThread.findUnique({
    where: { advertisementId_platform: { advertisementId, platform: 'META' } },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}

describe('AdRun Inbox projection', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'loopie-inbox-'))
    vi.stubEnv('UPLOAD_DIR', dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    await rm(dir, { recursive: true, force: true })
  })

  it('posts a budget-updated message with the real before/after values', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisementId, run } = await createSentAdRun()

    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/budget`,
      headers: asAuth(testUserId),
      payload: { dailyBudget: 40 },
    })

    const thread = await threadFor(advertisementId)
    expect(thread).toBeTruthy()
    expect(thread!.subject).toBe('META · Inbox Test Ad')
    expect(thread!.messages).toHaveLength(1)
    expect(thread!.messages[0]!.subject).toBe('Ad budget updated')
    expect(thread!.messages[0]!.body).toBe('$25.00/day → $40.00/day')
  })

  it('reuses one thread per (Advertisement, platform) across multiple event types, in order', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisementId, run } = await createSentAdRun()

    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/budget`,
      headers: asAuth(testUserId),
      payload: { dailyBudget: 40 },
    })
    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/schedule`,
      headers: asAuth(testUserId),
      payload: { startDate: '2026-09-01T00:00:00.000Z', endDate: '2026-09-18T00:00:00.000Z' },
    })
    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/targeting`,
      headers: asAuth(testUserId),
      payload: { country: 'US', locationNote: 'Austin, TX', radiusMiles: 25 },
    })

    const thread = await threadFor(advertisementId)
    expect(thread!.messages.map((m) => m.subject)).toEqual([
      'Ad budget updated',
      'Ad schedule updated',
      'Ad targeting updated',
    ])
    expect(thread!.messages[1]!.body).toContain('Now runs through')
    expect(thread!.messages[2]!.body).toBe('Austin, TX · 25 mi (US)')
  })

  it('posts "new ad version is live" on a successful creative replacement', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisementId, run, advertisementId: adId } = await createSentAdRun()
    const replacement = await createAsset('Replacement Asset')
    await app.inject({
      method: 'PATCH',
      url: `/advertisements/${adId}`,
      headers: asAuth(testUserId),
      payload: { assetIds: [replacement.id] },
    })

    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/replace-creative`,
      headers: asAuth(testUserId),
      payload: {},
    })

    const thread = await threadFor(advertisementId)
    expect(thread!.messages).toHaveLength(1)
    expect(thread!.messages[0]!.subject).toBe('New ad version is live')
    expect(thread!.messages[0]!.body).toBe(
      'Revision 2 replaced revision 1. Previous version has stopped.',
    )
  })

  it('posts "ad destination changed" naming the new page on a successful destination replacement', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisementId, run } = await createSentAdRun()
    const newPage = await createPublishedPage('Fall Consultation')

    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/replace-destination`,
      headers: asAuth(testUserId),
      payload: { destinationLandingPageId: newPage.id },
    })

    const thread = await threadFor(advertisementId)
    expect(thread!.messages[0]!.subject).toBe('Ad destination changed')
    expect(thread!.messages[0]!.body).toBe('Now points to "Fall Consultation".')
  })

  it('posts "replacement couldn\'t go live" and explains the current version keeps running when a replacement fails', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisementId, run, advertisementId: adId } = await createSentAdRun()
    const replacement = await createAsset('Failed Replacement Asset')
    await app.inject({
      method: 'PATCH',
      url: `/advertisements/${adId}`,
      headers: asAuth(testUserId),
      payload: { assetIds: [replacement.id] },
    })

    mockGraph({ failPush: true })
    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/replace-creative`,
      headers: asAuth(testUserId),
      payload: {},
    })

    const thread = await threadFor(advertisementId)
    expect(thread!.messages[0]!.subject).toBe("Replacement couldn't go live")
    expect(thread!.messages[0]!.body).toContain('Your current version is still running.')
  })

  it('does not post an Inbox message for a routine, uninteresting sync', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisementId, run } = await createSentAdRun()

    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })

    expect(await threadFor(advertisementId)).toBeNull()
  })

  it('posts a provider-rejection message only the first time it appears, not on every subsequent sync', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'DISAPPROVED', issues: ['Missing disclaimer'] })
    await connectMeta()
    const { advertisementId, run } = await createSentAdRun()

    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })
    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })

    const thread = await threadFor(advertisementId)
    expect(thread!.messages).toHaveLength(1)
    expect(thread!.messages[0]!.subject).toBe('META rejected this ad')
    expect(thread!.messages[0]!.body).toContain('Missing disclaimer')
  })

  it('posts a delivery-limitation message distinct from outright rejection', async () => {
    enableMeta()
    mockGraph({ effectiveStatus: 'WITH_ISSUES', issues: ['Reach is limited'] })
    await connectMeta()
    const { advertisementId, run } = await createSentAdRun()

    await app.inject({
      method: 'POST',
      url: `/ad-runs/${run.id}/sync`,
      headers: asAuth(testUserId),
    })

    const thread = await threadFor(advertisementId)
    expect(thread!.messages[0]!.subject).toBe('META limited delivery')
  })

  // Not exercised by any real caller yet (no email/SMS transport is wired) — proves the
  // polymorphism itself is real, not just typed: a CONTACT thread and an ADVERTISEMENT thread for
  // the same business coexist without colliding on either compound unique, and a second message to
  // the same Contact reuses its thread instead of fragmenting. See CLAUDE.md's note on why this
  // schema was revised before any real data existed — this is the validation that revision asked
  // for.
  it('supports a CONTACT-typed thread alongside an ADVERTISEMENT-typed one for the same business, without collision', async () => {
    enableMeta()
    mockGraph()
    await connectMeta()
    const { advertisementId } = await createSentAdRun()
    const contact = await db.contact.create({
      data: { businessId: testBusinessId, name: 'Sarah Chen', email: 'sarah@example.com' },
    })

    const { InboxProjectionService } = await import('../services/InboxProjectionService')
    await InboxProjectionService.postMessage({
      businessId: testBusinessId,
      thread: { type: 'CONTACT', contactId: contact.id },
      threadSubject: 'Sarah Chen',
      kind: 'SMS',
      direction: 'INBOUND',
      body: 'Yes, Thursday works for me.',
    })
    await InboxProjectionService.postMessage({
      businessId: testBusinessId,
      thread: { type: 'CONTACT', contactId: contact.id },
      threadSubject: 'Sarah Chen',
      kind: 'SMS',
      direction: 'OUTBOUND',
      body: 'Great, see you then!',
    })

    const contactThread = await db.inboxThread.findUnique({
      where: { contactId: contact.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    expect(contactThread!.type).toBe('CONTACT')
    expect(contactThread!.advertisementId).toBeNull()
    expect(contactThread!.messages).toHaveLength(2) // reused the thread, not fragmented
    expect(contactThread!.messages[0]!.direction).toBe('INBOUND')
    expect(contactThread!.messages[1]!.direction).toBe('OUTBOUND')

    const adThread = await threadFor(advertisementId)
    expect(adThread).toBeNull() // no ad-run mutation happened in this test — proves no cross-talk
  })
})
