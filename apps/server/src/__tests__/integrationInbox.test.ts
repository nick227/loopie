// Regression coverage for the honest subset of "integration failures/recovery" (2026-08-28): only
// real transitions post to Inbox — connecting into CONNECTED status, and an explicit disconnect.
// No automatic failure detection exists anywhere in this codebase (see integrationInbox.ts's own
// doc comment), so there is deliberately no test here claiming one.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { sealToken } from '../lib/platforms/encrypt'

const app = buildTestApp()

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
    if (url.includes('/me/adaccounts')) {
      return json({
        data: [
          {
            id: 'act_1',
            name: 'Acme Ads',
            account_id: '1',
            currency: 'USD',
            timezone_name: 'America/Chicago',
          },
        ],
      })
    }
    return json({ error: { message: `unmocked ${url}` } }, 500)
  })
}

function enableMeta() {
  for (const [key, value] of Object.entries(META_ENV)) vi.stubEnv(key, value)
}

async function threadForIntegration(platform: string) {
  return db.inboxThread.findUnique({
    where: {
      businessId_integrationPlatform: { businessId: testBusinessId, integrationPlatform: platform },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}

describe('Inbox: integration connect/disconnect', () => {
  beforeEach(() => {
    enableMeta()
    mockGraph()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts "META connected" only on the real transition into CONNECTED, not on every incomplete-state tweak', async () => {
    await db.platformConnection.create({
      data: {
        businessId: testBusinessId,
        platform: 'META',
        accessTokenEnc: sealToken('RAW_TOKEN'),
        status: 'INCOMPLETE',
      },
    })

    // Sets adAccountId only — pageId still missing, so this stays INCOMPLETE. Must not post yet.
    const partial = await app.inject({
      method: 'PATCH',
      url: '/platforms/META',
      headers: asAuth(testUserId),
      payload: { adAccountId: 'act_1' },
    })
    expect(partial.statusCode).toBe(200)
    expect(partial.json().data.status).toBe('INCOMPLETE')
    expect(await threadForIntegration('META')).toBeNull()

    // Now sets pageId too — the real transition into CONNECTED.
    const complete = await app.inject({
      method: 'PATCH',
      url: '/platforms/META',
      headers: asAuth(testUserId),
      payload: { pageId: 'page_1' },
    })
    expect(complete.statusCode).toBe(200)
    expect(complete.json().data.status).toBe('CONNECTED')

    const thread = await threadForIntegration('META')
    expect(thread).toBeTruthy()
    expect(thread!.type).toBe('INTEGRATION')
    expect(thread!.subject).toBe('META')
    expect(thread!.messages).toHaveLength(1)
    expect(thread!.messages[0]!.subject).toBe('META connected')
  })

  it('does not re-post when an already-connected account is merely re-mapped', async () => {
    await db.platformConnection.create({
      data: {
        businessId: testBusinessId,
        platform: 'META',
        accessTokenEnc: sealToken('RAW_TOKEN'),
        status: 'CONNECTED',
        adAccountId: 'act_1',
        pageId: 'page_1',
      },
    })

    const res = await app.inject({
      method: 'PATCH',
      url: '/platforms/META',
      headers: asAuth(testUserId),
      payload: { defaultCountry: 'CA' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('CONNECTED')
    expect(await threadForIntegration('META')).toBeNull()
  })

  it('posts "META disconnected" on an explicit disconnect', async () => {
    await db.platformConnection.create({
      data: {
        businessId: testBusinessId,
        platform: 'META',
        accessTokenEnc: sealToken('RAW_TOKEN'),
        status: 'CONNECTED',
        adAccountId: 'act_1',
        pageId: 'page_1',
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/platforms/META/disconnect',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)

    const thread = await threadForIntegration('META')
    expect(thread!.messages).toHaveLength(1)
    expect(thread!.messages[0]!.subject).toBe('META disconnected')
  })

  it('does not post when disconnecting a platform that was never connected', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/platforms/META/disconnect',
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(await threadForIntegration('META')).toBeNull()
  })
})
