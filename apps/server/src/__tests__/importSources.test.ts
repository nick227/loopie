import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, asAuth, testUserId, testOtherUserId, testBusinessId } from './helpers'
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

type Tab = { title: string; sheetId: number; rowCount: number; rows: string[][] }
type Sheet = { title: string; tabs: Tab[] }
const sheets = new Map<string, Sheet>()

function seedSheet(id: string, title: string, tabs: Tab[]) {
  sheets.set(id, { title, tabs })
}

// header('Name','Email','Phone') + N data rows, all eligible with unique emails.
function rowsOf(count: number, offset = 0): string[][] {
  return Array.from({ length: count }, (_, i) => {
    const n = offset + i
    return [`Person ${n}`, `person${n}@example.com`, `555-${String(n).padStart(4, '0')}`]
  })
}

let fetcher: ReturnType<typeof vi.fn>
function stubSheetsFetch() {
  fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = decodeURIComponent(String(input))
    const method = init?.method ?? 'GET'
    if (url.includes('oauth2.googleapis.com/token')) {
      return json({ access_token: 'G_TOKEN', refresh_token: 'G_REFRESH', expires_in: 3600 })
    }
    if (url.includes('/oauth2/v2/userinfo')) return json({ email: 'owner@example.com' })
    if (method === 'POST' && url.endsWith('/v4/spreadsheets')) {
      return json({
        spreadsheetId: 'export-sheet-1',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/export-sheet-1/edit',
        sheets: [{ properties: { title: 'Sheet1' } }],
      })
    }
    if (url.includes('/values/')) {
      if (method === 'PUT') return json({ updatedRange: 'Sheet1!A1' })
      const [, spreadsheetId, rangeRaw] =
        url.match(/\/v4\/spreadsheets\/([^/]+)\/values\/(.+)$/) ?? []
      const sheet = spreadsheetId ? sheets.get(spreadsheetId) : undefined
      const rangeMatch = rangeRaw?.match(/^'((?:[^']|'')*)'!(\d+):(\d+)$/)
      if (!sheet || !rangeMatch) return json({ values: [] })
      const [, tabNameRaw, startStr, endStr] = rangeMatch
      const tab = sheet.tabs.find((t) => t.title === (tabNameRaw ?? '').replace(/''/g, "'"))
      if (!tab) return json({ error: 'Unable to parse range' }, 400)
      return json({ values: tab.rows.slice(Number(startStr) - 1, Number(endStr)) })
    }
    const metaMatch = url.match(/\/v4\/spreadsheets\/([^/?]+)\?fields=/)
    if (metaMatch) {
      const sheet = sheets.get(metaMatch[1]!)
      if (!sheet) return json({ error: 'Requested entity was not found.' }, 404)
      return json({
        properties: { title: sheet.title },
        sheets: sheet.tabs.map((t) => ({
          properties: {
            title: t.title,
            sheetId: t.sheetId,
            gridProperties: { rowCount: t.rowCount },
          },
        })),
      })
    }
    return json({ error: url }, 500)
  })
  vi.stubGlobal('fetch', fetcher)
}

function enableGoogleSheets() {
  for (const [key, value] of Object.entries(GS_ENV)) vi.stubEnv(key, value)
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  sheets.clear()
})

// Full OAuth dance against the real handler chain — matches googleSheets.test.ts's convention of
// never hand-constructing credentialsEnc, so the encryption/env wiring stays exercised for real.
async function connectAccount(userId = testUserId, businessId = testBusinessId) {
  const start = await app.inject({
    method: 'GET',
    url: '/integrations/GOOGLE_SHEETS/oauth/start',
    headers: asAuth(userId),
  })
  const stateUrl = new URL(start.json().data.url)
  const row = await db.integration.findFirstOrThrow({
    where: { businessId, provider: 'GOOGLE_SHEETS' },
    orderBy: { createdAt: 'desc' },
  })
  const state =
    stateUrl.searchParams.get('state') ??
    issueOAuthState({
      businessId,
      platform: 'crm:GOOGLE_SHEETS',
      returnPath: `/integrations?iid=${row.id}`,
    })
  await app.inject({
    method: 'GET',
    url: `/v1/integrations/google-sheets/callback?code=abc&state=${encodeURIComponent(state)}`,
  })
  return (
    await db.integration.findFirstOrThrow({ where: { businessId, provider: 'GOOGLE_SHEETS' } })
  ).id
}

const auth = (userId = testUserId) => asAuth(userId)

