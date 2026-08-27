import type { CrmCapabilitySet } from './catalog'
import { CRM_CATALOG, catalogEntry } from './catalog'

export type CrmConnector = {
  provider: string
  capabilities: CrmCapabilitySet
  configured: () => boolean
}

function stub(provider: (typeof CRM_CATALOG)[number]['provider']): CrmConnector {
  const entry = catalogEntry(provider)!
  return {
    provider: entry.provider,
    capabilities: entry.capabilities,
    configured: () => false,
  }
}

const connectors: Record<string, CrmConnector> = {
  HUBSPOT: stub('HUBSPOT'),
  SALESFORCE: stub('SALESFORCE'),
  SHOPIFY: stub('SHOPIFY'),
  SQUARE: stub('SQUARE'),
  PIPEDRIVE: stub('PIPEDRIVE'),
}

export function getCrmConnector(provider: string): CrmConnector {
  const connector = connectors[provider]
  if (!connector) throw { statusCode: 400, message: 'Unknown CRM provider' }
  return connector
}

export function listCrmConnectors() {
  return CRM_CATALOG.map((row) => ({
    ...row,
    configured: connectors[row.provider]?.configured() ?? false,
  }))
}
