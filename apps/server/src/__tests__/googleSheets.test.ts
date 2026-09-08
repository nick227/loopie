import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { issueOAuthState } from '../lib/platforms/oauthState'

const app = buildTestApp()

const GS_ENV = {
  GOOGLE_SHEETS_CLIENT_ID: 'gs-id',
  GOOGLE_SHEETS_CLIENT_SECRET: 'gs-secret',
  GOOGLE_SHEETS_REDIRECT_URI: 'http://localhost:3001/v1/integrations/google-sheets/callback',
  SESSION_SECRET: 'test-session-secret-at-least-32-chars',
  PUBLIC_APP_URL: 'http://localhost:5173',
}

function json(data: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => data }
}

function enableGoogleSheets() {
  for (const [key, value] of Object.entries(GS_ENV)) vi.stubEnv(key, value)
}

const SHEET_ID = 'sheet-123'
const HEADER = ['Full Name', 'Email Address', 'Mobile', 'Company']
const DATA_ROWS = [
  ['Alice Smith', 'alice@example.com', '555-0001', 'Acme'],
  ['Bob Jones', '', '555-0002', 'Beta'],
  ['No Contact', '', '', ''],
  ['Carol Lee', 'carol@example.com', '555-0003', 'Gamma'],
]

function stubGoogleFetch() {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.includes('oauth2.googleapis.com/token')) {
      return json({ access_token: 'G_TOKEN', refresh_token: 'G_REFRESH', expires_in: 3600 })
    }
    if (url.includes('/oauth2/v2/userinfo')) {
      return json({ email: 'owner@example.com' })
    }
    if (url.includes('/values/')) {
      if (method === 'PUT') return json({ updatedRange: 'Sheet1!A1' })
      if (url.includes('!A')) return json({ values: DATA_ROWS })
      return json({ values: [HEADER, ...DATA_ROWS] })
    }
    if (url.endsWith('/v4/spreadsheets') && method === 'POST') {
      return json({
        spreadsheetId: 'export-sheet-1',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/export-sheet-1/edit',
        sheets: [{ properties: { title: 'Sheet1' } }],
      })
    }
    if (url.includes(SHEET_ID)) {
      return json({
        properties: { title: 'My CRM Sheet' },
        sheets: [
          { properties: { title: 'Contacts', sheetId: 0 } },
          { properties: { title: 'Archive', sheetId: 1 } },
        ],
      })
    }
    return json({ error: url }, 500)
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Google Sheets CRM integration', () => {
  // Multi-source spreadsheet/tab selection, mapping, preview, and import now live entirely under
  // /integrations/{id}/import-sources — see importSources.test.ts. This covers what's still
  // account-level: OAuth connect, the Picker token, and CRM -> Sheets export.
  it('connects, issues a picker token, and exports contacts to a new sheet', async () => {
    enableGoogleSheets()
    stubGoogleFetch()

    const start = await app.inject({
      method: 'GET',
      url: '/integrations/GOOGLE_SHEETS/oauth/start',
      headers: asAuth(testUserId),
    })
    expect(start.statusCode).toBe(200)
    expect(start.json().data.url).toContain('accounts.google.com')

    const row = await db.integration.findFirstOrThrow({
      where: { businessId: testBusinessId, provider: 'GOOGLE_SHEETS' },
    })
    const state = issueOAuthState({
      businessId: testBusinessId,
      platform: 'crm:GOOGLE_SHEETS',
      returnPath: `/integrations?iid=${row.id}`,
    })
    const callback = await app.inject({
      method: 'GET',
      url: `/v1/integrations/google-sheets/callback?code=abc&state=${encodeURIComponent(state)}`,
    })
    expect(callback.statusCode).toBe(302)

    const connected = await db.integration.findUniqueOrThrow({ where: { id: row.id } })
    expect(connected.status).toBe('CONNECTED')
    expect(connected.credentialsEnc).toBeTruthy()
    expect(connected.externalAccountId).toBe('owner@example.com')

    const pickerToken = await app.inject({
      method: 'GET',
      url: `/integrations/${row.id}/google-sheets/picker-token`,
      headers: asAuth(testUserId),
    })
    expect(pickerToken.statusCode).toBe(200)
    expect(pickerToken.json().data.accessToken).toBe('G_TOKEN')

    const exported = await app.inject({
      method: 'POST',
      url: `/integrations/${row.id}/google-sheets/export`,
      headers: asAuth(testUserId),
      payload: { title: 'Export test' },
    })
    expect(exported.statusCode).toBe(200)
    expect(exported.json().data).toMatchObject({
      spreadsheetId: 'export-sheet-1',
      url: 'https://docs.google.com/spreadsheets/d/export-sheet-1/edit',
      contactCount: 0,
    })
  })

  it('refreshes an expired Google access token before hitting the Sheets API, without asking the user to reconnect', async () => {
    enableGoogleSheets()
    stubGoogleFetch()

    await app.inject({
      method: 'GET',
      url: '/integrations/GOOGLE_SHEETS/oauth/start',
      headers: asAuth(testUserId),
    })
    const row = await db.integration.findFirstOrThrow({
      where: { businessId: testBusinessId, provider: 'GOOGLE_SHEETS' },
    })
    const state = issueOAuthState({
      businessId: testBusinessId,
      platform: 'crm:GOOGLE_SHEETS',
      returnPath: `/integrations?iid=${row.id}`,
    })
    await app.inject({
      method: 'GET',
      url: `/v1/integrations/google-sheets/callback?code=abc&state=${encodeURIComponent(state)}`,
    })

    // Force the stored token to look already-expired.
    const beforeRefresh = await db.integration.findUniqueOrThrow({ where: { id: row.id } })
    const creds = JSON.parse(
      (await import('../lib/platforms/encrypt')).unsealToken(beforeRefresh.credentialsEnc!),
    )
    creds.accessToken = 'STALE_TOKEN'
    creds.expiresAt = new Date(Date.now() - 60_000).toISOString()
    await db.integration.update({
      where: { id: row.id },
      data: {
        credentialsEnc: (await import('../lib/platforms/encrypt')).sealToken(JSON.stringify(creds)),
      },
    })

    const pickerToken = await app.inject({
      method: 'GET',
      url: `/integrations/${row.id}/google-sheets/picker-token`,
      headers: asAuth(testUserId),
    })
    expect(pickerToken.statusCode).toBe(200)
    // The refresh_token grant in stubGoogleFetch always returns G_TOKEN — a fresh access token,
    // proving ensureFreshToken actually refreshed rather than reusing the stale one.
    expect(pickerToken.json().data.accessToken).toBe('G_TOKEN')

    const persisted = await db.integration.findUniqueOrThrow({ where: { id: row.id } })
    expect(persisted.credentialsEnc).not.toBe(beforeRefresh.credentialsEnc)
  })

  it('uses shared GOOGLE_CLIENT_* when Sheets-specific env is unset', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'shared-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'shared-secret')
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-at-least-32-chars')
    stubGoogleFetch()

    const start = await app.inject({
      method: 'GET',
      url: '/integrations/GOOGLE_SHEETS/oauth/start',
      headers: asAuth(testUserId),
    })
    expect(start.statusCode).toBe(200)
    const url = start.json().data.url as string
    expect(url).toContain('client_id=shared-id')
    expect(url).toContain(encodeURIComponent('/v1/integrations/google-sheets/callback'))
  })
})

