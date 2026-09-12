export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Only ever render a URL a page author actually typed if it's a real http(s) URL — guards every
// media/link field a section renderer reads from content, so a bad/empty value degrades to no
// markup rather than an unsafe or broken href/src.
export function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
}

export function renderCta(cta: unknown): string {
  if (!cta || typeof cta !== 'object') return ''
  const { label, url } = cta as { label?: unknown; url?: unknown }
  if (typeof label !== 'string' || !label) return ''
  return `<a class="lp-cta" href="${escapeHtml(typeof url === 'string' && url ? url : '#')}">${escapeHtml(label)}</a>`
}
