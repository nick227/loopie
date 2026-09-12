import { escapeHtml } from './escape'
import { FORMAT_ASPECT_RATIO } from '@project/ad-renderer'

// Shared base reset + every section type's own default look — owned by no single Starter. A
// Starter's own skin (starters/*/styles.ts) only ever adds more specific overrides on top of
// this; it never needs to repeat or fight these rules.
export function baseSectionStylesCss(fontFamily: string): string {
  return `* { box-sizing: border-box; }
body { margin: 0; font-family: ${escapeHtml(fontFamily)}; background: var(--lp-bg); color: var(--lp-ink); }
a { color: inherit; }
img { max-width: 100%; }
.lp-section { padding: var(--lp-space-5) var(--lp-gutter); max-width: var(--lp-container-max); margin: 0 auto; }
.lp-nav { min-height: 76px; max-width: var(--lp-container-max); margin: 0 auto; padding: 0 var(--lp-gutter); display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
.lp-brand { font-family: var(--lp-heading); font-size: 1.35rem; font-weight: 800; text-decoration: none; }
.lp-nav-links { display: flex; align-items: center; gap: 1.75rem; }
.lp-nav-links a { color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); font-size: 0.875rem; font-weight: 600; text-decoration: none; }
.lp-nav-cta { display: inline-flex; align-items: center; padding: 0.55rem 1.1rem; background: var(--lp-primary); color: var(--lp-on-primary); text-decoration: none; font-size: 0.875rem; font-weight: 700; white-space: nowrap; }
.lp-kicker { margin: 0 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--lp-primary); }
.lp-hero-eyebrow, .lp-hero-badge { display: inline-block; margin: 0 0 1.25rem; padding: 0.4rem 0.9rem; border-radius: 999px; background: color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
.lp-hero h1 { font-family: var(--lp-heading); font-size: clamp(2.4rem, 5vw, 3.6rem); line-height: 1.08; letter-spacing: -0.035em; margin: 0 0 1rem; font-weight: 700; overflow-wrap: break-word; }
.lp-subheadline { color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); font-size: 1.08rem; line-height: 1.55; max-width: var(--lp-measure); margin: 0; }
.lp-hero-media { margin-top: 2rem; }
.lp-hero-media img { width: 100%; display: block; object-fit: cover; border-radius: var(--lp-radius-lg); }
.lp-cta { display: inline-block; margin-top: 1.5rem; padding: 0.85rem 1.5rem; background: var(--lp-primary); color: var(--lp-on-primary); text-decoration: none; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.02em; }
.lp-section-heading { max-width: var(--lp-measure-wide); margin: 0 auto 2.5rem; text-align: center; }
.lp-section-heading h2, .lp-footer h2, .lp-services > .lp-section-heading h2, .lp-gallery > h2 { font-family: var(--lp-heading); font-size: clamp(1.9rem, 4vw, 3rem); line-height: 1.12; letter-spacing: -0.025em; margin: 0 0 0.8rem; }
.lp-section-intro, .lp-section-heading > p { color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); line-height: 1.65; margin: 0; }
.lp-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px; background: color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: 8px; overflow: hidden; }
.lp-feature { background: var(--lp-card); padding: 1.35rem 1.25rem; }
.lp-feature h3 { margin: 0 0 0.4rem; font-size: 1rem; }
.lp-feature p { margin: 0; color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); font-size: 0.9rem; line-height: 1.45; }
.lp-form-card { background: var(--lp-card); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: 8px; padding: 1.75rem; }
.lp-form-title { font-family: var(--lp-heading); font-size: 1.35rem; margin: 0 0 1.1rem; }
.lp-field { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.lp-field-checkbox { flex-direction: row; align-items: center; }
input, textarea, select { padding: 0.55rem 0.65rem; border: 1px solid color-mix(in srgb, var(--lp-ink) 18%, var(--lp-card)); border-radius: 6px; font: inherit; background: var(--lp-bg); color: var(--lp-ink); }
button[type="submit"] { padding: 0.85rem 1.5rem; background: var(--lp-primary); color: var(--lp-on-primary); border: none; cursor: pointer; font: inherit; font-weight: 600; }
.lp-footer { text-align: center; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); font-size: 0.875rem; }
.lp-ad { padding: var(--lp-space-2) var(--lp-gutter); max-width: var(--lp-container-max); margin: 0 auto; }
.lp-ad iframe { width: 100%; min-height: 90px; max-height: 120px; border: 0; display: block; background: color-mix(in srgb, var(--lp-ink) 6%, var(--lp-bg)); }
/* Ad Designer placement contexts (2026-09-03) — width caps the ad's prominence on the page;
   height/shape always comes from the creative's own format, never the context, so a Poster never
   gets stretched or cropped to fit an unrelated box. */
.lp-ad--inline { max-width: 360px; }
.lp-ad--contained { max-width: 560px; }
.lp-ad--promotional { max-width: 900px; }
.lp-ad--format-poster iframe { aspect-ratio: ${FORMAT_ASPECT_RATIO.POSTER}; min-height: 0; max-height: none; }
.lp-ad--format-story iframe { aspect-ratio: ${FORMAT_ASPECT_RATIO.STORY}; min-height: 0; max-height: none; }
.lp-ad--format-feed_post iframe { aspect-ratio: ${FORMAT_ASPECT_RATIO.FEED_POST}; min-height: 0; max-height: none; }
.lp-media img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 4px; display: block; }
.lp-media audio { width: 100%; }
.lp-media iframe { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 4px; display: block; }
.lp-split { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
.lp-split-media { min-height: 280px; background: color-mix(in srgb, var(--lp-ink) 8%, var(--lp-bg)); }
.lp-split-media img { width: 100%; height: 100%; min-height: 280px; object-fit: cover; display: block; }
.lp-split-copy { display: flex; flex-direction: column; justify-content: center; padding: 48px 40px; background: var(--lp-card); color: var(--lp-ink); }
.lp-split-copy h1 { font-family: var(--lp-heading); font-size: clamp(1.55rem, 3vw, 2.15rem); line-height: 1.2; margin: 0 0 1.4rem; font-weight: 600; }
.lp-split .lp-form-el { max-width: 22rem; }
.lp-error { color: color-mix(in srgb, #e11d48 55%, var(--lp-ink)); font-size: 0.875rem; margin: 0 0 0.75rem; }
.lp-success { color: var(--lp-ink); font-size: 1rem; }
.lp-logo-row { display: flex; flex-wrap: wrap; gap: 2rem; align-items: center; }
.lp-service-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.lp-service { overflow: hidden; background: var(--lp-card); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-radius: var(--lp-radius-lg); }
.lp-service-copy { padding: 1.5rem; }
.lp-service h3, .lp-service h4 { margin: 0 0 0.6rem; }
.lp-service p { color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); line-height: 1.55; }
.lp-service img { width: 100%; aspect-ratio: 4 / 3; display: block; object-fit: cover; }
.lp-service-tabs { display: grid; gap: 2rem; grid-template-columns: minmax(0, .42fr) minmax(0, .58fr); align-items: start; }
.lp-service-tablist { display: flex; flex-direction: column; gap: .75rem; }
.lp-service-tab { text-align: left; padding: 1.1rem 1.25rem; border: 1px solid transparent; border-radius: calc(var(--lp-radius) * 2); background: transparent; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); font: inherit; font-size: 1.1rem; font-weight: 700; cursor: pointer; }
.lp-service-tab.is-active { background: var(--lp-card); border-color: color-mix(in srgb, var(--lp-ink) 15%, var(--lp-bg)); color: var(--lp-ink); box-shadow: 0 20px 40px -20px rgba(0,0,0,.15); }
.lp-service-panel { display: none; overflow: hidden; border-radius: var(--lp-radius-lg); border: 1px solid color-mix(in srgb, var(--lp-ink) 10%, var(--lp-bg)); background: var(--lp-card); }
.lp-service-panel.is-active { display: block; }
.lp-service-panel img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.lp-service-panel .lp-service-copy { padding: 1.75rem; }
.lp-service-index { display: block; font-family: var(--lp-heading); font-size: 1.75rem; font-weight: 700; color: color-mix(in srgb, var(--lp-ink) 28%, var(--lp-bg)); margin-bottom: .75rem; }
.lp-logo-marquee { overflow: hidden; mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
.lp-logo-marquee-track { display: flex; width: max-content; align-items: center; gap: 4rem; animation: lp-marquee 28s linear infinite; }
.lp-logo-marquee-track .lp-logo { flex-shrink: 0; font-size: 1.2rem; font-weight: 600; opacity: .6; }
@keyframes lp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .lp-logo-marquee-track { animation: none; flex-wrap: wrap; width: auto; justify-content: center; }
}
.lp-carousel-viewport { position: relative; }
.lp-carousel-controls { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.75rem; }
.lp-carousel-controls button { border: 0; background: transparent; color: color-mix(in srgb, var(--lp-ink) 55%, var(--lp-bg)); font-size: 1.5rem; line-height: 1; cursor: pointer; padding: .35rem .55rem; }
.lp-carousel-dots { display: flex; gap: .4rem; }
.lp-carousel-dot { width: 1.5rem; height: 1.5rem; padding: 0; border: 0; background: transparent; cursor: pointer; position: relative; }
.lp-carousel-dot::after { content: ''; position: absolute; inset: .45rem; border-radius: 999px; background: color-mix(in srgb, var(--lp-ink) 25%, var(--lp-bg)); }
.lp-carousel-dot.is-active::after { background: var(--lp-ink); }
.lp-form-reassure { margin: -.35rem 0 1.1rem; font-size: .9rem; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); }
.lp-email-chip { font-size: 11px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: color-mix(in srgb, var(--lp-ink) 45%, var(--lp-card)); }
.lp-email-foot { max-width: 560px; margin: 0 auto; padding: 1.1rem 1.75rem 1.4rem; text-align: center; font-size: 11px; line-height: 1.6; color: color-mix(in srgb, var(--lp-ink) 48%, var(--lp-bg)); border: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); border-top: 0; border-radius: 0 0 10px 10px; background: var(--lp-card); }
.lp-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1.5rem; text-align: center; }
.lp-metric-value { display: block; font-size: 2rem; font-weight: 700; }
.lp-metric-label { display: block; font-size: 0.875rem; color: color-mix(in srgb, var(--lp-ink) 65%, var(--lp-bg)); }
.lp-comparison table { width: 100%; border-collapse: collapse; }
.lp-comparison td { padding: 0.75rem; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-testimonial-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.lp-testimonial { margin: 0; padding: 1.25rem; background: var(--lp-card); border-radius: 8px; }
.lp-faq-item { padding: 0.75rem 0; border-bottom: 1px solid color-mix(in srgb, var(--lp-ink) 12%, var(--lp-bg)); }
.lp-webinar { display: grid; gap: 1.5rem; grid-template-columns: 1fr 1fr; }
.lp-webinar-meta { background: color-mix(in srgb, var(--lp-ink) 92%, var(--lp-bg)); color: var(--lp-bg); border-radius: 12px; padding: 1.75rem; }
.lp-webinar-countdown { display: flex; gap: 1.25rem; margin-bottom: 1.25rem; font-variant-numeric: tabular-nums; }
.lp-webinar-countdown span { display: block; text-align: center; }
.lp-webinar-countdown .lp-cd-value { font-size: 1.75rem; font-weight: 800; }
.lp-webinar-countdown .lp-cd-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: color-mix(in srgb, var(--lp-bg) 60%, var(--lp-ink)); }
.lp-webinar-date, .lp-webinar-duration { display: block; margin: 0 0 0.35rem; font-size: 0.925rem; }
.lp-webinar-seats { margin-top: 1.25rem; }
.lp-webinar-seats-count { margin: 0 0 0.4rem; font-size: 0.875rem; font-weight: 600; }
.lp-webinar-bar { height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--lp-bg) 15%, var(--lp-ink)); overflow: hidden; }
.lp-webinar-bar-fill { height: 100%; background: var(--lp-primary); border-radius: 999px; }
.lp-webinar-host { display: flex; align-items: center; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid color-mix(in srgb, var(--lp-bg) 15%, var(--lp-ink)); }
.lp-webinar-host img { width: 44px; height: 44px; border-radius: 999px; object-fit: cover; }
.lp-webinar-host-name { margin: 0; font-weight: 600; font-size: 0.9rem; }
.lp-webinar-host-title { margin: 0; font-size: 0.8rem; color: color-mix(in srgb, var(--lp-bg) 60%, var(--lp-ink)); }
.lp-webinar-host-bio { margin: 0.5rem 0 0; font-size: 0.825rem; color: color-mix(in srgb, var(--lp-bg) 65%, var(--lp-ink)); }
.lp-webinar-form .lp-form-card { height: 100%; box-sizing: border-box; }
.lp-studio-contact { display: grid; gap: 2rem; grid-template-columns: 1fr 1fr; background: color-mix(in srgb, var(--lp-ink) 92%, var(--lp-bg)); color: var(--lp-bg); border-radius: 0; }
.lp-studio-contact h2 { font-family: var(--lp-heading); font-size: clamp(1.75rem, 3vw, 2.5rem); margin: 0 0 0.75rem; }
.lp-studio-contact p { color: color-mix(in srgb, var(--lp-bg) 70%, var(--lp-ink)); margin: 0; }
.lp-studio-contact .lp-form-card { background: transparent; border: none; padding: 0; }
.lp-studio-contact input, .lp-studio-contact select { border: none; border-bottom: 1px solid color-mix(in srgb, var(--lp-bg) 25%, var(--lp-ink)); border-radius: 0; background: transparent; color: var(--lp-bg); padding-left: 0; }
.lp-studio-contact button[type="submit"] { background: transparent; color: var(--lp-bg); border: 1px solid color-mix(in srgb, var(--lp-bg) 35%, var(--lp-ink)); border-radius: 999px; }
.lp-gallery-grid { columns: 2; column-gap: 0.75rem; }
.lp-gallery-tile { margin: 0 0 0.75rem; break-inside: avoid; cursor: zoom-in; }
.lp-gallery-tile img { width: 100%; display: block; }
.lp-gallery-tile figcaption { display: none; }
.lp-lightbox { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: rgba(0,0,0,0.92); padding: 1.5rem; }
.lp-lightbox img { max-height: 80vh; max-width: 92vw; object-fit: contain; }
.lp-lightbox figcaption { color: rgba(255,255,255,0.7); font-size: 0.875rem; max-width: 32rem; text-align: center; }
.lp-lightbox-close { position: absolute; top: 1.25rem; right: 1.25rem; color: rgba(255,255,255,0.7); background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.lp-team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.75rem; }
.lp-team-member { text-align: center; }
.lp-team-member img, .lp-team-photo-empty { width: 128px; height: 128px; object-fit: cover; border-radius: 999px; display: block; margin: 0 auto 1rem; background: color-mix(in srgb, var(--lp-ink) 8%, var(--lp-bg)); }
.lp-team-member h3 { margin: 0 0 0.2rem; font-size: 1.05rem; }
.lp-team-role { margin: 0 0 0.5rem; font-size: 0.825rem; color: color-mix(in srgb, var(--lp-ink) 60%, var(--lp-bg)); }
.lp-team-bio { margin: 0; font-size: 0.875rem; line-height: 1.5; color: color-mix(in srgb, var(--lp-ink) 70%, var(--lp-bg)); }
.lp-product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
.lp-product { position: relative; }
.lp-product-media, .lp-product-media-empty { aspect-ratio: 4 / 5; overflow: hidden; background: color-mix(in srgb, var(--lp-ink) 6%, var(--lp-bg)); margin-bottom: 0.9rem; }
.lp-product-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lp-product-badge { position: absolute; top: 0.75rem; left: 0.75rem; z-index: 1; padding: 0.3rem 0.65rem; border-radius: 999px; background: var(--lp-primary); color: var(--lp-on-primary); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.lp-product h3 { margin: 0 0 0.25rem; font-size: 1rem; }
.lp-product-price { margin: 0 0 0.6rem; font-weight: 700; }
.lp-product .lp-cta { margin-top: 0; padding: 0.5rem 1rem; font-size: 0.825rem; }
.lp-category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
.lp-category-tile { position: relative; display: block; aspect-ratio: 1 / 1; overflow: hidden; text-decoration: none; background: color-mix(in srgb, var(--lp-ink) 6%, var(--lp-bg)); }
.lp-category-tile img, .lp-category-media-empty { width: 100%; height: 100%; object-fit: cover; display: block; }
.lp-category-label { position: absolute; inset: auto 0 0 0; padding: 1rem; background: linear-gradient(to top, rgba(0,0,0,.55), transparent); color: #fff; font-weight: 700; font-size: 0.95rem; }
.lp-story { display: grid; gap: 2.5rem; grid-template-columns: 1fr 1fr; align-items: center; }
.lp-story-media img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--lp-radius-lg); display: block; }
.lp-story-copy h2 { font-family: var(--lp-heading); font-size: clamp(1.9rem, 4vw, 2.75rem); margin: 0 0 0.9rem; }
.lp-story-copy p { color: color-mix(in srgb, var(--lp-ink) 72%, var(--lp-bg)); line-height: 1.65; margin: 0; }`
}

