import { escapeHtml } from '../core/escape'
import { sectionIdAttr } from '../core/context'
import type { SectionRenderInput } from '../core/types'

export type TestimonialItem = { quote: string; author: string; role?: string }

export function testimonialItems(content: unknown): TestimonialItem[] {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  return Array.isArray(c.items) ? (c.items as TestimonialItem[]) : []
}

export function testimonialHeading(content: unknown): { headline: string; body: string } {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  return {
    headline: c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : '',
    body: c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : '',
  }
}

// Shared carousel slide/control markup — used by both Studio's and Portfolio's own 'testimonials'
// overrides (see starters/studio/definition.ts and starters/portfolio/definition.ts), which each
// wrap it in a different outer section. The slide/control markup itself carries no Starter
// identity of its own.
export function renderTestimonialCarouselInner(items: TestimonialItem[]): {
  slides: string
  controls: string
} {
  const slides = items
    .map(
      (item, index) =>
        `<blockquote class="lp-testimonial${index === 0 ? ' is-active' : ''}" data-lp-slide="${index}"${index === 0 ? '' : ' hidden'}><p>${escapeHtml(item.quote)}</p><cite>${escapeHtml(item.author)}${item.role ? `, ${escapeHtml(item.role)}` : ''}</cite></blockquote>`,
    )
    .join('')
  const controls =
    items.length > 1
      ? `<div class="lp-carousel-controls"><button type="button" data-lp-carousel-prev aria-label="Previous testimonial">‹</button><div class="lp-carousel-dots">${items
          .map(
            (_, index) =>
              `<button type="button" class="lp-carousel-dot${index === 0 ? ' is-active' : ''}" data-lp-carousel-dot="${index}" aria-label="Show testimonial ${index + 1}"></button>`,
          )
          .join(
            '',
          )}</div><button type="button" data-lp-carousel-next aria-label="Next testimonial">›</button></div>`
      : ''
  return { slides, controls }
}

// Shared default (a static grid, no carousel) — used by every Starter except Studio and
// Portfolio, which both use the carousel variant above instead.
export function renderTestimonials({ section, content }: SectionRenderInput): string {
  const items = testimonialItems(content)
  if (!items.length) return ''
  const { headline, body } = testimonialHeading(content)
  const rows = items
    .map(
      (item) =>
        `<blockquote class="lp-testimonial"><p>${escapeHtml(item.quote)}</p><cite>${escapeHtml(item.author)}${item.role ? `, ${escapeHtml(item.role)}` : ''}</cite></blockquote>`,
    )
    .join('')
  return `<section class="lp-section lp-testimonials"${sectionIdAttr(section)}><div class="lp-section-heading">${headline}${body}</div><div class="lp-testimonial-grid">${rows}</div></section>`
}
