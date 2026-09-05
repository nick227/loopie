import { catalogEntry } from './catalog'
import { formBody, jsonFetch } from './http'
import type { CrmContactPage, CrmLiveConnector, CrmToken, GoogleColumnMapping } from './types'

// drive.file (not the broader drive/drive.readonly scope) so a connected account only ever grants
// LOOPIE access to spreadsheets the user explicitly picks via the Google Picker widget or that
// LOOPIE itself creates (CRM -> Sheets export) — never "everything in their Drive." spreadsheets
// is required alongside it because drive.file only governs Drive-level file access; reading/
// writing cell values still goes through the separate Sheets API.
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'openid',
  'email',
].join(' ')

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
// Rows per listContacts page — matches CrmSyncService/CrmPreviewService's MAX_PAGES=8 assumption
// (8 * 250 = 2000 rows before a sync run needs a second click of "Continue sync").
const PAGE_SIZE = 250
// Cap on how many rows the mapping-preview step will read/count in one call. A sheet larger than
// this still previews (truncated=true) but the actual import (listContacts, above) has no such
// cap — it just paginates.
const PREVIEW_ROW_CAP = 5000

function requireConfig() {
  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_SHEETS_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_SHEETS_REDIRECT_URI ??
    `${process.env.TRACKING_BASE_URL ?? 'http://localhost:3001'}/integrations/GOOGLE_SHEETS/oauth/callback`
  if (!clientId || !clientSecret)
    throw { statusCode: 503, message: 'Google Sheets is not configured' }
  return { clientId, clientSecret, redirectUri }
}

async function readValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`
  const json = await jsonFetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    errorLabel: 'Google Sheets values',
  })
  return (json.values as string[][] | undefined) ?? []
}

export const googleSheetsConnector: CrmLiveConnector = {
  provider: 'GOOGLE_SHEETS',
  capabilities: catalogEntry('GOOGLE_SHEETS')!.capabilities,
  oauth: true,
  configured: () =>
    Boolean(process.env.GOOGLE_SHEETS_CLIENT_ID && process.env.GOOGLE_SHEETS_CLIENT_SECRET),
  authUrl(state) {
    const { clientId, redirectUri } = requireConfig()
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', SCOPES)
    // offline + consent so a refresh token is issued on every connect, not only the first —
    // required to retain the connection across sessions (see GoogleSheetsService's
    // ensureFreshToken), matching the product's "don't ask them to reconnect every session" call.
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('state', state)
    return url.toString()
  },
  async exchangeCode(code) {
    const { clientId, clientSecret, redirectUri } = requireConfig()
    const token = await jsonFetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
      errorLabel: 'Google token',
    })
    const accessToken = String(token.access_token ?? '')
    const userinfo = await jsonFetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      errorLabel: 'Google userinfo',
    })
    const expiresIn = Number(token.expires_in ?? 0)
    return {
      accessToken,
      refreshToken: token.refresh_token ? String(token.refresh_token) : undefined,
      expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
      externalAccountId: String(userinfo.email ?? ''),
    } satisfies CrmToken
  },
  async listContacts(token, cursor, opts) {
    const spreadsheetId = opts?.spreadsheetId
    const sheetTab = opts?.sheetTab
    const mapping = opts?.columnMapping
    if (!spreadsheetId || !sheetTab || !mapping) {
      throw { statusCode: 409, message: 'Pick a spreadsheet, tab, and column mapping first' }
    }
    const startRow = cursor ? Number(cursor) : 2 // row 1 is headers
    const endRow = startRow + PAGE_SIZE - 1
    const rows = await readValues(token, spreadsheetId, `'${sheetTab}'!A${startRow}:Z${endRow}`)
    const contacts: CrmContactPage['contacts'] = []
    rows.forEach((row, i) => {
      const rowNumber = startRow + i
      const get = (idx?: number) =>
        idx === undefined ? undefined : (row[idx] ?? '').trim() || undefined
      const email = get(mapping.email)
      const phone = get(mapping.phone)
      // A row with neither is not a usable contact — resolveContact requires one of
      // email/phone/externalId, and using the row number alone as externalId would import every
      // blank/formatting row in the sheet as a nameless contact.
      if (!email && !phone) return
      const name = get(mapping.name)
      contacts.push({
        externalId: `row_${rowNumber}`,
        name: name ?? email ?? phone ?? `Row ${rowNumber}`,
        email: email ?? null,
        phone: phone ?? null,
        company: get(mapping.company) ?? null,
        raw: { row: rowNumber },
      })
    })
    const hasMore = rows.length === PAGE_SIZE
    return { contacts, cursor: hasMore ? String(endRow + 1) : null }
  },
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = requireConfig()
  const token = await jsonFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    errorLabel: 'Google token refresh',
  })
  const expiresIn = Number(token.expires_in ?? 0)
  return {
    accessToken: String(token.access_token ?? ''),
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
  }
}

export async function listSheetTabs(accessToken: string, spreadsheetId: string) {
  const json = await jsonFetch(
    `${SHEETS_API}/${spreadsheetId}?fields=${encodeURIComponent('properties.title,sheets.properties')}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, errorLabel: 'Google Sheets metadata' },
  )
  const spreadsheetTitle =
    (json.properties as { title?: string } | undefined)?.title ?? 'Untitled spreadsheet'
  const sheets =
    (json.sheets as { properties?: { title?: string; sheetId?: number } }[] | undefined) ?? []
  return {
    spreadsheetTitle,
    tabs: sheets.map((s) => ({
      title: s.properties?.title ?? 'Sheet1',
      sheetId: s.properties?.sheetId ?? 0,
    })),
  }
}

// No A1 range = the sheet's whole populated area, not its allocated grid size — the one call that
// gives an accurate "how many rows are actually filled" count without guessing from
// gridProperties.rowCount, which includes trailing empty rows Sheets pre-allocates.
export async function readSheetRawRows(
  accessToken: string,
  spreadsheetId: string,
  sheetTab: string,
) {
  const rows = await readValues(accessToken, spreadsheetId, `'${sheetTab}'`)
  return {
    rows: rows.slice(0, PREVIEW_ROW_CAP + 1),
    truncated: rows.length > PREVIEW_ROW_CAP + 1,
  }
}

export async function createExportSpreadsheet(
  accessToken: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const create = await jsonFetch(SHEETS_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title } }),
    errorLabel: 'Google Sheets create',
  })
  const spreadsheetId = String(create.spreadsheetId ?? '')
  const sheetTitle =
    (create.sheets as { properties?: { title?: string } }[] | undefined)?.[0]?.properties?.title ??
    'Sheet1'
  await jsonFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(`'${sheetTitle}'!A1`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers, ...rows] }),
      errorLabel: 'Google Sheets write',
    },
  )
  return {
    spreadsheetId,
    url:
      (create.spreadsheetUrl as string | undefined) ??
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  }
}

// Everything GoogleSheetsService persists into Integration.providerConfig for one integration —
// which spreadsheet/tab is selected and how its columns map to contact fields. Read back here
// (not in GoogleSheetsService) so CrmSyncService/CrmPreviewService, which already loop over every
// provider generically, can build listContacts' opts without knowing Sheets-specific shape.
export type GoogleSheetsProviderConfig = {
  spreadsheetId?: string
  spreadsheetName?: string
  sheetTab?: string
  columnMapping?: GoogleColumnMapping
}

export function parseProviderConfig(raw: unknown): GoogleSheetsProviderConfig {
  return (raw && typeof raw === 'object' ? (raw as GoogleSheetsProviderConfig) : {}) ?? {}
}

export type { GoogleColumnMapping }
