// Layout (2026-09-11, redesigned 2026-09-11 after a 5-role design-committee review of all 25
// real Starter x Layout combinations) — a structural arrangement of a page's EXISTING content,
// independent of the Starter's own permanent skin. This package exists solely so this one string
// has exactly one home: it's imported by both the server HTML renderer (@project/page-renderer's
// renderLandingPage.ts, scoped via `<body data-lp-layout="...">`) and the editor's live React
// canvases (apps/web's PageCanvas / AdvancedTemplateRenderer's six rich templates, scoped via a
// wrapper `<div data-lp-layout="...">`, marked `.lp-canvas`). Kept as its own zero-dependency
// package (mirrors @project/ad-renderer's shape exactly) rather than folded into
// @project/page-renderer, because that package depends on @project/db/@prisma/client — apps/web
// deliberately never bundles those into the browser (see apps/web's other hand-synced-from-db
// files, e.g. pageThemes.ts/types.ts, for the same reason) — so this had to live somewhere with no
// such dependency for both sides to import the identical source of truth.
//
// Three Layouts survive the committee review, down from five: STACKED (the neutral single-column
// default), SPLIT (an intentional, asymmetric two-column composition wherever a section has real
// paired content/media — never a fake column split on plain text — plus the one real idea kept
// from the old EDITORIAL variant: oversized, confident display type), and CENTERED (a narrow,
// symmetrical, poster-like composition with generous whitespace). ALTERNATING was removed outright
// — its media/copy row-mirror mechanism was applied indiscriminately to plain title+body content
// with no media at all, producing a disconnected, unreadable split with no real design rationale;
// see PageLayoutVariant's doc comment in schema.prisma for the one-time data migration this
// required. EDITORIAL was folded into SPLIT rather than kept as a fifth, mostly-redundant axis —
// see composition/composePage.ts's own doc comment for the hero+adjacent-media grouping fix that
// shipped alongside this (a real correctness bug, not a design change: the editor canvas and the
// published-page renderer used to disagree about whether a hero and its sibling media-image
// section should visually group under Split, producing a duplicated photo on real pages).
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
:where([data-lp-layout="split"]) .lp-hero { display: grid; grid-template-columns: minmax(0,1.15fr) minmax(0,.85fr); align-items: center; gap: 2.5rem; }
:where([data-lp-layout="split"]) .lp-hero h1 { font-size: clamp(2.6rem, 6vw, 4.25rem); }
:where([data-lp-layout="split"]) .lp-hero-media { margin-top: 0; }
:where([data-lp-layout="split"]) .lp-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); }
:where([data-lp-layout="split"]) .lp-feature { border-right: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-bottom: 1px solid color-mix(in srgb, currentColor 18%, transparent); padding: 2rem; }
:where([data-lp-layout="split"]) .lp-testimonial-grid,
:where([data-lp-layout="split"]) .lp-service-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
/* Extends Split beyond hero/feature/service/testimonial into every other multi-item section type
   — closing the gap the committee's review found: a Starter whose page is mostly product/category
   /team/metric/gallery content (Store above all — its 5 Layout screenshots were previously
   byte-identical) had no Layout behavior to select at all. */
:where([data-lp-layout="split"]) .lp-product-grid,
:where([data-lp-layout="split"]) .lp-category-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
:where([data-lp-layout="split"]) .lp-team-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
:where([data-lp-layout="split"]) .lp-metrics { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); text-align: left; }
:where([data-lp-layout="split"]) .lp-gallery-grid { columns: 3; }

