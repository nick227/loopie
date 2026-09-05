import { db } from '@project/db'
import {
  createExportSpreadsheet,
  listSheetTabs,
  parseProviderConfig,
  readSheetRawRows,
  type GoogleColumnMapping,
  type GoogleSheetsProviderConfig,
} from '../lib/crm/googleSheets'
import { ensureFreshToken } from './CrmOAuthService'
import type { Integration } from '@prisma/client'

const SAMPLE_ROWS = 5

async function requireIntegration(businessId: string, integrationId: string): Promise<Integration> {
  const row = await db.integration.findFirst({
    where: { id: integrationId, businessId, provider: 'GOOGLE_SHEETS' },
  })
  if (!row) throw { statusCode: 404, message: 'Google Sheets integration not found' }
  return row
}

// Header keyword match, first column that matches wins — same "good enough default, user can
// override" spirit as the rest of this flow. Checked in this order so a sheet with both a
// "Company" and "Company Email" column doesn't let the looser email match win the name slot, etc.
const KEYWORDS: Record<keyof GoogleColumnMapping, RegExp> = {
  email: /e-?mail/i,
  phone: /phone|mobile|cell|tel(?:ephone)?/i,
  company: /company|business|organi[sz]ation/i,
  name: /name/i,
}

export function suggestMapping(headers: string[]): GoogleColumnMapping {
  const mapping: GoogleColumnMapping = {}
  const taken = new Set<number>()
  for (const field of ['email', 'phone', 'company', 'name'] as (keyof GoogleColumnMapping)[]) {
    const idx = headers.findIndex((h, i) => !taken.has(i) && KEYWORDS[field].test(h))
    if (idx >= 0) {
      mapping[field] = idx
      taken.add(idx)
    }
  }
  return mapping
}

export class GoogleSheetsService {
  // Short-lived Google access token handed to the frontend's Google Picker widget so file
  // selection happens against the user's real Drive account without the server ever needing to
  // enumerate it. Refresh tokens never leave the server — this is the one thing crossing the wire.
  async pickerToken(businessId: string, integrationId: string) {
    const integration = await requireIntegration(businessId, integrationId)
    const creds = await ensureFreshToken(integration)
    return { accessToken: creds.accessToken }
  }

  async selectSpreadsheet(
    businessId: string,
    integrationId: string,
    input: { spreadsheetId: string; spreadsheetName: string },
  ) {
    if (!input.spreadsheetId) throw { statusCode: 400, message: 'spreadsheetId is required' }
    await requireIntegration(businessId, integrationId)
    // Picking a new spreadsheet invalidates any previously chosen tab/mapping — they described a
    // different file's columns.
    const config: GoogleSheetsProviderConfig = {
      spreadsheetId: input.spreadsheetId,
      spreadsheetName: input.spreadsheetName,
    }
    const row = await db.integration.update({
      where: { id: integrationId },
      data: { providerConfig: config as object },
    })
    return this.toDTO(row)
  }

  async listTabs(businessId: string, integrationId: string) {
    const integration = await requireIntegration(businessId, integrationId)
    const config = parseProviderConfig(integration.providerConfig)
    if (!config.spreadsheetId) throw { statusCode: 409, message: 'Pick a spreadsheet first' }
    const creds = await ensureFreshToken(integration)
    const { tabs } = await listSheetTabs(creds.accessToken, config.spreadsheetId)
    return tabs
  }

  async selectTab(businessId: string, integrationId: string, input: { sheetTab: string }) {
    if (!input.sheetTab) throw { statusCode: 400, message: 'sheetTab is required' }
    const integration = await requireIntegration(businessId, integrationId)
    const config = parseProviderConfig(integration.providerConfig)
    if (!config.spreadsheetId) throw { statusCode: 409, message: 'Pick a spreadsheet first' }
    // A new tab means new columns — drop any mapping chosen against the previous tab rather than
    // silently reusing indices that may now point at different fields.
    const next: GoogleSheetsProviderConfig = {
      ...config,
      sheetTab: input.sheetTab,
      columnMapping: undefined,
    }
    const row = await db.integration.update({
      where: { id: integrationId },
      data: { providerConfig: next as object },
    })
    return this.toDTO(row)
  }

