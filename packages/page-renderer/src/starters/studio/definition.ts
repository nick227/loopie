import { escapeHtml, safeHttpUrl, renderCta } from '../../core/escape'
import { sectionIdAttr } from '../../core/context'
import { renderFeatureItems } from '../../sections/features'
import { serviceItems, type ServiceItem } from '../../sections/services'
import { renderMetricRows, metricItems } from '../../sections/metrics'
import {
  testimonialItems,
  testimonialHeading,
  renderTestimonialCarouselInner,
} from '../../sections/testimonials'
import { renderGalleryTiles, galleryItems } from '../../sections/gallery'
import { renderTeamRows, teamItems } from '../../sections/team'
import { renderLogoCloudMarquee } from '../../sections/logos'
import { SCROLL_EFFECTS_SCRIPT } from '../../behaviors/scrollEffects'
import type { SectionRenderInput, StarterDefinition } from '../../core/types'
import { STUDIO_STYLES_CSS } from './styles'
import { colorWash } from './colorWash'
import { composeStudio } from './compose'

// Studio's hero has no inline media — its media goes to the parallax bridge instead (see
// compose.ts), so this only ever renders the copy.
function renderStudioHero({ content }: SectionRenderInput): string {
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
  return `<section class="lp-section lp-hero lp-snap lp-snap--clear" data-lp-snap data-lp-fx="hero-wipe"><div class="lp-hero-copy">${badges || eyebrow}${headline}${body}${cta}</div></section>`
}

function renderStudioFeatureGrid({ section, content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = Array.isArray(c.items) ? (c.items as { title: string; body: string }[]) : []
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
  return `<section class="lp-section lp-features lp-snap lp-snap--primary" data-lp-snap data-lp-tone="primary" data-lp-fx="rise"${sectionIdAttr(section)}>${colorWash(5, 'primary')}<div class="lp-section-heading"><p class="lp-kicker">How we work</p>${headline}${body}</div><div class="lp-feature-grid">${renderFeatureItems(items)}</div></section>`
}

function renderStudioServiceRow(item: ServiceItem, index: number): string {
  const tones = ['bg', 'ink', 'primary'] as const
  const tone = tones[index % tones.length]
  const src = safeHttpUrl(item.media?.src) || safeHttpUrl(item.media?.url)
  const media = src
    ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.media?.alt ?? '')}" />`
    : ''
  const kicker = `<p class="lp-kicker">${escapeHtml(item.label)}</p>`
  return `<article class="lp-service lp-snap lp-snap--${tone}" data-lp-snap data-lp-tone="${tone}" data-lp-fx="service-slide">${colorWash(index + 1, tone)}${media}<div class="lp-service-copy">${kicker}${item.headline ? `<h3>${escapeHtml(item.headline)}</h3>` : ''}<p>${escapeHtml(item.description ?? '')}</p>${renderCta(item.cta)}</div></article>`
}

// Studio's 'service-selector' renders an optional intro snap panel followed by one snap panel per
// service — deliberately NOT wrapped in a `<section class="lp-services">` container (unlike every
// other Starter's row-based variant), since each row is its own full-height scroll-snap panel.
function renderStudioServices({ content }: SectionRenderInput): string {
  const items = serviceItems(content)
  if (!items.length) return ''
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
  const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
  const rows = items.map((item, index) => renderStudioServiceRow(item, index)).join('')
  const intro =
    title || body
      ? `<section class="lp-section lp-services-intro lp-snap lp-snap--bg" data-lp-snap data-lp-tone="bg">${colorWash(0, 'bg')}<div class="lp-section-heading"><p class="lp-kicker">Capabilities</p>${title}${body}</div></section>`
      : ''
  return `${intro}${rows}`
}

function renderStudioMetrics({ content }: SectionRenderInput): string {
  const items = metricItems(content)
  if (!items.length) return ''
  return `<section class="lp-section lp-metrics lp-snap lp-snap--ink" data-lp-snap data-lp-fx="rise">${renderMetricRows(items)}</section>`
}

function renderStudioTestimonials({ section, content }: SectionRenderInput): string {
  const items = testimonialItems(content)
  if (!items.length) return ''
  const { headline, body } = testimonialHeading(content)
  const { slides, controls } = renderTestimonialCarouselInner(items)
  return `<section class="lp-section lp-testimonials lp-snap lp-snap--ink" data-lp-snap data-lp-tone="ink" data-lp-fx="track-tighten" data-lp-carousel${sectionIdAttr(section)}>${colorWash(6, 'ink')}<div class="lp-section-heading">${headline}${body}</div><div class="lp-carousel-viewport">${slides}</div>${controls}</section>`
}

function renderStudioGallery({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = galleryItems(content)
  if (!items.length) return ''
  const title = c.title ? `<h2>${escapeHtml(c.title)}</h2>` : ''
  const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
  const tiles = renderGalleryTiles(items, (index) =>
    index % 2 !== 0 ? 'lp-gallery-tile lp-parallax-tile' : 'lp-gallery-tile',
  )
  return `<section class="lp-section lp-gallery lp-snap lp-snap--bg" data-lp-snap data-lp-tone="bg" data-lp-fx="h-drift">${colorWash(4, 'bg')}<div class="lp-section-heading"><p class="lp-kicker">Selected work</p>${title}${body}</div><div class="lp-gallery-grid">${tiles}</div></section>`
}

function renderStudioTeam({ content }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const items = teamItems(content)
  if (!items.length) return ''
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p class="lp-section-intro">${escapeHtml(c.body)}</p>` : ''
  return `<section class="lp-section lp-team lp-snap" data-lp-snap data-lp-fx="rise"><div class="lp-section-heading">${headline}${body}</div><div class="lp-team-grid">${renderTeamRows(items)}</div></section>`
}

function renderStudioContact({ section, content, formHtml }: SectionRenderInput): string {
  const c = (content && typeof content === 'object' ? content : {}) as Record<string, unknown>
  const headline = c.headline ? `<h2>${escapeHtml(c.headline)}</h2>` : ''
  const body = c.body ? `<p>${escapeHtml(c.body)}</p>` : ''
  const cta = renderCta(c.cta)
  return `<section class="lp-section lp-studio-contact lp-snap lp-snap--primary" data-lp-snap data-lp-tone="primary" data-lp-fx="fill-rise"${sectionIdAttr(section)}>${colorWash(7, 'primary')}<div>${headline}${body}${cta}</div><div class="lp-form-card">${formHtml}</div></section>`
}

export const studioDefinition: StarterDefinition = {
  id: 'studio',
  styles: STUDIO_STYLES_CSS,
  compose: composeStudio,
  sectionOverrides: {
    hero: renderStudioHero,
    'feature-grid': renderStudioFeatureGrid,
    'service-selector': renderStudioServices,
    metrics: renderStudioMetrics,
    testimonials: renderStudioTestimonials,
    'photo-gallery': renderStudioGallery,
    team: renderStudioTeam,
    'studio-contact': renderStudioContact,
    // Shared with Store's own override — see sections/logos.ts's doc comment.
    'logo-cloud': renderLogoCloudMarquee,
  },
  behaviors: [SCROLL_EFFECTS_SCRIPT],
}
