import type { AdPlatformConnector } from './types'
import { metaConnector } from './meta'

const connectors: Record<string, AdPlatformConnector> = {
  META: metaConnector,
}

export const UNREGISTERED_MESSAGE =
  'No connector for this platform — see docs/features/04-platform-integration-matrix.md'

export function getConnector(platform: string): AdPlatformConnector {
  const connector = connectors[platform]
  if (!connector) throw { statusCode: 501, message: UNREGISTERED_MESSAGE }
  return connector
}

export function tryGetConnector(platform: string): AdPlatformConnector | null {
  return connectors[platform] ?? null
}
