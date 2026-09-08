import { resolveImportHeader } from '@project/sdk/src/lib/importContactSchema'
import { db } from '@project/db'
import { createExportSpreadsheet, type GoogleColumnMapping } from '../lib/crm/googleSheets'
import { ensureFreshToken } from './CrmOAuthService'
import type { Integration } from '@prisma/client'

async function requireIntegration(businessId: string, integrationId: string): Promise<Integration> {
  const row = await db.integration.findFirst({
    where: { id: integrationId, businessId, provider: 'GOOGLE_SHEETS' },
  })
  if (!row) throw { statusCode: 404, message: 'Google Sheets integration not found' }
  return row
}

const MAPPING_FIELDS = new Set([
  'name',
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'externalId',
  'jobTitle',
  'website',
  'address',
  'city',
  'state',
  'postalCode',
  'country',
  'notes',
])

export function suggestMapping(headers: string[]): GoogleColumnMapping {
  const mapping: GoogleColumnMapping = {}
  headers.forEach((header, index) => {
    const resolved = resolveImportHeader(header)
    const key = (resolved === 'mobile' ? 'phone' : resolved) as keyof GoogleColumnMapping
    if (MAPPING_FIELDS.has(key) && mapping[key] === undefined) mapping[key] = index
  })
  return mapping
}

export function validateMapping(mapping: GoogleColumnMapping, width?: number) {
  const taken = new Set<number>()
  for (const [key, index] of Object.entries(mapping)) {
    if (
      !MAPPING_FIELDS.has(key) ||
      !Number.isInteger(index) ||
      index < 0 ||
      (width !== undefined && index >= width) ||
      taken.has(index)
    ) {
      throw { statusCode: 400, message: 'Choose a different, valid column for each mapped field' }
    }
    taken.add(index)
  }
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
}
