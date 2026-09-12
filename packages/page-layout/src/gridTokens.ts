// The one shared grid/container specification for the page-rendering system — consumed by both
// the published-page renderer (`@project/page-renderer`'s `core/document.ts`, which folds this
// into its own `:root {}` block) and the editor's live React canvas (each rich Starter's root
// component injects this via a `<style>` tag, the same distribution mechanism `LAYOUT_VARIANT_CSS`
// already uses — see that file's own doc comment for why a zero-dependency package is the shared
// home). Before this existed, nav (1280px), sections (1040px), and the standalone form section (no
// container at all) were three unrelated numbers that happened to share a page — see this
// package's Layout redesign history for the full story. Every container/gutter/spacing value in
// the system should reference one of these tokens, never a new hand-rolled literal.
export const GRID_TOKENS_CSS = `:root {
  /* Container: the one edge every nav/section/ad/form aligns to. */
  --lp-container-max: 1040px;
  --lp-gutter: 28px;
  --lp-gutter-sm: 16px;

  /* Column-track system: Layout compositions (Split/Centered) span these tracks rather than
     inventing a one-off fr ratio per Starter. */
  --lp-columns: 12;

  /* Spacing scale: a real base unit and multiples, not a flat magic-number constant. */
  --lp-space-unit: 8px;
  --lp-space-1: calc(var(--lp-space-unit) * 1);
  --lp-space-2: calc(var(--lp-space-unit) * 2);
  --lp-space-3: calc(var(--lp-space-unit) * 3);
  --lp-space-4: calc(var(--lp-space-unit) * 5);
  --lp-space-5: calc(var(--lp-space-unit) * 7);
  --lp-space-6: calc(var(--lp-space-unit) * 11);

  /* Measure: a body-copy width ceiling, independent of whatever width a Layout gives a column. */
  --lp-measure: 36rem;
  --lp-measure-wide: 42rem;
}
.lp-grid-12 { display: grid; grid-template-columns: repeat(var(--lp-columns), minmax(0, 1fr)); column-gap: var(--lp-gutter); }
`
