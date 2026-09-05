import type { CrmCapabilitySet } from './catalog'

export type CrmContactPage = {
  contacts: Array<{
    externalId: string
    name: string
    email?: string | null
    phone?: string | null
    company?: string | null
    externalUpdatedAt?: string | null
    raw?: unknown
  }>
  cursor: string | null
  checkpoint?: string | null
}

export type CrmOrderPage = {
  orders: Array<{
    externalEventId: string
    amount: number
    occurredAt?: string
    productOrService?: string
    contact: {
      externalId?: string
      name?: string
      email?: string | null
      phone?: string | null
    }
    raw?: unknown
  }>
  cursor: string | null
  checkpoint?: string | null
}

export type CrmToken = {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date | null
  externalAccountId: string
}

// Google Sheets-only column mapping: 0-based column indices within the chosen tab, decided by
// the user during GoogleSheetsService's confirm-mapping step. Column indices rather than header
// names so a duplicate/renamed header can't silently break an already-confirmed mapping.
export type GoogleColumnMapping = {
  name?: number
  email?: number
  phone?: number
  company?: number
}

export type CrmListContactsOpts = {
  shop?: string
  secret?: string
  // Google Sheets-only: which spreadsheet/tab to read and how its columns map to contact fields.
  // Every other connector ignores these.
  spreadsheetId?: string
  sheetTab?: string
  columnMapping?: GoogleColumnMapping
}

export type CrmLiveConnector = {
  provider: string
  capabilities: CrmCapabilitySet
  oauth: boolean
  configured: () => boolean
  authUrl: (state: string, opts?: { shop?: string }) => string
  exchangeCode: (code: string, opts?: { shop?: string }) => Promise<CrmToken>
  listContacts: (
    token: string,
    cursor: string | null,
    opts?: CrmListContactsOpts,
  ) => Promise<CrmContactPage>
  listOrders?: (
    token: string,
    cursor: string | null,
    opts?: CrmListContactsOpts,
  ) => Promise<CrmOrderPage>
}
