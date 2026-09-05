export type CrmCapabilitySet = {
  contacts: boolean
  companies: boolean
  deals: boolean
  orders: boolean
  payments: boolean
  events: boolean
}

export type CrmCatalogEntry = {
  provider:
    | 'HUBSPOT'
    | 'SALESFORCE'
    | 'SHOPIFY'
    | 'WOOCOMMERCE'
    | 'WEBHOOK'
    | 'SQUARE'
    | 'PIPEDRIVE'
    | 'GOOGLE_SHEETS'
  label: string
  capabilities: CrmCapabilitySet
}

export const CRM_CATALOG: CrmCatalogEntry[] = [
  {
    provider: 'HUBSPOT',
    label: 'HubSpot',
    capabilities: {
      contacts: true,
      companies: true,
      deals: true,
      orders: false,
      payments: false,
      events: true,
    },
  },
  {
    provider: 'SALESFORCE',
    label: 'Salesforce',
    capabilities: {
      contacts: true,
      companies: true,
      deals: true,
      orders: false,
      payments: false,
      events: true,
    },
  },
  {
    provider: 'SHOPIFY',
    label: 'Shopify',
    capabilities: {
      contacts: true,
      companies: false,
      deals: false,
      orders: true,
      payments: true,
      events: true,
    },
  },
  {
    provider: 'WOOCOMMERCE',
    label: 'WooCommerce',
    capabilities: {
      contacts: true,
      companies: false,
      deals: false,
      orders: true,
      payments: true,
      events: true,
    },
  },
  {
    provider: 'WEBHOOK',
    label: 'Inbound webhook',
    capabilities: {
      contacts: true,
      companies: false,
      deals: false,
      orders: true,
      payments: true,
      events: true,
    },
  },
  {
    provider: 'SQUARE',
    label: 'Square',
    capabilities: {
      contacts: true,
      companies: false,
      deals: false,
      orders: true,
      payments: true,
      events: true,
    },
  },
  {
    provider: 'PIPEDRIVE',
    label: 'Pipedrive',
    capabilities: {
      contacts: true,
      companies: true,
      deals: true,
      orders: false,
      payments: false,
      events: true,
    },
  },
  {
    provider: 'GOOGLE_SHEETS',
    label: 'Google Sheets',
    capabilities: {
      contacts: true,
      companies: false,
      deals: false,
      orders: false,
      payments: false,
      events: false,
    },
  },
]

export function catalogEntry(provider: string) {
  return CRM_CATALOG.find((row) => row.provider === provider) ?? null
}

export function csvScope(businessId: string) {
  return `csv:${businessId}`
}

export function integrationScope(integrationId: string) {
  return integrationId
}
