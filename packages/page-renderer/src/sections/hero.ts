import { escapeHtml, safeHttpUrl, renderCta } from '../core/escape'
import type { SectionRenderInput } from '../core/types'

export type HeroClassOverrides = {
  copyClass?: string
  mediaClass?: string
  // When a template schema pairs 'hero' with an immediately-following 'media-image' section
  // (composition/composePage.ts detects this adjacency), that sibling section is the single
  // source of truth for the hero's photo — hero's own `content.media` field is legacy/unused for
  // those schemas (the editor's own HeroBlock never reads it either, see PageCanvas.tsx). Passing
  // `externalMediaHtml` here overrides whatever `content.media` would have produced: '' to
  // suppress the hero's own image entirely (Stacked/Centered — the sibling section still renders
  // on its own, right after), or real `.lp-hero-media` markup built from the sibling's content to
  // group them into one two-column composition (Split). `undefined` (the default) preserves the
  // original behavior for every other template, which never has this adjacency.
  externalMediaHtml?: string
}

// Shared hero markup used by every Starter except Studio (which pulls its hero into a parallax
// bridge with no inline media — see starters/studio/definition.ts). Portfolio reuses this exact
// builder with two different class names (its full-bleed background image treatment) rather than
// a second copy of the same markup — see starters/portfolio/definition.ts.
export function renderHeroMarkup(
  { content }: SectionRenderInput,
  {
    copyClass = 'lp-hero-copy',
    mediaClass = 'lp-hero-media',
    externalMediaHtml,
  }: HeroClassOverrides = {},
): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const eyebrow = c.eyebrow ? `<p class="lp-hero-eyebrow">${escapeHtml(c.eyebrow)}</p>` : ''
  const badges = Array.isArray(c.badges)
    ? (c.badges as string[])
        .map((badge) => `<span class="lp-hero-badge">${escapeHtml(badge)}</span>`)
        .join('')
    : ''
  const headline = c.headline ? `<h1>${escapeHtml(c.headline)}</h1>` : ''
  const body = c.body ? `<p class="lp-subheadline">${escapeHtml(c.body)}</p>` : ''
  const cta = renderCta(c.primaryCta)
  let mediaHtml: string
  if (externalMediaHtml !== undefined) {
    mediaHtml = externalMediaHtml
  } else {
    const media = (c.media && typeof c.media === 'object' ? c.media : {}) as Record<string, unknown>
    const src = safeHttpUrl(media.src) || safeHttpUrl(media.url)
    mediaHtml = src
      ? `<div class="${mediaClass}"><img src="${escapeHtml(src)}" alt="${escapeHtml((media.alt as string) ?? '')}" /></div>`
      : ''
  }
  return `<section class="lp-section lp-hero"><div class="${copyClass}">${badges || eyebrow || '<p class="lp-kicker">Now booking</p>'}${headline}${body}${cta}</div>${mediaHtml}</section>`
}

// Builds the `.lp-hero-media` markup for a 'media-image' section's content, in the exact shape
// renderHeroMarkup's own content.media branch produces — used when grouping a paired hero+media
// section into one composition (see composition/composePage.ts). Returns '' when the sibling has
// no real image, matching every other "no media" case in this file.
export function renderAdjacentHeroMediaHtml(
  mediaContent: unknown,
  mediaClass = 'lp-hero-media',
): string {
  const c = (mediaContent && typeof mediaContent === 'object' ? mediaContent : {}) as Record<
    string,
    unknown
  >
  const src = safeHttpUrl(c.src) || safeHttpUrl(c.url)
  return src ? `<div class="${mediaClass}"><img src="${escapeHtml(src)}" alt="" /></div>` : ''
}

export function renderHero(input: SectionRenderInput): string {
  return renderHeroMarkup(input)
}
