import { escapeHtml, safeHttpUrl } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

export type TeamMemberItem = {
  name: string
  role?: string
  bio?: string
  media?: { url?: string; src?: string; alt?: string }
}

export function teamItems(content: unknown): TeamMemberItem[] {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  return Array.isArray(c.items) ? (c.items as TeamMemberItem[]) : []
}

export function renderTeamRows(items: TeamMemberItem[]): string {
  return items
    .map((item) => {
      const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
      const photo = src
        ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? item.name)}" />`
        : `<div class="lp-team-photo-empty"></div>`
      return `<div class="lp-team-member">${photo}<h3>${escapeHtml(item.name)}</h3>${item.role ? `<p class="lp-team-role">${escapeHtml(item.role)}</p>` : ''}${item.bio ? `<p class="lp-team-bio">${escapeHtml(item.bio)}</p>` : ''}</div>`
    })
    .join('')
}

function teamHeading(content: unknown): { headline: string; body: string } {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  return {
    headline: c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : '',
    body: c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : '',
  }
}

// Shared default — Studio's own lp-snap/rise variant lives in starters/studio/definition.ts and
// reuses renderTeamRows for the individual member cards.
export function renderTeam({ content }: SectionRenderInput): string {
  const items = teamItems(content)
  if (!items.length) return ''
  const { headline, body } = teamHeading(content)
  return `<section class="lp-section lp-team"><div class="lp-section-heading">${headline}${body}</div><div class="lp-team-grid">${renderTeamRows(items)}</div></section>`
}
