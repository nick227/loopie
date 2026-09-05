import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId } from './helpers'
import { db } from '@project/db'
import { issueOAuthState } from '../lib/platforms/oauthState'

const app = buildTestApp()

const GS_ENV = {
  GOOGLE_SHEETS_CLIENT_ID: 'gs-id',
  GOOGLE_SHEETS_CLIENT_SECRET: 'gs-secret',
  GOOGLE_SHEETS_REDIRECT_URI: 'http://localhost:3001/integrations/GOOGLE_SHEETS/oauth/callback',
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
  it('connects, previews a sheet with a real column-completeness breakdown, imports on confirmed mapping, and exports contacts to a new sheet', async () => {
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
      url: `/integrations/GOOGLE_SHEETS/oauth/callback?code=abc&state=${encodeURIComponent(state)}`,
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

    const selected = await app.inject({
      method: 'POST',
      url: `/integrations/${row.id}/google-sheets/spreadsheet`,
      headers: asAuth(testUserId),
      payload: { spreadsheetId: SHEET_ID, spreadsheetName: 'My CRM Sheet' },
    })
    expect(selected.statusCode).toBe(200)
    expect(selected.json().data.spreadsheetId).toBe(SHEET_ID)

    const tabs = await app.inject({
      method: 'GET',
      url: `/integrations/${row.id}/google-sheets/tabs`,
      headers: asAuth(testUserId),
    })
    expect(tabs.statusCode).toBe(200)
    expect(tabs.json().data).toEqual([
      { title: 'Contacts', sheetId: 0 },
      { title: 'Archive', sheetId: 1 },
    ])

    const tabSelected = await app.inject({
      method: 'POST',
      url: `/integrations/${row.id}/google-sheets/tab`,
      headers: asAuth(testUserId),
      payload: { sheetTab: 'Contacts' },
    })
    expect(tabSelected.statusCode).toBe(200)

    const preview = await app.inject({
      method: 'POST',
      url: `/integrations/${row.id}/google-sheets/preview`,
      headers: asAuth(testUserId),
    })
    expect(preview.statusCode).toBe(200)
    expect(preview.json().data).toMatchObject({
      headers: HEADER,
      totalRows: 4,
      withEmail: 2,
      withPhone: 3,
      toImport: 3,
      toSkip: 1,
      truncated: false,
      suggestedMapping: { name: 0, email: 1, phone: 2, company: 3 },
    })

    // Confirm a mapping that deliberately differs from the suggestion (drop company) to prove the
    // sync step honors whatever was confirmed, not just whatever preview suggested.
    const confirmed = await app.inject({
      method: 'POST',
      url: `/integrations/${row.id}/google-sheets/mapping`,
      headers: asAuth(testUserId),
      payload: { mapping: { name: 0, email: 1, phone: 2 } },
    })
    expect(confirmed.statusCode).toBe(200)

    const synced = await app.inject({
      method: 'POST',
      url: `/integrations/${row.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(synced.statusCode).toBe(200)
    expect(synced.json().data).toMatchObject({ created: 3, hasMore: false })

    const imported = await db.contact.findMany({
      where: { businessId: testBusinessId, source: 'GOOGLE_SHEETS' },
      orderBy: { name: 'asc' },
    })
    expect(imported.map((c) => c.name)).toEqual(['Alice Smith', 'Bob Jones', 'Carol Lee'])
    expect(imported.find((c) => c.name === 'Bob Jones')?.phone).toBe('555-0002')
    // Company was dropped from the confirmed mapping — never imported even though the sheet has it.
    expect(imported.every((c) => c.company === null)).toBe(true)

    // Re-syncing is idempotent — same 4 sheet rows, no new contacts created.
    const resynced = await app.inject({
      method: 'POST',
      url: `/integrations/${row.id}/sync`,
      headers: asAuth(testUserId),
    })
    expect(resynced.statusCode).toBe(200)
    expect(resynced.json().data).toMatchObject({ created: 0 })
    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(3)

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
      contactCount: 3,
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
      url: `/integrations/GOOGLE_SHEETS/oauth/callback?code=abc&state=${encodeURIComponent(state)}`,
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
})