  // Reads the chosen tab's real data and reports what an import would do — total data rows, how
  // many have an email/phone, how many would be skipped (neither), plus a suggested column
  // mapping the frontend shows the user to confirm or override before anything touches the CRM. A
  // `mapping` override recomputes the same stats against a user-adjusted mapping instead of the
  // auto-detected one, without persisting anything yet (see confirmMapping).
  async preview(businessId: string, integrationId: string, mappingOverride?: GoogleColumnMapping) {
    const integration = await requireIntegration(businessId, integrationId)
    const config = parseProviderConfig(integration.providerConfig)
    if (!config.spreadsheetId || !config.sheetTab) {
      throw { statusCode: 409, message: 'Pick a spreadsheet and tab first' }
    }
    const creds = await ensureFreshToken(integration)
    const { rows, truncated } = await readSheetRawRows(
      creds.accessToken,
      config.spreadsheetId,
      config.sheetTab,
    )
    const headers = (rows[0] ?? []).map((h, i) => h?.trim() || `Column ${i + 1}`)
    const dataRows = rows.slice(1)
    const mapping = mappingOverride ?? config.columnMapping ?? suggestMapping(headers)

    const cell = (row: string[], idx?: number) =>
      idx === undefined ? undefined : (row[idx] ?? '').trim() || undefined
    let withEmail = 0
    let withPhone = 0
    let toImport = 0
    for (const row of dataRows) {
      const email = cell(row, mapping.email)
      const phone = cell(row, mapping.phone)
      if (email) withEmail++
      if (phone) withPhone++
      if (email || phone) toImport++
    }

    return {
      spreadsheetName: config.spreadsheetName ?? null,
      sheetTab: config.sheetTab,
      headers,
      sampleRows: dataRows.slice(0, SAMPLE_ROWS),
      suggestedMapping: mapping,
      totalRows: dataRows.length,
      withEmail,
      withPhone,
      toImport,
      toSkip: dataRows.length - toImport,
      truncated,
    }
  }

  async confirmMapping(
    businessId: string,
    integrationId: string,
    input: { mapping: GoogleColumnMapping },
  ) {
    if (input.mapping.email === undefined && input.mapping.phone === undefined) {
      throw { statusCode: 400, message: 'Map at least an email or phone column' }
    }
    const integration = await requireIntegration(businessId, integrationId)
    const config = parseProviderConfig(integration.providerConfig)
    if (!config.spreadsheetId || !config.sheetTab) {
      throw { statusCode: 409, message: 'Pick a spreadsheet and tab first' }
    }
    const next: GoogleSheetsProviderConfig = { ...config, columnMapping: input.mapping }
    const row = await db.integration.update({
      where: { id: integrationId },
      data: { providerConfig: next as object },
    })
    return this.toDTO(row)
  }

  // CRM -> Sheets. Creates a brand-new spreadsheet (never writes into a connected one) with every
  // active contact and returns a link — the export side of the integration, independent of
  // whether this business has ever imported from Sheets at all.
  async exportContacts(businessId: string, integrationId: string, input: { title?: string }) {
    const integration = await requireIntegration(businessId, integrationId)
    const creds = await ensureFreshToken(integration)
    const [business, contacts] = await Promise.all([
      db.business.findUnique({ where: { id: businessId }, select: { name: true } }),
      db.contact.findMany({
        where: { businessId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5000,
        include: {
          leads: { where: { closedAt: null }, take: 1, orderBy: { openedAt: 'desc' } },
          sales: { where: { reversedAt: null } },
        },
      }),
    ])
    const title =
      input.title?.trim() ||
      `${business?.name ?? 'LOOPIE'} Contacts — ${new Date().toLocaleDateString()}`
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Last Contact', 'Revenue']
    const rows = contacts.map((c) => [
      c.name,
      c.email ?? '',
      c.phone ?? '',
      c.company ?? '',
      c.leads[0]?.stage ?? '',
      c.lastContactedAt ? c.lastContactedAt.toISOString().slice(0, 10) : '',
      c.sales.reduce((sum, s) => sum + Number(s.amount), 0),
    ])
    const result = await createExportSpreadsheet(creds.accessToken, title, headers, rows)
    return { ...result, contactCount: contacts.length }
  }

  private toDTO(row: Integration) {
    const config = parseProviderConfig(row.providerConfig)
    return {
      integrationId: row.id,
      spreadsheetId: config.spreadsheetId ?? null,
      spreadsheetName: config.spreadsheetName ?? null,
      sheetTab: config.sheetTab ?? null,
      columnMapping: config.columnMapping ?? null,
    }
  }
}
