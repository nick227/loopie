import { escapeHtml, safeHttpUrl } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

export type GalleryItem = { url?: string; src?: string; alt?: string; caption?: string }

export function galleryItems(content: unknown): GalleryItem[] {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  return Array.isArray(c.items) ? (c.items as GalleryItem[]) : []
}

// Shared tile markup — `tileClassFor` lets Studio add its `lp-parallax-tile` class to alternating
// tiles (starters/studio/definition.ts) without this module knowing why.
export function renderGalleryTiles(
  items: GalleryItem[],
  tileClassFor: (index: number) => string = () => 'lp-gallery-tile',
): string {
  return items
    .map((item, index) => {
      const src = safeHttpUrl(item.src) || safeHttpUrl(item.url)
      if (!src) return ''
      const caption = item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''
      return `<figure class="${tileClassFor(index)}" data-lp-lightbox-src="${escapeHtml(src)}" data-lp-lightbox-caption="${escapeHtml(item.caption ?? '')}"><img src="${escapeHtml(src)}" alt="${escapeHtml(item.alt ?? '')}" loading="lazy" />${caption}</figure>`
    })
    .join('')
}

// Shared default — Studio's own lp-snap/h-drift/colorWash variant lives in
// starters/studio/definition.ts and reuses renderGalleryTiles for the individual tiles.
export function renderPhotoGallery({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = galleryItems(content)
  if (!items.length) return ''
  // Deliberately ignores c.body, matching the pre-extraction default renderer exactly — only
  // Studio's own override (starters/studio/definition.ts) ever renders a gallery intro body.
  const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
  const tiles = renderGalleryTiles(items)
  return `<section class="lp-section lp-gallery">${title}<div class="lp-gallery-grid">${tiles}</div></section>`
}
