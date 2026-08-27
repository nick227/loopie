import type { SectionContent } from '../components/types'

export function hydratePageSections(
  current: Record<string, SectionContent>,
  sections: { key: string }[],
): Record<string, SectionContent> {
  const next = { ...current }
  let changed = false
  for (const section of sections) {
    if (next[section.key]) continue
    if (section.key === 'split') {
      next.split = {
        hidden: false,
        headline: typeof current.hero?.headline === 'string' ? current.hero.headline : '',
        imageUrl: typeof current.image?.imageUrl === 'string' ? current.image.imageUrl : undefined,
        assetId: typeof current.image?.assetId === 'string' ? current.image.assetId : undefined,
      }
    } else {
      next[section.key] = { hidden: false }
    }
    changed = true
  }
  return changed ? next : current
}