:where([data-lp-layout="centered"]) .lp-hero { text-align: center; }
:where([data-lp-layout="centered"]) .lp-hero-copy { margin-inline: auto; max-width: var(--lp-measure-wide); }
:where([data-lp-layout="centered"]) .lp-hero-media { max-width: var(--lp-measure-wide); margin-inline: auto; }
:where([data-lp-layout="centered"]) .lp-section-heading { margin-inline: auto; text-align: center; }
:where([data-lp-layout="centered"]) .lp-feature-grid { max-width: 44rem; margin-inline: auto; justify-content: center; }
:where([data-lp-layout="centered"]) .lp-testimonial-grid { max-width: 44rem; margin-inline: auto; }
:where([data-lp-layout="centered"]) .lp-footer { max-width: var(--lp-measure-wide); margin-inline: auto; }
:where([data-lp-layout="centered"]) .lp-product-grid,
:where([data-lp-layout="centered"]) .lp-category-grid,
:where([data-lp-layout="centered"]) .lp-team-grid,
:where([data-lp-layout="centered"]) .lp-metrics,
:where([data-lp-layout="centered"]) .lp-gallery-grid { max-width: 44rem; margin-inline: auto; }

@media (max-width: 800px) {
  :where([data-lp-layout="split"]) .lp-hero,
  :where([data-lp-layout="split"]) .lp-feature-grid,
  :where([data-lp-layout="split"]) .lp-testimonial-grid,
  :where([data-lp-layout="split"]) .lp-service-grid,
  :where([data-lp-layout="split"]) .lp-team-grid { grid-template-columns: 1fr; }
  :where([data-lp-layout="split"]) .lp-hero h1 { font-size: clamp(2.2rem, 8vw, 2.75rem); }
  :where([data-lp-layout="split"]) .lp-gallery-grid { columns: 2; }
}

/* Studio/Portfolio/Corporate-Professional compose overrides — real specificity (skin class +
   attribute), so these deliberately win over the plain skin rules above, letting these Starters
   visibly change shape per layout while their scroll-snap/parallax/color-wash choreography stays
   fully intact (nothing here touches display, position, or any [data-lp-*]/.lp-snap/.lp-color-wash
   selector). */
.lp-template-studio[data-lp-layout="centered"] .lp-hero-copy { max-width: 32rem; margin-inline: auto; text-align: center; }
/* The base skin's own h1 (starters/studio/styles.ts: clamp(2.75rem,8vw,6.5rem)) sizes off
   viewport width alone, so it never shrinks for this narrower 32rem copy box — a real bug found
   while verifying this pass (a real headline broke mid-word at plain desktop width, confirmed
   with a screenshot, not a style choice). Needs its own smaller, container-aware clamp. */
.lp-template-studio[data-lp-layout="centered"] .lp-hero h1 { font-size: clamp(2rem, 6vw, 3.75rem); max-width: none; }
.lp-template-studio[data-lp-layout="centered"] .lp-section-heading { text-align: center; margin-inline: auto; }
/* Studio always alternates service rows by default — Stacked turns that off for a simpler flow. */
.lp-template-studio[data-lp-layout="stacked"] .lp-service:nth-child(even of .lp-service) { direction: ltr; }
/* Studio's feature rows are normally a single-column list with a left icon gutter — Split gives
   them a real two-column card grid instead. */
.lp-template-studio[data-lp-layout="split"] .lp-feature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
.lp-template-studio[data-lp-layout="split"] .lp-feature { grid-template-columns: 1fr; border-top: 0; padding: 0; }
/* Portfolio's hero copy is normally bottom-left anchored over the full-bleed image — Centered
   centers it both ways instead. Its service rows get no Portfolio-specific override: the generic
   Split .lp-service-grid rule above already gives them a real 2-column card grid. */
.lp-template-portfolio[data-lp-layout="centered"] .lp-hero-copy { justify-content: center; align-items: center; text-align: center; }
/* Store's own skin fixes .lp-product-grid/.lp-category-grid at real specificity
   (starters/store/styles.ts's repeat(4,1fr)), which otherwise permanently wins over the generic
   :where() rules above — this is why Store's 5 old Layout screenshots were byte-identical, the
   single biggest "little distinction" finding in the committee review. Real overrides here give
   it an actual Split/Centered difference; the 900px reset below keeps mobile matching Store's
   existing collapse regardless of which Layout is active. */
