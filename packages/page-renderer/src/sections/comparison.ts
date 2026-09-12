import { escapeHtml } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

// No Starter renders this any differently.
export function renderComparison({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = Array.isArray(c.items)
    ? (c.items as { feature: string; us: string | boolean; them: string | boolean }[])
    : []
  if (!items.length) return ''
  const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
  const rows = items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.feature)}</td><td>${typeof item.us === 'boolean' ? (item.us ? 'Yes' : 'No') : escapeHtml(item.us)}</td><td>${typeof item.them === 'boolean' ? (item.them ? 'Yes' : 'No') : escapeHtml(item.them)}</td></tr>`,
    )
    .join('')
  return `<section class="lp-section lp-comparison">${title}<table>${rows}</table></section>`
}
