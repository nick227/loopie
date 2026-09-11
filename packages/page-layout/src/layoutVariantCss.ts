// Layout (2026-09-11) — a structural arrangement of a page's EXISTING content, independent of the
// Starter's own permanent skin. This package exists solely so this one string has exactly one
// home: it's imported by both the server HTML renderer (@project/page-renderer's
// renderLandingPage.ts, scoped via `<body data-lp-layout="...">`) and the editor's live React
// canvases (apps/web's PageCanvas / AdvancedTemplateRenderer's six rich templates, scoped via a
// wrapper `<div data-lp-layout="...">`, marked `.lp-canvas`). Kept as its own zero-dependency
// package (mirrors @project/ad-renderer's shape exactly) rather than folded into
// @project/page-renderer, because that package depends on @project/db/@prisma/client — apps/web
// deliberately never bundles those into the browser (see apps/web's other hand-synced-from-db
// files, e.g. pageThemes.ts/types.ts, for the same reason) — so this had to live somewhere with no
// such dependency for both sides to import the identical source of truth.
//
// Selectors deliberately target `[data-lp-layout="..."]` generically (not
// `body[data-lp-layout="..."]`) so the same rules work under either root element.
//
// Generic rules are wrapped in :where() so they carry zero specificity and can never outrank a
// skin selector (e.g. .lp-template-studio .lp-hero, or a rich canvas's own Tailwind classes with
// higher specificity) — on markup with no skin-specific rule for a property, the generic rule is
// all that applies. The Studio/Portfolio/Corporate-Professional compose rules below are
// deliberately written with real specificity so those skins can also visibly change shape per
// layout while keeping their choreography (scroll-snap/parallax/color-wash) fully intact. No rule
// here ever sets display:none/visibility:hidden — a layout variant can rearrange content, never
// hide it.
export const LAYOUT_VARIANT_CSS = `
:where([data-lp-layout="split"]) .lp-hero,
:where([data-lp-layout="alternating"]) .lp-hero { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); align-items: center; gap: 2.5rem; }
:where([data-lp-layout="split"]) .lp-hero-media,
:where([data-lp-layout="alternating"]) .lp-hero-media { margin-top: 0; }
:where([data-lp-layout="split"]) .lp-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); }
:where([data-lp-layout="split"]) .lp-feature { border-right: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-bottom: 1px solid color-mix(in srgb, currentColor 18%, transparent); padding: 2rem; }
:where([data-lp-layout="split"]) .lp-testimonial-grid,
:where([data-lp-layout="split"]) .lp-service-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

:where([data-lp-layout="centered"]) .lp-hero { text-align: center; }
:where([data-lp-layout="centered"]) .lp-hero-copy { margin-inline: auto; max-width: 40rem; }
:where([data-lp-layout="centered"]) .lp-hero-media { max-width: 40rem; margin-inline: auto; }
:where([data-lp-layout="centered"]) .lp-section-heading { margin-inline: auto; text-align: center; }
:where([data-lp-layout="centered"]) .lp-feature-grid { max-width: 44rem; margin-inline: auto; justify-content: center; }
:where([data-lp-layout="centered"]) .lp-testimonial-grid { max-width: 44rem; margin-inline: auto; }
:where([data-lp-layout="centered"]) .lp-footer { text-align: center; }

:where([data-lp-layout="alternating"]) .lp-feature-grid { display: flex; flex-direction: column; gap: 1.5rem; background: transparent; border: 0; }
:where([data-lp-layout="alternating"]) .lp-feature { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); align-items: center; gap: 1.5rem; background: transparent; }
:where([data-lp-layout="alternating"]) .lp-feature:nth-child(even) { direction: rtl; }
:where([data-lp-layout="alternating"]) .lp-feature:nth-child(even) > * { direction: ltr; }
:where([data-lp-layout="alternating"]) .lp-service-grid { display: flex; flex-direction: column; }
:where([data-lp-layout="alternating"]) .lp-service:nth-child(even) { direction: rtl; }
:where([data-lp-layout="alternating"]) .lp-service:nth-child(even) > * { direction: ltr; }

:where([data-lp-layout="editorial"]) .lp-hero { display: grid; grid-template-columns: minmax(0,1.5fr) minmax(0,.5fr); align-items: end; gap: 3rem; }
:where([data-lp-layout="editorial"]) .lp-hero h1 { font-size: clamp(3rem, 7vw, 5.5rem); line-height: 0.95; letter-spacing: -0.04em; }
:where([data-lp-layout="editorial"]) .lp-section-heading h2 { font-size: clamp(2.2rem, 5vw, 3.5rem); letter-spacing: -0.03em; }
:where([data-lp-layout="editorial"]) .lp-testimonial-grid { grid-template-columns: 1fr; }
:where([data-lp-layout="editorial"]) .lp-testimonial { background: transparent; padding: 0; font-family: var(--lp-heading); font-size: 1.4rem; font-style: italic; }

@media (max-width: 800px) {
  :where([data-lp-layout="split"]) .lp-hero,
  :where([data-lp-layout="alternating"]) .lp-hero,
  :where([data-lp-layout="editorial"]) .lp-hero,
  :where([data-lp-layout="split"]) .lp-feature-grid,
  :where([data-lp-layout="split"]) .lp-testimonial-grid,
  :where([data-lp-layout="split"]) .lp-service-grid,
  :where([data-lp-layout="alternating"]) .lp-feature { grid-template-columns: 1fr; }
  :where([data-lp-layout="alternating"]) .lp-feature:nth-child(even),
  :where([data-lp-layout="alternating"]) .lp-service:nth-child(even) { direction: ltr; }
}

/* Studio/Portfolio compose overrides — real specificity (skin class + attribute), so these
   deliberately win over the plain skin rules above, letting Studio/Portfolio pages visibly change
   shape per layout while their scroll-snap/parallax/color-wash choreography stays fully intact
   (nothing here touches display, position, or any [data-lp-*]/.lp-snap/.lp-color-wash selector). */
.lp-template-studio[data-lp-layout="centered"] .lp-hero-copy { max-width: 32rem; margin-inline: auto; text-align: center; }
.lp-template-studio[data-lp-layout="centered"] .lp-section-heading { text-align: center; margin-inline: auto; }
/* Studio always alternates service rows by default — Stacked turns that off for a simpler flow. */
.lp-template-studio[data-lp-layout="stacked"] .lp-service:nth-child(even of .lp-service) { direction: ltr; }
/* Studio's feature rows are normally a single-column list with a left icon gutter — Split gives
   them a real two-column card grid instead. */
.lp-template-studio[data-lp-layout="split"] .lp-feature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
.lp-template-studio[data-lp-layout="split"] .lp-feature { grid-template-columns: 1fr; border-top: 0; padding: 0; }
/* Portfolio's case-study blocks are normally full-width and never alternate — Alternating gives
   them a real image/copy split that mirrors side-to-side per row. */
.lp-template-portfolio[data-lp-layout="alternating"] .lp-service { grid-template-columns: minmax(0,1fr) minmax(0,1fr); align-items: center; gap: 2.5rem; margin-bottom: 64px; }
.lp-template-portfolio[data-lp-layout="alternating"] .lp-service:nth-child(even) { direction: rtl; }
.lp-template-portfolio[data-lp-layout="alternating"] .lp-service:nth-child(even) > * { direction: ltr; }
/* Portfolio's hero copy is normally bottom-left anchored over the full-bleed image — Centered
   centers it both ways instead. */
.lp-template-portfolio[data-lp-layout="centered"] .lp-hero-copy { justify-content: center; align-items: center; text-align: center; }
/* Corporate Professional's hero is already a 12-col split by default. In the editor canvas
   specifically (.lp-canvas — the published-page renderer's markup has no such nesting and needs
   no fix), its hero's grid lives one div deeper than .lp-hero itself, so the generic
   .lp-hero{display:grid} rule above would double-wrap it under Split/Alternating (squeezing the
   whole hero into one half-width cell) — neutralized here so the skin's native split stands as-is
   instead. Centered collapses it to one narrow centered column instead; Editorial pushes the
   split further asymmetric with larger display type. Two selector shapes on purpose: the
   published-page renderer puts the grid directly on .lp-hero; the editor canvas's own markup
   nests it one div deeper. */
.lp-canvas.lp-template-corporate-professional[data-lp-layout="split"] .lp-hero,
.lp-canvas.lp-template-corporate-professional[data-lp-layout="alternating"] .lp-hero { display: block !important; }
/* Split strengthens the ratio in the media's favor — the reverse of the native copy-forward
   ratio — a real, describable "column ratio + media placement" change from Stacked's native
   default. Two genuinely different mechanisms because the two contexts build this hero
   differently: the published-page renderer puts an explicit 2-column ratio directly on .lp-hero
   with no grid-column on its children, so reversing it there means swapping that ratio; the
   editor canvas's Tailwind markup instead gives each child an explicit 12-column grid-column
   span, so reversing it there means swapping those spans instead (safe regardless of the
   .lp-canvas-only display:block neutralization above, since a non-grid container simply ignores
   grid-template-columns). */
.lp-template-corporate-professional[data-lp-layout="split"] .lp-hero { grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr) !important; }
.lp-canvas.lp-template-corporate-professional[data-lp-layout="split"] .lp-hero-copy { grid-column: span 5 / span 5 !important; }
.lp-canvas.lp-template-corporate-professional[data-lp-layout="split"] .lp-hero-media { grid-column: span 7 / span 7 !important; }
.lp-template-corporate-professional[data-lp-layout="centered"] .lp-hero,
.lp-template-corporate-professional[data-lp-layout="centered"] .lp-hero > div { grid-template-columns: 1fr !important; max-width: 42rem; margin-inline: auto; }
.lp-template-corporate-professional[data-lp-layout="centered"] .lp-hero-copy { text-align: center !important; }
.lp-template-corporate-professional[data-lp-layout="editorial"] .lp-hero,
.lp-template-corporate-professional[data-lp-layout="editorial"] .lp-hero > div { grid-template-columns: minmax(0,1.6fr) minmax(0,.4fr) !important; }
.lp-template-corporate-professional[data-lp-layout="editorial"] .lp-hero-copy h1 { font-size: clamp(3.5rem, 8vw, 6rem) !important; }
`
