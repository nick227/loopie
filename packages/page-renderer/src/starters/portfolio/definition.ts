import { sectionIdAttr } from '../../core/context'
import { renderHeroMarkup } from '../../sections/hero'
import { renderServiceSelector } from '../../sections/services'
import {
  testimonialItems,
  testimonialHeading,
  renderTestimonialCarouselInner,
} from '../../sections/testimonials'
import { SCROLL_EFFECTS_SCRIPT } from '../../behaviors/scrollEffects'
import type { SectionRenderInput, StarterDefinition } from '../../core/types'
import { PORTFOLIO_STYLES_CSS } from './styles'

// Portfolio's hero is the shared markup with two different class names — a full-bleed background
// image with a scroll-parallaxed treatment, rather than a second copy of sections/hero.ts.
function renderPortfolioHero(input: SectionRenderInput): string {
  return renderHeroMarkup(input, {
    copyClass: 'lp-hero-copy lp-fade-in-scroll',
    mediaClass: 'lp-hero-media lp-parallax-bg',
  })
}

// Portfolio's service rows use the shared row builder with a kicker label and its own fade-in
// class, inside the exact same generic wrapper the shared default uses.
function renderPortfolioServices(input: SectionRenderInput): string {
  return renderServiceSelector(input, {
    headingMode: 'kicker',
    articleClass: 'lp-service lp-fade-in-row',
  })
}

// Portfolio's testimonials carousel — same slide/control markup as Studio's, wrapped without the
// snap/colorWash treatment Studio adds.
function renderPortfolioTestimonials({ section, content }: SectionRenderInput): string {
  const items = testimonialItems(content)
  if (!items.length) return ''
  const { headline, body } = testimonialHeading(content)
  const { slides, controls } = renderTestimonialCarouselInner(items)
  return `<section class="lp-section lp-testimonials"${sectionIdAttr(section)} data-lp-carousel><div class="lp-section-heading">${headline}${body}</div><div class="lp-carousel-viewport">${slides}</div>${controls}</section>`
}

export const portfolioDefinition: StarterDefinition = {
  id: 'portfolio',
  styles: PORTFOLIO_STYLES_CSS,
  sectionOverrides: {
    hero: renderPortfolioHero,
    'service-selector': renderPortfolioServices,
    testimonials: renderPortfolioTestimonials,
  },
  behaviors: [SCROLL_EFFECTS_SCRIPT],
}
