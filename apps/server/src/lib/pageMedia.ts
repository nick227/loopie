import { db, absoluteMediaUrl } from '@project/db'
import { PUBLIC_SERVER_URL } from './urls'

type SectionContent = Record<string, unknown> & { assetId?: unknown; src?: string }
type PageContent = { sections?: Record<string, SectionContent> }

export async function withResolvedMedia(
  businessId: string,
  content: PageContent,
): Promise<PageContent> {
  const sections = content.sections ?? {}
  const ids = Object.values(sections)
    .map((section) => (typeof section.assetId === 'string' ? section.assetId : null))
    .filter((id): id is string => !!id)
  if (ids.length === 0) return content

  const assets = await db.asset.findMany({
    where: { id: { in: ids }, businessId, deletedAt: null },
    select: { id: true, url: true },
  })
  const srcById = new Map(
    assets.map((asset) => [asset.id, absoluteMediaUrl(asset.url, PUBLIC_SERVER_URL)]),
  )

  const next: Record<string, SectionContent> = {}
  for (const [key, section] of Object.entries(sections)) {
    const src = typeof section.assetId === 'string' ? (srcById.get(section.assetId) ?? null) : null
    next[key] = src ? { ...section, src } : section
  }
  return { sections: next }
}
