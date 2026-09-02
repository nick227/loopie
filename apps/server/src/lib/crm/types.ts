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
    opts?: { shop?: string; secret?: string },
  ) => Promise<CrmContactPage>
  listOrders?: (
    token: string,
    cursor: string | null,
    opts?: { shop?: string; secret?: string },
  ) => Promise<CrmOrderPage>
}
