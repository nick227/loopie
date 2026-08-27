import { youtubeEmbedUrl } from '@project/db'

type TemplateSection = {
  key: string
  type: string
  order: number
  hideable?: boolean
  editable?: string[]
}

type SectionContent = Record<string, unknown> & { hidden?: boolean }
type PageContent = { sections?: Record<string, SectionContent> }

type RenderFormField = {
  label: string
  fieldKey: string
  type: string
  required: boolean
  options: unknown
}

export type RenderForm = { id: string; submitLabel: string; fields: RenderFormField[] } | null

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderAdSlot(embedUrl: string, sessionToken?: string): string {
  const src = sessionToken ? `${embedUrl}?sid=${encodeURIComponent(sessionToken)}` : embedUrl
  return `<section class="lp-section lp-ad"><iframe src="${escapeHtml(src)}" title="Ad" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>`
}

function slotsAt(
  slots: { placement: string; embedUrl: string | null }[],
  placement: string,
  sessionToken?: string,
) {
  return slots
    .filter((slot) => slot.placement === placement && slot.embedUrl)
    .map((slot) => renderAdSlot(slot.embedUrl!, sessionToken))
    .join('\n')
}

export function renderBody(
  sections: TemplateSection[],
  content: PageContent,
  formHtml: string,
  adSlots: { placement: string; embedUrl: string | null }[],
  sessionToken?: string,
) {
  const chunks: string[] = []
  for (const section of sections) {
    if (section.type === 'form-embed') chunks.push(slotsAt(adSlots, 'BEFORE_FORM', sessionToken))
    chunks.push(renderSection(section, content.sections?.[section.key] ?? {}, formHtml))
    if (section.type === 'hero') chunks.push(slotsAt(adSlots, 'AFTER_HERO', sessionToken))
    if (section.type === 'form-embed') chunks.push(slotsAt(adSlots, 'AFTER_FORM', sessionToken))
  }
  chunks.push(slotsAt(adSlots, 'BOTTOM', sessionToken))
  return chunks.filter(Boolean).join('\n')
}

function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
}
export function renderSection(
  section: TemplateSection,
  content: SectionContent,
  formHtml: string,
): string {
  if (content.hidden) return ''

  switch (section.type) {
    case 'hero': {
      const headline = content.headline ? `<h1>${escapeHtml(content.headline)}</h1>` : ''
      const subheadline = content.subheadline
        ? `<p class="lp-subheadline">${escapeHtml(content.subheadline)}</p>`
        : ''
      const cta = content.ctaLabel
        ? `<a class="lp-cta" href="${escapeHtml(content.ctaLink ?? '#form')}">${escapeHtml(content.ctaLabel)}</a>`
        : ''
      return `<section class="lp-section lp-hero"><p class="lp-kicker">Now booking</p>${headline}${subheadline}${cta}</section>`
    }
    case 'feature-grid': {
      const items = Array.isArray(content.items)
        ? (content.items as { title: string; body: string }[])
        : []
      const itemsHtml = items
        .map(
          (item) =>
            `<div class="lp-feature"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></div>`,
        )
        .join('')
      return `<section class="lp-section lp-features"><div class="lp-feature-grid">${itemsHtml}</div></section>`
    }
    case 'form-embed':
      return `<section class="lp-section lp-form" id="form"><div class="lp-form-card"><p class="lp-form-title">Tell us about the job</p>${formHtml}</div></section>`
    case 'footer':
      return `<footer class="lp-section lp-footer"><p>${escapeHtml(content.text ?? '')}</p></footer>`
    case 'media-image': {
      const src = safeHttpUrl(content.src) || safeHttpUrl(content.imageUrl)
      if (!src) return ''
      return `<section class="lp-section lp-media"><img src="${escapeHtml(src)}" alt="" /></section>`
    }
    case 'media-audio': {
      const src = typeof content.src === 'string' ? content.src : ''
      if (!src) return ''
      return `<section class="lp-section lp-media"><audio controls src="${escapeHtml(src)}"></audio></section>`
    }
    case 'media-youtube': {
      const url = typeof content.youtubeUrl === 'string' ? content.youtubeUrl : ''
      const embed = youtubeEmbedUrl(url)
      if (!embed) return ''
      return `<section class="lp-section lp-media"><iframe src="${escapeHtml(embed)}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></section>`
    }
    default:
      return ''
  }
}