describe('ImportSource: saved sources, mapping, drift, pagination', () => {
  it('keeps two saved sources on one account independent, and re-creating one is idempotent', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    seedSheet('sheet-1', 'CRM Sheet', [
      {
        title: 'Contacts',
        sheetId: 0,
        rowCount: 10,
        rows: [['Name', 'Email', 'Phone'], ...rowsOf(2)],
      },
      {
        title: 'Leads',
        sheetId: 1,
        rowCount: 10,
        rows: [['Name', 'Email', 'Phone'], ...rowsOf(2, 100)],
      },
    ])
    const integrationId = await connectAccount()

    const create1 = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources`,
      headers: auth(),
      payload: { spreadsheetId: 'sheet-1', sheetTab: 'Contacts' },
    })
    expect(create1.statusCode).toBe(200)
    const source1 = create1.json().data

    const create2 = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources`,
      headers: auth(),
      payload: { spreadsheetId: 'sheet-1', sheetTab: 'Leads', label: 'My leads' },
    })
    expect(create2.statusCode).toBe(200)
    const source2 = create2.json().data
    expect(source2.id).not.toBe(source1.id)
    expect(source2.label).toBe('My leads')

    // Re-creating the same spreadsheet+tab is idempotent — no duplicate row.
    const recreate = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources`,
      headers: auth(),
      payload: { spreadsheetId: 'sheet-1', sheetTab: 'Contacts' },
    })
    expect(recreate.statusCode).toBe(200)
    expect(recreate.json().data.id).toBe(source1.id)
    expect(await db.importSource.count({ where: { integrationId } })).toBe(2)

    // Confirm + sync each independently.
    for (const source of [source1, source2]) {
      const preview = await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
        headers: auth(),
      })
      const { mapping, schemaFingerprint } = preview.json().data
      const confirmed = await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources/${source.id}/mapping`,
        headers: auth(),
        payload: { mapping, schemaFingerprint },
      })
      expect(confirmed.statusCode).toBe(200)
      const synced = await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
        headers: auth(),
      })
      expect(synced.statusCode).toBe(200)
      expect(synced.json().data).toMatchObject({ created: 2, hasMore: false })
    }

    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(4)
    const history1 = await app.inject({
      method: 'GET',
      url: `/integrations/${integrationId}/import-sources/${source1.id}/runs`,
      headers: auth(),
    })
    expect(history1.json().data.runs).toHaveLength(1)
    expect(history1.json().data.runs[0].sourceId).toBe(source1.id)
  })

  it('detects mid-run schema drift, rejects a stale confirm fingerprint, and requires review before importing again', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const tab: Tab = {
      title: 'Contacts',
      sheetId: 0,
      rowCount: 10,
      rows: [['Name', 'Email', 'Phone'], ...rowsOf(2)],
    }
    seedSheet('sheet-1', 'CRM Sheet', [tab])
    const integrationId = await connectAccount()

    const source = (
      await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources`,
        headers: auth(),
        payload: { spreadsheetId: 'sheet-1', sheetTab: 'Contacts' },
      })
    ).json().data

    const preview1 = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      headers: auth(),
    })
    const { mapping, schemaFingerprint: staleFingerprint } = preview1.json().data
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/mapping`,
      headers: auth(),
      payload: { mapping, schemaFingerprint: staleFingerprint },
    })

    // Sync succeeds once against the confirmed schema.
    const firstSync = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(firstSync.statusCode).toBe(200)
    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(2)

    // The sheet's headings change underneath the saved mapping.
    tab.rows[0] = ['Full Name', 'Email Address', 'Mobile', 'Extra Column']

    // A confirm carrying the now-stale fingerprint is rejected — headings changed during review.
    const staleConfirm = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/mapping`,
      headers: auth(),
      payload: { mapping, schemaFingerprint: staleFingerprint },
    })
    expect(staleConfirm.statusCode).toBe(409)

    // Syncing without reconfirming is caught mid-run too, and does not partially import.
    const driftedSync = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(driftedSync.statusCode).toBe(409)
    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(2)
    expect(
      (await db.importSource.findUniqueOrThrow({ where: { id: source.id } })).needsReview,
    ).toBe(true)

    // Preview reports the drift and falls back to a fresh suggestion rather than the stale mapping.
    const preview2 = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      headers: auth(),
    })
    expect(preview2.json().data).toMatchObject({ schemaDrift: true, needsReview: true })

    // Reconfirming against the new schema unblocks sync again.
    const { mapping: newMapping, schemaFingerprint: newFingerprint } = preview2.json().data
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/mapping`,
      headers: auth(),
      payload: { mapping: newMapping, schemaFingerprint: newFingerprint },
    })
    const resynced = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(resynced.statusCode).toBe(200)
  })

  it('paginates in batches of up to 2,000 rows and resumes from the checkpoint on Continue import', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const dataRows = rowsOf(2001)
    const tab: Tab = {
      title: 'Contacts',
      sheetId: 0,
      rowCount: 1 + dataRows.length,
      rows: [['Name', 'Email', 'Phone'], ...dataRows],
    }
    seedSheet('sheet-1', 'Big Sheet', [tab])
    const integrationId = await connectAccount()
    const source = (
      await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources`,
        headers: auth(),
        payload: { spreadsheetId: 'sheet-1', sheetTab: 'Contacts' },
      })
    ).json().data
    const preview = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      headers: auth(),
    })
    const { mapping, schemaFingerprint } = preview.json().data
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/mapping`,
      headers: auth(),
      payload: { mapping, schemaFingerprint },
    })

    const first = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(first.statusCode).toBe(200)
    expect(first.json().data).toMatchObject({ scanned: 2000, created: 2000, hasMore: true })
    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(2000)
    const afterFirst = await db.importSource.findUniqueOrThrow({ where: { id: source.id } })
    expect(afterFirst.hasMore).toBe(true)
    expect(afterFirst.cursor).toBe('2002')

    // Continue import — resumes from the checkpoint, not from the top.
    const second = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(second.statusCode).toBe(200)
    expect(second.json().data).toMatchObject({ scanned: 1, created: 1, hasMore: false })
    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(2001)

    // A run after full completion is a real re-sync (cursor only resets on reconfirm), not a
    // silent no-op — but since nothing changed on the sheet it re-scans the same 2001 rows and
    // creates none of them again.
    const third = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(third.statusCode).toBe(200)
    expect(third.json().data).toMatchObject({ created: 0, hasMore: true })
    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(2001)
  }, 30_000)

  it('rejects a concurrent sync on the same source, and recovers a run left RUNNING by a dead process', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    seedSheet('sheet-1', 'CRM Sheet', [
      {
        title: 'Contacts',
        sheetId: 0,
        rowCount: 10,
        rows: [['Name', 'Email', 'Phone'], ...rowsOf(2)],
      },
    ])
    const integrationId = await connectAccount()
    const source = (
      await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources`,
        headers: auth(),
        payload: { spreadsheetId: 'sheet-1', sheetTab: 'Contacts' },
      })
    ).json().data
    const preview = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      headers: auth(),
    })
    const { mapping, schemaFingerprint } = preview.json().data
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/mapping`,
      headers: auth(),
      payload: { mapping, schemaFingerprint },
    })

    const [first, second] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
        headers: auth(),
      }),
      app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
        headers: auth(),
      }),
    ])
    const statuses = [first.statusCode, second.statusCode].sort()
    expect(statuses).toEqual([200, 409])

    // Simulate a process that died mid-run: a RUNNING job with no active lease.
    const stuckJob = await db.importJob.create({
      data: {
        businessId: testBusinessId,
        integrationId,
        sourceId: source.id,
        status: 'RUNNING',
        startCursor: null,
        endCursor: null,
      },
    })
    const recovered = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(recovered.statusCode).toBe(200)
    const stuckAfter = await db.importJob.findUniqueOrThrow({ where: { id: stuckJob.id } })
    expect(stuckAfter.status).toBe('FAILED')
    expect(stuckAfter.error).toMatch(/interrupted/i)
  })

  it('resolves identity across two sources on the same account — one contact, not two', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const shared = ['Shared Person', 'shared@example.com', '555-9999']
    seedSheet('sheet-1', 'CRM Sheet', [
      { title: 'Contacts', sheetId: 0, rowCount: 10, rows: [['Name', 'Email', 'Phone'], shared] },
      { title: 'Leads', sheetId: 1, rowCount: 10, rows: [['Name', 'Email', 'Phone'], shared] },
    ])
    const integrationId = await connectAccount()

    for (const tabName of ['Contacts', 'Leads']) {
      const source = (
        await app.inject({
          method: 'POST',
          url: `/integrations/${integrationId}/import-sources`,
          headers: auth(),
          payload: { spreadsheetId: 'sheet-1', sheetTab: tabName },
        })
      ).json().data
      const preview = await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
        headers: auth(),
      })
      const { mapping, schemaFingerprint } = preview.json().data
      await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources/${source.id}/mapping`,
        headers: auth(),
        payload: { mapping, schemaFingerprint },
      })
      const synced = await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
        headers: auth(),
      })
      expect(synced.statusCode).toBe(200)
    }

    expect(await db.contact.count({ where: { businessId: testBusinessId } })).toBe(1)
  })

  it('handles a short header row, skips rows with no identifier, and cleanly rejects a deleted tab or an out-of-range mapping', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const tab: Tab = {
      title: 'Contacts',
      sheetId: 0,
      rowCount: 10,
      rows: [
        ['Name', 'Email'], // header shorter than data rows below
        ['Alice', 'alice@example.com', '555-0001', 'Acme'],
        ['No Identifier', '', '', ''],
      ],
    }
    seedSheet('sheet-1', 'CRM Sheet', [tab])
    const integrationId = await connectAccount()
    const source = (
      await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources`,
        headers: auth(),
        payload: { spreadsheetId: 'sheet-1', sheetTab: 'Contacts' },
      })
    ).json().data

    const preview = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      headers: auth(),
    })
    expect(preview.statusCode).toBe(200)
    expect(preview.json().data).toMatchObject({ scanned: 2, eligible: 1, skipped: 1 })
    expect(preview.json().data.matrix.headers).toHaveLength(4)

    // Out-of-range mapping column, rejected before ever touching the sheet's real data.
    const badMapping = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      headers: auth(),
      payload: { mapping: { email: 99 } },
    })
    expect(badMapping.statusCode).toBe(400)

    const { mapping, schemaFingerprint } = preview.json().data
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/mapping`,
      headers: auth(),
      payload: { mapping, schemaFingerprint },
    })
    const synced = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(synced.statusCode).toBe(200)
    expect(synced.json().data).toMatchObject({ scanned: 2, eligible: 1, skipped: 1, created: 1 })

    // The worksheet tab is deleted between preview and the next sync — a clean 409, not a crash.
    tab.title = 'Renamed'
    const afterDelete = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      headers: auth(),
    })
    expect(afterDelete.statusCode).toBe(409)
    expect(
      (await db.importSource.findUniqueOrThrow({ where: { id: source.id } })).needsReview,
    ).toBe(true)
    const previewAfterDelete = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      headers: auth(),
    })
    expect(previewAfterDelete.statusCode).toBe(409)
  })

  it('never leaks another business’s import source, even by a correct id', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    seedSheet('sheet-1', 'CRM Sheet', [
      { title: 'Contacts', sheetId: 0, rowCount: 10, rows: [['Name', 'Email'], ...rowsOf(1)] },
    ])
    const integrationId = await connectAccount(testUserId, testBusinessId)
    const source = (
      await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources`,
        headers: auth(testUserId),
        payload: { spreadsheetId: 'sheet-1', sheetTab: 'Contacts' },
      })
    ).json().data

    for (const req of [
      { method: 'GET' as const, url: `/integrations/${integrationId}/import-sources` },
      { method: 'GET' as const, url: `/integrations/${integrationId}/import-sources/${source.id}` },
      {
        method: 'POST' as const,
        url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      },
      {
        method: 'POST' as const,
        url: `/integrations/${integrationId}/import-sources/${source.id}/sync`,
      },
    ]) {
      const res = await app.inject({ ...req, headers: auth(testOtherUserId) })
      expect(res.statusCode).toBe(404)
    }
  })

  it('caps the preview read even when the sheet reports a huge configured row count', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    seedSheet('sheet-1', 'CRM Sheet', [
      { title: 'Contacts', sheetId: 0, rowCount: 50_000, rows: [['Name', 'Email'], ...rowsOf(2)] },
    ])
    const integrationId = await connectAccount()
    const source = (
      await app.inject({
        method: 'POST',
        url: `/integrations/${integrationId}/import-sources`,
        headers: auth(),
        payload: { spreadsheetId: 'sheet-1', sheetTab: 'Contacts' },
      })
    ).json().data
    fetcher.mockClear()
    const preview = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/import-sources/${source.id}/preview`,
      headers: auth(),
    })
    expect(preview.statusCode).toBe(200)
    const valuesCall = fetcher.mock.calls
      .map((call) => decodeURIComponent(String(call[0])))
      .find((url) => url.includes('/values/'))
    expect(valuesCall).toContain('!1:5002')
    expect(valuesCall).not.toContain('50000')
    expect(valuesCall).not.toContain('50002')
  })
})
