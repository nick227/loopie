// Schedule -> Google Sheets Sync (2026-09-10): one-way LOOPIE -> Sheets mirror of ScheduledGoal
// rows, keyed by a "Loopie ID" column so an update always lands on the same row even across
// multiple syncs. No real network calls — stubSheetsFetch below fakes the Sheets API with an
// in-memory sheet, extending the same fake-fetch convention importSources.test.ts/
// googleSheets.test.ts already use for this provider.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, asAuth, testUserId, testBusinessId, testOtherBusinessId } from './helpers'
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

function columnIndex(letters: string): number {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}
function parseRange(range: string) {
  const m = range.match(/^'((?:[^']|'')*)'!([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
  if (!m) return null
  const [, tabRaw, colStart, rowStart, colEnd, rowEnd] = m
  return {
    tab: tabRaw!.replace(/''/g, "'"),
    colStart: columnIndex(colStart!),
    rowStart: Number(rowStart),
    colEnd: columnIndex(colEnd!),
    rowEnd: Number(rowEnd),
  }
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

    const batchMatch = url.match(/\/v4\/spreadsheets\/([^/]+)\/values:batchUpdate$/)
    if (batchMatch && method === 'POST') {
      const sheet = sheets.get(batchMatch[1]!)
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        data: { range: string; values: string[][] }[]
      }
      for (const { range, values } of body.data) {
        const parsed = parseRange(range)
        if (!parsed || !sheet) continue
        const tab = sheet.tabs.find((t) => t.title === parsed.tab)
        if (!tab) continue
        while (tab.rows.length < parsed.rowStart) tab.rows.push([])
        tab.rows[parsed.rowStart - 1] = values[0]!
      }
      return json({})
    }

    const appendMatch = url.match(/\/v4\/spreadsheets\/([^/]+)\/values\/(.+):append\?/)
    if (appendMatch && method === 'POST') {
      const sheet = sheets.get(appendMatch[1]!)
      const parsed = parseRange(appendMatch[2]!)
      const body = JSON.parse(String(init?.body ?? '{}')) as { values: string[][] }
      const tab = sheet?.tabs.find((t) => t.title === parsed?.tab)
      if (tab) tab.rows.push(...body.values)
      return json({})
    }

    const valuesMatch = url.match(/\/v4\/spreadsheets\/([^/]+)\/values\/(.+)$/)
    if (valuesMatch && method === 'GET') {
      const sheet = sheets.get(valuesMatch[1]!)
      const parsed = parseRange(valuesMatch[2]!)
      const tab = sheet?.tabs.find((t) => t.title === parsed?.tab)
      if (!tab || !parsed) return json({ values: [] })
      const values: string[][] = []
      for (let r = parsed.rowStart; r <= Math.min(parsed.rowEnd, tab.rows.length); r++) {
        const row = tab.rows[r - 1] ?? []
        values.push(row.slice(parsed.colStart, parsed.colEnd + 1))
      }
      return json({ values })
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

async function connectAccount(businessId = testBusinessId, userId = testUserId) {
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

async function createGoal(title: string, userId = testUserId) {
  const idea = await app.inject({
    method: 'POST',
    url: '/calendar/ideas',
    headers: asAuth(userId),
    payload: { title },
  })
  const scheduled = await app.inject({
    method: 'POST',
    url: `/calendar/ideas/${idea.json().data.templateId}/schedule`,
    headers: asAuth(userId),
    payload: { when: 'TODAY' },
  })
  return scheduled.json().data
}

describe('Schedule -> Google Sheets Sync', () => {
  it('reports no connected sheet before one is created', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const integrationId = await connectAccount()
    const res = await app.inject({
      method: 'GET',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toBeNull()
  })

  it('rejects connecting to a tab that does not exist', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const integrationId = await connectAccount()
    seedSheet('sheet-1', 'Ops', [{ title: 'Sheet1', sheetId: 0, rowCount: 1000, rows: [] }])
    const res = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
      payload: { spreadsheetId: 'sheet-1', sheetTab: 'DoesNotExist' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('writes the header row and one row per goal on first sync, then updates the same row rather than duplicating it', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const integrationId = await connectAccount()
    seedSheet('sheet-1', 'Ops', [
      { title: 'Loopie Schedule', sheetId: 0, rowCount: 1000, rows: [] },
    ])
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
      payload: { spreadsheetId: 'sheet-1', sheetTab: 'Loopie Schedule' },
    })

    const goal = await createGoal('Sync test task')

    const syncRes = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync/sync`,
      headers: asAuth(testUserId),
    })
    expect(syncRes.statusCode).toBe(200)
    expect(syncRes.json().data.lastSyncError).toBeNull()

    const tab = sheets.get('sheet-1')!.tabs[0]!
    expect(tab.rows[0]).toEqual([
      'Loopie ID',
      'Date',
      'Time',
      'Task',
      'Assignee',
      'Estimate',
      'Status',
      'Created By',
      'Actual Tracked Time',
    ])
    expect(tab.rows.length).toBe(2) // header + one goal
    expect(tab.rows[1]![0]).toBe(goal.id)
    expect(tab.rows[1]![3]).toBe('Sync test task')
    expect(tab.rows[1]![6]).toBe('Scheduled')
    expect(tab.rows[1]![7]).toBe('alice@test.local')

    // Reassign + complete — a real commitment change, not just an estimate tweak — then sync
    // again. The row count must stay the same: this is the whole point of keying by column A.
    await app.inject({
      method: 'PATCH',
      url: `/calendar/goals/${goal.id}`,
      headers: asAuth(testUserId),
      payload: { status: 'DONE' },
    })
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync/sync`,
      headers: asAuth(testUserId),
    })

    expect(tab.rows.length).toBe(2) // still just header + the one goal's row, updated in place
    expect(tab.rows[1]![0]).toBe(goal.id)
    expect(tab.rows[1]![6]).toBe('Done')
  })

  it("includes a goal's actual tracked time once a linked timer is stopped", async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const integrationId = await connectAccount()
    seedSheet('sheet-1', 'Ops', [
      { title: 'Loopie Schedule', sheetId: 0, rowCount: 1000, rows: [] },
    ])
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
      payload: { spreadsheetId: 'sheet-1', sheetTab: 'Loopie Schedule' },
    })
    const goal = await createGoal('Tracked task')

    const startRes = await app.inject({
      method: 'POST',
      url: '/time-entries/start',
      headers: asAuth(testUserId),
      payload: { description: 'Working on it', scheduledGoalId: goal.id },
    })
    const entryId = startRes.json().data.id
    // Back-date startedAt directly — sync should reflect real elapsed duration, not a
    // near-zero one from a test that starts and stops within milliseconds.
    await db.timeEntry.update({
      where: { id: entryId },
      data: { startedAt: new Date(Date.now() - 90 * 60 * 1000) },
    })
    await app.inject({
      method: 'POST',
      url: '/time-entries/current/stop',
      headers: asAuth(testUserId),
    })

    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync/sync`,
      headers: asAuth(testUserId),
    })

    const tab = sheets.get('sheet-1')!.tabs[0]!
    expect(tab.rows[1]![8]).toBe('1.5h')
  })

  it('rejects a concurrent sync while one is already running', async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const integrationId = await connectAccount()
    seedSheet('sheet-1', 'Ops', [
      { title: 'Loopie Schedule', sheetId: 0, rowCount: 1000, rows: [] },
    ])
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
      payload: { spreadsheetId: 'sheet-1', sheetTab: 'Loopie Schedule' },
    })
    await db.scheduleSyncTarget.updateMany({
      where: { integrationId },
      data: { lockToken: 'held-by-someone-else', lockExpiresAt: new Date(Date.now() + 60_000) },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync/sync`,
      headers: asAuth(testUserId),
    })
    expect(res.statusCode).toBe(409)
  })

  it("404s on another business's integration, and clears the connection on delete", async () => {
    enableGoogleSheets()
    stubSheetsFetch()
    const integrationId = await connectAccount()
    seedSheet('sheet-1', 'Ops', [
      { title: 'Loopie Schedule', sheetId: 0, rowCount: 1000, rows: [] },
    ])
    await app.inject({
      method: 'POST',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
      payload: { spreadsheetId: 'sheet-1', sheetTab: 'Loopie Schedule' },
    })

    await db.businessMembership.create({
      data: { userId: testUserId, businessId: testOtherBusinessId, role: 'MEMBER' },
    })
    await app.inject({
      method: 'POST',
      url: '/me/active-business',
      headers: asAuth(testUserId),
      payload: { businessId: testOtherBusinessId },
    })
    const foreignRes = await app.inject({
      method: 'GET',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
    })
    expect(foreignRes.statusCode).toBe(404)

    await app.inject({
      method: 'POST',
      url: '/me/active-business',
      headers: asAuth(testUserId),
      payload: { businessId: testBusinessId },
    })
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
    })
    expect(deleteRes.statusCode).toBe(204)
    const afterDelete = await app.inject({
      method: 'GET',
      url: `/integrations/${integrationId}/schedule-sync`,
      headers: asAuth(testUserId),
    })
    expect(afterDelete.json().data).toBeNull()
  })
})
