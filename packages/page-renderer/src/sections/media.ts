import { escapeHtml, safeHttpUrl } from '../core/escape'
import { youtubeEmbedUrl } from '@project/db'
import type { SectionRenderInput } from '../core/types'

export function renderMediaImage({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const src = safeHttpUrl(c.src) || safeHttpUrl(c.url)
  if (!src) return ''
  return `<section class="lp-section lp-media"><img src="${escapeHtml(src)}" alt="" /></section>`
}

export function renderMediaAudio({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const src = typeof c.src === 'string' ? c.src : typeof c.url === 'string' ? c.url : ''
  if (!src) return ''
  return `<section class="lp-section lp-media"><audio controls src="${escapeHtml(src)}"></audio></section>`
}

export function renderMediaYoutube({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const url = typeof c.youtubeUrl === 'string' ? c.youtubeUrl : ''
  const embed = youtubeEmbedUrl(url)
  if (!embed) return ''
  return `<section class="lp-section lp-media"><iframe src="${escapeHtml(embed)}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></section>`
}
