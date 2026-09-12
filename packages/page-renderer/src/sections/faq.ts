import { escapeHtml } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

export function renderFaq({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = Array.isArray(c.items) ? (c.items as { question: string; answer: string }[]) : []
  if (!items.length) return ''
  const rows = items
    .map(
      (item) =>
        `<details class="lp-faq-item"><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`,
    )
    .join('')
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
  return `<section class="lp-section lp-faq"><div class="lp-section-heading">${headline}${body}</div><div class="lp-faq-list">${rows}</div></section>`
}
