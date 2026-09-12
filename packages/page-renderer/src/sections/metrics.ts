import { escapeHtml } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

export type MetricItem = { value: string; label: string; description?: string }

export function metricItems(content: unknown): MetricItem[] {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  return Array.isArray(c.items) ? (c.items as MetricItem[]) : []
}

export function renderMetricRows(items: MetricItem[]): string {
  return items
    .map(
      (item) =>
        `<div class="lp-metric"><span class="lp-metric-value">${escapeHtml(item.value)}</span><span class="lp-metric-label">${escapeHtml(item.label)}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</div>`,
    )
    .join('')
}

// Shared default — Studio's own lp-snap/ink/rise variant lives in starters/studio/definition.ts
// and reuses renderMetricRows for the individual cards.
export function renderMetrics({ content }: SectionRenderInput): string {
  const items = metricItems(content)
  if (!items.length) return ''
  return `<section class="lp-section lp-metrics">${renderMetricRows(items)}</section>`
}
