import type { CrmCapabilitySet } from './catalog'
import { CRM_CATALOG, catalogEntry } from './catalog'
import { hubspotConnector } from './hubspot'
import { shopifyConnector } from './shopify'
import type { CrmLiveConnector } from './types'

export type CrmConnector = {
  provider: string
  capabilities: CrmCapabilitySet
  oauth: boolean
  configured: () => boolean
  live?: CrmLiveConnector
}

function stub(provider: (typeof CRM_CATALOG)[number]['provider']): CrmConnector {
  const entry = catalogEntry(provider)!
  return {
    provider: entry.provider,
    capabilities: entry.capabilities,
    oauth: false,
    configured: () => false,
  }
}

const connectors: Record<string, CrmConnector> = {
  HUBSPOT: {
    provider: 'HUBSPOT',
    capabilities: hubspotConnector.capabilities,
    oauth: true,
    configured: hubspotConnector.configured,
    live: hubspotConnector,
  },
  SHOPIFY: {
    provider: 'SHOPIFY',
    capabilities: shopifyConnector.capabilities,
    oauth: true,
    configured: shopifyConnector.configured,
    live: shopifyConnector,
  },
  SALESFORCE: stub('SALESFORCE'),
  SQUARE: stub('SQUARE'),
  PIPEDRIVE: stub('PIPEDRIVE'),
}

export function getCrmConnector(provider: string): CrmConnector {
  const connector = connectors[provider]
  if (!connector) throw { statusCode: 400, message: 'Unknown CRM provider' }
  return connector
}

export function getLiveConnector(provider: string): CrmLiveConnector {
  const live = getCrmConnector(provider).live
  if (!live) throw { statusCode: 501, message: 'No live connector for this provider' }
  return live
}

export function listCrmConnectors() {
  return CRM_CATALOG.map((row) => {
    const connector = connectors[row.provider]
    return {
      ...row,
      oauth: connector?.oauth ?? false,
      configured: connector?.configured() ?? false,
    }
  })
}
