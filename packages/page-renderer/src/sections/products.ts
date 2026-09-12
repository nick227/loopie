import { escapeHtml, safeHttpUrl } from '../core/escape'
import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

// No Starter renders this any differently (Store is the only real-world consumer, but the markup
// itself carries no Store-specific decision — Store's own skin CSS is what gives it a retail look).
export function renderProductGrid({ section, content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = Array.isArray(c.items)
    ? (c.items as {
        name: string
        price?: string
        badge?: string
        media?: { url?: string; src?: string; alt?: string }
        cta?: unknown
      }[])
    : []
  if (!items.length) return ''
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
  const cards = items
    .map((item, index) => {
      const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
      const media = src
        ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? item.name)}" />`
        : `<div class="lp-product-media-empty"></div>`
      const badge = item.badge
        ? `<span class="lp-product-badge">${escapeHtml(item.badge)}</span>`
        : ''
      const price = item.price ? `<p class="lp-product-price">${escapeHtml(item.price)}</p>` : ''
      const hiddenClass = index >= 8 ? ' style="display: none;" data-lp-product-hidden="true"' : ''
      return `<article class="lp-product"${hiddenClass}>${badge}<div class="lp-product-media">${media}</div><h3>${escapeHtml(item.name)}</h3>${price}</article>`
    })
    .join('')

  const showMoreHtml =
    items.length > 8
      ? `<div class="lp-product-load-more" style="text-align: center; margin-top: 3rem;"><button type="button" class="lp-cta" onclick="var h=this.parentElement.parentElement.querySelectorAll('[data-lp-product-hidden=true]');Array.prototype.slice.call(h,0,8).forEach(function(el){el.style.display='block';el.removeAttribute('data-lp-product-hidden');});if(h.length===Array.prototype.slice.call(h,0,8).length)this.parentElement.style.display='none';">Show More</button></div>`
      : ''

  return `<section class="lp-section lp-products"${sectionIdAttr(section)}><div class="lp-section-heading">${headline}${body}</div><div class="lp-product-grid">${cards}</div>${showMoreHtml}</section>`
}