// Cross-cutting responsive rules that intentionally reference more than one Starter's own
// selectors in a single declaration (e.g. one `grid-template-columns: 1fr` rule spanning Corporate
// Professional/Studio/Store's heroes at once) — owned by no single Starter, so it stays here
// rather than being split apart across starters/*/styles.ts and re-declared per file. See this
// package's own migration notes for why this one block was deliberately left combined.
export const SHARED_RESPONSIVE_CSS = `@media (min-width: 640px) { .lp-gallery-grid { columns: 3; } }
@media (max-width: 900px) {
  .lp-template-store .lp-product-grid, .lp-template-store .lp-category-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-template-store .lp-category-grid > :first-child { grid-column: span 1; grid-row: span 1; }
  .lp-template-store .lp-testimonial-grid { grid-template-columns: 1fr; }
  .lp-template-studio .lp-gallery-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-template-studio .lp-metrics { grid-template-columns: 1fr; }
}
@media (max-width: 800px) {
  .lp-nav-links { display: none; }
  .lp-split, .lp-webinar, .lp-studio-contact, .lp-story, .lp-template-corporate-professional .lp-hero, .lp-template-studio .lp-hero, .lp-template-store .lp-hero, .lp-template-store .lp-studio-contact, .lp-service-tabs, .lp-template-studio .lp-service { grid-template-columns: 1fr; min-height: auto; }
  .lp-template-corporate-professional .lp-service-grid { grid-template-columns: 1fr; }
  .lp-template-studio .lp-hero h1 { font-size: clamp(2.75rem, 16vw, 5rem); line-height: .85; }
  .lp-template-studio .lp-team-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-template-studio .lp-snap, .lp-template-studio .lp-service.lp-snap { min-height: 100svh; }
  .lp-template-portfolio .lp-hero, .lp-template-portfolio .lp-hero-copy { min-height: 62vh; }
  .lp-template-store .lp-hero h1 { font-size: clamp(2.5rem, 12vw, 3.5rem); }
  .lp-template-store .lp-studio-contact { padding-block: 48px; }
}`