describe('Google Sheets mapping and source identity', () => {
  it('recognizes exact aliases without treating company or first name as full name', async () => {
    const { suggestMapping, validateMapping } = await import('../services/GoogleSheetsService')
    expect(
      suggestMapping([
        'Company Name',
        'first_name',
        'Last Name',
        'email_address',
        'mobile',
        'Notes',
      ]),
    ).toEqual({ company: 0, firstName: 1, lastName: 2, email: 3, phone: 4, notes: 5 })
    expect(suggestMapping(['Company Email', 'Email', 'Email'])).toEqual({ email: 1 })
    expect(() => validateMapping({ name: 0, email: 0 }, 2)).toThrow()
    expect(() => validateMapping({ email: -1 }, 2)).toThrow()
    expect(() => validateMapping({ email: 2 }, 2)).toThrow()
    expect(() => validateMapping({ email: null } as never, 2)).toThrow()
  })

  it('reads columns beyond Z, joins split names, retains profile, and distinguishes sheets', async () => {
    const { googleSheetsConnector, columnName } = await import('../lib/crm/googleSheets')
    expect(columnName(26)).toBe('AA')
    expect(columnName(701)).toBe('ZZ')
    const cells = Array<string>(28).fill('')
    cells[0] = 'Ada'
    cells[1] = 'Lovelace'
    cells[26] = 'ada@example.com'
    cells[27] = 'Analyst'
    const fetcher = vi.fn((_input: RequestInfo | URL) => Promise.resolve(json({ values: [cells] })))
    vi.stubGlobal('fetch', fetcher)
    const opts = {
      spreadsheetId: 'one',
      sheetTab: "Client's list",
      columnMapping: { firstName: 0, lastName: 1, email: 26, jobTitle: 27 },
    }
    const first = await googleSheetsConnector.listContacts('token', null, opts)
    expect(decodeURIComponent(String(fetcher.mock.calls[0]?.[0]))).toContain(
      "'Client''s list'!A2:AB251",
    )
    expect(first.contacts[0]).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      raw: { profile: { jobTitle: 'Analyst' } },
    })
    const other = await googleSheetsConnector.listContacts('token', null, {
      ...opts,
      spreadsheetId: 'two',
    })
    expect(other.contacts[0]!.externalId).not.toBe(first.contacts[0]!.externalId)
    const moved = await googleSheetsConnector.listContacts('token', '252', opts)
    expect(moved.contacts[0]!.externalId).toBe(first.contacts[0]!.externalId)
  })

  it('returns cancelled authorization to account selection without connecting or importing', async () => {
    enableGoogleSheets()
    const start = await app.inject({
      method: 'GET',
      url: '/integrations/GOOGLE_SHEETS/oauth/start',
      headers: asAuth(testUserId),
    })
    const state = new URL(start.json().data.url).searchParams.get('state')!
    const callback = await app.inject({
      method: 'GET',
      url: `/v1/integrations/google-sheets/callback?error=access_denied&state=${encodeURIComponent(state)}`,
    })
    expect(callback.statusCode).toBe(302)
    expect(callback.headers.location).toContain('/integrations/google-sheets?connection=cancelled')
    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(0)
    expect(
      await db.integration.count({ where: { businessId: testBusinessId, status: 'CONNECTED' } }),
    ).toBe(0)
  })

  it('adds a second account without replacing the first, and reconnects the original in place', async () => {
    enableGoogleSheets()
    stubGoogleFetch()
    const original = await db.integration.create({
      data: {
        businessId: testBusinessId,
        provider: 'GOOGLE_SHEETS',
        status: 'CONNECTED',
        externalAccountId: 'original@example.com',
        capabilities: {},
        providerConfig: { spreadsheetId: 'original-sheet' },
      },
    })
    const start = await app.inject({
      method: 'GET',
      url: '/integrations/GOOGLE_SHEETS/oauth/start',
      headers: asAuth(testUserId),
    })
    const state = new URL(start.json().data.url).searchParams.get('state')!
    const callback = await app.inject({
      method: 'GET',
      url: `/v1/integrations/google-sheets/callback?code=abc&state=${encodeURIComponent(state)}`,
    })
    expect(callback.statusCode).toBe(302)
    expect(callback.headers.location).toMatch(/\/integrations\/[^/]+\/google-sheets/)
    expect(
      (await db.integration.findUniqueOrThrow({ where: { id: original.id } })).externalAccountId,
    ).toBe('original@example.com')
    const added = await db.integration.findFirstOrThrow({
      where: { businessId: testBusinessId, externalAccountId: 'owner@example.com' },
    })
    const again = await app.inject({
      method: 'GET',
      url: '/integrations/GOOGLE_SHEETS/oauth/start',
      headers: asAuth(testUserId),
    })
    const againState = new URL(again.json().data.url).searchParams.get('state')!
    const reconnected = await app.inject({
      method: 'GET',
      url: `/v1/integrations/google-sheets/callback?code=abc&state=${encodeURIComponent(againState)}`,
    })
    expect(reconnected.statusCode).toBe(302)
    expect(reconnected.headers.location).toContain(`/integrations/${added.id}/google-sheets`)
    expect(
      await db.integration.count({
        where: { businessId: testBusinessId, provider: 'GOOGLE_SHEETS' },
      }),
    ).toBe(2)
  })
})