.lp-template-store[data-lp-layout="split"] .lp-product-grid,
.lp-template-store[data-lp-layout="split"] .lp-category-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.75rem; }
.lp-template-store[data-lp-layout="centered"] .lp-products { max-width: 860px; }
.lp-template-store[data-lp-layout="centered"] .lp-product-grid,
.lp-template-store[data-lp-layout="centered"] .lp-category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (max-width: 900px) {
  .lp-template-store[data-lp-layout="split"] .lp-product-grid,
  .lp-template-store[data-lp-layout="split"] .lp-category-grid,
  .lp-template-store[data-lp-layout="centered"] .lp-product-grid,
  .lp-template-store[data-lp-layout="centered"] .lp-category-grid { grid-template-columns: repeat(2, 1fr); }
}
/* Corporate Professional's hero is already a 12-col split by default. In the editor canvas
   specifically (.lp-canvas — the published-page renderer's markup has no such nesting and needs
   no fix), its hero's grid lives one div deeper than .lp-hero itself, so the generic
   .lp-hero{display:grid} rule above would double-wrap it under Split (squeezing the whole hero
   into one half-width cell) — neutralized here so the skin's native split stands as-is instead.
   Centered collapses it to one narrow centered column instead. */
.lp-canvas.lp-template-corporate-professional[data-lp-layout="split"] .lp-hero { display: block !important; }
/* Split strengthens the ratio in the media's favor — the reverse of the native copy-forward
   ratio. Two genuinely different mechanisms because the two contexts build this hero differently:
   the published-page renderer puts an explicit 2-column ratio directly on .lp-hero with no
   grid-column on its children, so reversing it there means swapping that ratio; the editor
   canvas's Tailwind markup instead gives each child an explicit 12-column grid-column span, so
   reversing it there means swapping those spans instead (safe regardless of the .lp-canvas-only
   display:block neutralization above, since a non-grid container simply ignores
   grid-template-columns). Deliberately NOT also pairing this with bigger display type the way the
   generic hero rule does: this skin's own native headline (starters/corporate/styles.ts, already
   clamp(3rem,7vw,5rem) uppercase) was sized for its native copy-forward 1.35fr column — a first
   attempt at merging the old Editorial variant's oversized type in here on top of the *narrower*
   Split column overflowed it on real content (confirmed: an 11-letter word ran past the column
   into the media side at plain desktop width, not just on mobile). The ratio reversal alone is
   already the real "give one side weight" story for this Starter. */
.lp-template-corporate-professional[data-lp-layout="split"] .lp-hero { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) !important; }
.lp-canvas.lp-template-corporate-professional[data-lp-layout="split"] .lp-hero-copy { grid-column: span 5 / span 5 !important; }
.lp-canvas.lp-template-corporate-professional[data-lp-layout="split"] .lp-hero-media { grid-column: span 7 / span 7 !important; }
@media (max-width: 800px) {
  /* A real, pre-existing mobile bug found while verifying this pass: the !important + real
     specificity above (needed to beat this skin's own native grid ratio) also beats
     baseStyles.ts's shared 800px collapse (.lp-template-corporate-professional .lp-hero {
     grid-template-columns: 1fr }, no !important, lower specificity) — so the 2-column split
     never actually collapsed on a real phone viewport at all. Needs its own explicit reset. */
  .lp-template-corporate-professional[data-lp-layout="split"] .lp-hero { grid-template-columns: 1fr !important; }
}
.lp-template-corporate-professional[data-lp-layout="centered"] .lp-hero,
.lp-template-corporate-professional[data-lp-layout="centered"] .lp-hero > div { grid-template-columns: 1fr !important; max-width: 42rem; margin-inline: auto; }
.lp-template-corporate-professional[data-lp-layout="centered"] .lp-hero-copy { text-align: center !important; }
`
