import { db, absoluteMediaUrl } from '@project/db'
import { PUBLIC_SERVER_URL } from './urls'

// Content is canonical (packages/db/src/content.ts) but a media reference can live at any depth
// — content.hero.media.assetId, content.services.items[3].media.assetId, etc. — so this walks the
// whole tree for any node carrying an `assetId`, rather than hardcoding known paths.
function collectAssetIds(node: unknown, ids: Set<string>) {
  if (Array.isArray(node)) {
    for (const item of node) collectAssetIds(item, ids)
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if (typeof obj.assetId === 'string') ids.add(obj.assetId)
    for (const value of Object.values(obj)) collectAssetIds(value, ids)
  }
}

function resolveAssetIds<T>(node: T, srcById: Map<string, string>): T {
  if (Array.isArray(node)) {
    return node.map((item) => resolveAssetIds(item, srcById)) as unknown as T
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      next[key] = resolveAssetIds(value, srcById)
    }
    if (typeof obj.assetId === 'string') {
      const src = srcById.get(obj.assetId)
      if (src) next.src = src
    }
    return next as T
  }
  return node
}

export async function withResolvedMedia<T>(businessId: string, content: T): Promise<T> {
  const ids = new Set<string>()
  collectAssetIds(content, ids)
  if (ids.size === 0) return content

  const assets = await db.asset.findMany({
    where: { id: { in: [...ids] }, businessId, deletedAt: null },
    select: { id: true, url: true },
  })
  const srcById = new Map(
    assets
      .map((asset) => [asset.id, absoluteMediaUrl(asset.url, PUBLIC_SERVER_URL)] as const)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
  return resolveAssetIds(content, srcById)
}
