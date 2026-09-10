# Pages: Page Types, Capabilities, Layouts & Style Axes — situation analysis & roadmap

**Status:** Phases 0-4 shipped. Revised a fifth time (§9) after live use surfaced a real gap: same-Page-Type Layout switching could still swap a page's entire renderer (Studio ↔ Portfolio) — fixed by splitting Portfolio into its own Page Type and adding a General Page Type, not by changing the compatibility evaluator, which was already correct. Written 2026-09-10; four earlier same-day revisions — first to promote capabilities to a first-class layer with the compatibility contract as centerpiece, then to lock the contract's exact shape and separate capability/content/visibility state, then to specify Phase 1's output as a full per-page compatibility matrix (not pass/fail counts) and add an explicit, type-enforced invariant barring genre/style/marketing metadata from `isCompatible()`, then to fold in a cross-domain pressure-test against the planned Advertisements catalog — see the companion note below for what changed. Earlier revisions (bundled style axes with no capability layer; boolean compatibility; capability inferred from content; pass/fail-only Phase 1 output; `Capability` as a Page-scoped table; `LayoutCapability`/`LayoutSlotSupport` unprefixed) are superseded.
**Companion docs:** `docs/architecture/landing-page-layouts-and-themes.md` — the accurate developer guide to the _current_ system, to update once implementation starts. `docs/strategy/pages-and-ads-shared-catalog-boundary.md` — the pressure-test review against the planned Advertisements catalog; it's why `Capability`/`Genre` are now shared tables (§2.2/§2.4 below) built in a small Phase 0 ahead of everything else, and why the former `LayoutCapability`/`LayoutSlotSupport` tables are now named `PageLayoutCapability`/`PageLayoutSlotSupport` throughout this doc.

## TL;DR

LOOPIE isn't organizing seven landing-page templates — it's building a catalog system where page purpose, functionality, layout, and style all need to cross-reference cleanly, and where that catalog is going to keep growing. A model that only separates "kind of page" from "how it looks" is missing the layer that says what a page _does_ — has a gallery, takes leads, sells products, shows live event data. That layer, **Capabilities**, is what makes the catalog genuinely mix-and-match instead of a slightly-better flat list.

```
Page Type  →  Capability Contract  →  Compatible Layouts  →  Universal Style Axes
```

A **Page Type** is a starting configuration, not a prison. **Capabilities** are a small, governed catalog of things a page can do, distinct from both content and layout. A **Layout** belongs to a Page Type's compatible set only if it satisfies that type's required capabilities. **Style** (palette, typography, shape) stays universal, independent of all of it. The **compatibility contract** — one evaluator, three small tables — is the actual asset: it's what lets a page switch layout, convert Page Type, or later adopt a new capability or catalog asset without silently losing content or landing on a broken combination.

The seven renderers that already exist (studio, portfolio, store, corporate-professional, webinar-signup, email-outreach, standard) are not legacy debt to route around — they're real, already-good design work, and the plan below treats mapping them into this model as the **initial, premium catalog**, not a migration chore. The underlying primitives that already work — `PageContent`'s canonical slot groups, the flat CSS-token theme system, publish immutability via `PublishedPageVersion` — are preserved untouched.

## 1. Situation analysis

### 1.1 What exists today

```
LandingPageTemplate.schema  →  sections[] + renderer + themePresets
        ↓
LandingPage.content / theme / layoutConfig   (draft, mutable)
        ↓ publish
PublishedPageVersion  (content, theme, layoutConfig, formSnapshot,
                       adSlotSnapshot, schemaSnapshot — immutable)
        ↓
renderLandingPageHtml()  →  self-contained HTML (/p/{slug} + export)
```

Seven system templates ship today (`apps/server/src/lib/ensureSystemTemplates.ts`, `packages/db/src/data/*.ts`), each bundling a `renderer` id (the visual implementation) with an implicit purpose that only exists in its display name:

| Template        | `renderer`               | `category` (internal) | Purpose implied by name |
| --------------- | ------------------------ | --------------------- | ----------------------- |
| Sales page      | `standard`               | `lead-gen`            | Landing page            |
| Email capture   | `standard`               | `lead-gen`            | Email capture           |
| Homepage        | `corporate-professional` | `advanced`            | Home page               |
| Event signup    | `webinar-signup`         | `advanced`            | Event                   |
| Creative studio | `studio`                 | `advanced`            | Studio                  |
| Portfolio       | `portfolio`              | `advanced`            | Studio-adjacent         |
| Store           | `store`                  | `advanced`            | Store                   |
| Outreach page   | `email-outreach`         | `advanced`            | Email capture-adjacent  |

`category` is not a content taxonomy — it only ever takes two values (`lead-gen` / `advanced`) and selects which _editor implementation_ renders the page (`PageCanvas`/`BLOCK_REGISTRY` vs. the rich React `AdvancedTemplateRenderer`, gated by `formatVersion` 1.0 vs 2.0). No field today answers "what kind of page is this," "what can it do," or "who is it good for" for a user.

### 1.2 What's genuinely reusable — preserved, not rebuilt

**Content is already type-agnostic.** `PageContent` (`packages/db/src/content.ts`) is one canonical shape keyed by slot group (`hero`, `features`, `testimonials`, `faq`, `footer`, `gallery`, `team`, `products`, `categories`, `webinar`, …), shared by every renderer. A section's `type` maps to exactly one slot group via `SECTION_TYPE_TO_SLOT_GROUP`, and content in a slot group a template doesn't currently use stays stored, not deleted. Everything below is a layer that _reads_ this model, not a replacement for it.

**Theme is already a clean, orthogonal axis.** `LandingPage.theme` is a flat token map sourced from one shared preset list, applied identically via CSS custom properties regardless of `renderer`. Needs decomposing, not replacing (§2.5).

**Publish immutability is correct and untouched.** `PublishedPageVersion.schemaSnapshot` freezes the renderer/schema at publish time. Nothing here changes the publish/serve path.

**Capability, as a concept, is already partially real.** `Form` attachment (`LandingPage.formId`) and first-party ad slots (`LandingPageAdSlot`) are already modeled as capability-like concerns distinct from `PageContent` — separate relations with their own behavior, not folded into the content slot system. That's the precedent §2.2 generalizes.

### 1.3 Root cause of the current confusion

Not a rendering problem — the renderer/content/theme separation is sound. It's that the system exposes one flat, unstructured choice (`templateId`) that conflates three different questions — _what is this page for_, _what can it do_, _how does it look_ — with no grouping and no compatibility guarantee, and today no real picker UI at all (`LandingPageTemplatesPage.tsx` is still an unbuilt `JSON.stringify` stub). There's no working precedent to preserve here — this is a first build along the right lines, not a migration of something that already works.

## 2. The model

```
Page Type  →  Capability Contract  →  Compatible Layouts  →  Universal Style Axes
```

### 2.1 Page Types — broad starting configurations, not a cage

Start with six, kept **deliberately separate** rather than collapsed by surface-level renderer similarity (Studio and Portfolio share render code today; that's an implementation fact about the current catalog, not evidence they're one product type — collapsing on that basis is circular, and re-splitting a type after real pages exist under it is far more expensive than starting narrow and merging later once usage actually proves redundancy):

- **Home** · **Landing** · **Studio** · **Email Capture** · **Store** · **Event**

A Page Type is an **opinionated starting configuration** — which capabilities it turns on by default and which Layout it suggests — not a permanent classification. A page converts to a different Page Type in place whenever the compatibility contract (§3) says its current state is satisfiable there.

### 2.2 Capabilities — the functional layer, distinct from content and layout

A **Capability** is a functional thing a page can _do_. It may correspond to one content slot group, several, none at all, or a whole separate relation — it is not the same thing as "a slot group has data in it" (see §3.1). Kept deliberately small and governed — an explicit, curated list the product controls:

| Capability               | What backs it                              | Existing precedent                                            |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------- |
| Lead Capture             | `Form` attachment + a form-bearing section | `LandingPage.formId` (already a first-class relation)         |
| Gallery / Media Showcase | `gallery` slot group                       | already exists as a slot group                                |
| Social Proof             | `testimonials` and/or `logos` slot groups  | already exists                                                |
| Product Catalog          | `products`/`categories` slot groups        | already exists                                                |
| Live Event Data          | `webinar` slot group + computed seat count | already exists (webinar-widget's live `FormSubmission` count) |
| Ad Monetization          | `LandingPageAdSlot` rows                   | already exists as a first-class relation                      |

Each **Page Type** declares a requirement level per capability: **required** (every page of this type must have it — Store requires Product Catalog), **recommended** (on by default, user can turn off — Landing recommends Lead Capture), or **allowed** (available, off by default — Home allows Ad Monetization).

### 2.3 Layouts — the existing renderers, now cataloged, not discarded

A **Layout** is what `renderer` already is today (`standard`, `studio`, `store`, …). What's new: a Layout declares, per capability _and_ per content slot group, one of **required / supported / unsupported**, and belongs to a Page Type's compatible set only if it satisfies every capability that type marks required.

The seven layouts that ship today are not being replaced — mapping them into this model **is** the first release of the new catalog, and they're the strongest entries in it by construction (real, deliberately designed work, not placeholders). The milestone in §6 Phase 1 is explicitly framed around bringing this existing work forward, not discarding it as technical debt to be rebuilt later.

Layouts inside one Page Type are required to honor the same capability contract, not to look visually similar — that's a functional guarantee, not a design one, which is exactly why Studio and Portfolio can both belong to Studio-type without implying every Studio-type Layout has to share code.

### 2.4 Genre — catalog metadata, not an architectural layer

A likely near-term need, called out explicitly so it doesn't get built the wrong way by default: business-vertical framing like "Restaurant," "Photographer," "Salon," "Consultant" is useful for _browsing and recommending_ the catalog ("show me layouts that work well for a photographer"), and possibly for seeding starter copy/imagery — but it must never become a rendering or compatibility axis. **Genre is a tag on a catalog entry** (a Layout, a future Pages asset), consulted only by search/filter/recommendation logic and starter-content selection. It has no row in the compatibility contract and no branch in the render engine — there is no `RestaurantRenderer`/`PhotographerRenderer`, and a restaurant and a photographer choosing the same underlying Layout is the expected, desirable outcome, not a gap to fill. If Genre ever needs its own table, it's a simple tag/label table with no relationship to `PageTypeCapability`/`PageLayoutCapability`/`PageLayoutSlotSupport` — keep it that way.

### 2.5 Style Axes — universal, and deliberately only three at launch

**Palette, typography, and shape (radius) are universal style axes** — independent of Page Type, Layout, and Capability, pickable in any combination, generalizing today's already-correct theme token system (radius in particular already proves this is safe today, since it targets buttons/chips present in every layout).

**Motion and density are not universal axes.** Motion in the current code (`lp-parallax-bg`, `lp-fade-in-row`) is embedded in specific renderer DOM structure — some Layouts structurally support it, most don't. Treating it as a free-floating axis would recreate the hidden-incompatibility problem this whole proposal exists to remove, just relocated into the style layer. Instead: **motion and density are optional Layout-declared affordances**, surfaced in the editor only when the active Layout offers one, never presented as an always-available dial. This keeps the universal, always-present style picker to three axes.

### 2.6 Style bundles

Today's 6 presets (Carbon, Shopfront, Workshop, Night desk, Brutalist Studio, Editorial Portfolio) become one-click bundles across the three universal axes — a fast path, not the only way to combine them.

## 3. The compatibility contract — the architectural centerpiece

This is the piece that eventually lets LOOPIE cross-reference and mix Page Types, capabilities, layouts, and future Pages catalog assets safely instead of drifting back into one-off templates every time the catalog grows. Layout switching, Page Type conversion, and the creation flow are all consumers of this one contract, not three separate mechanisms.

### 3.1 Page state is three distinct signals — never infer one from another

This was the sharpest gap in the previous draft, which collapsed "capability enabled," "content populated," and "currently visible" into a single inferred set. They're kept separate:

| Signal                    | What it means                                                                                                   | Example where it diverges from the others                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Enabled capabilities**  | An explicit choice on the page, independent of whether it's been filled in                                      | A user turns on Lead Capture at creation before attaching a `Form`; a user enables Gallery before uploading any photos          |
| **Populated slot groups** | A content slot group (`packages/db/src/content.ts`) currently holds real authored data                          | A page can have `gallery` content sitting in storage from a previous Layout that the _currently selected_ Layout doesn't render |
| **Currently visible**     | `LayoutConfig`'s per-section `hidden`/`order` — whether a supported, populated slot is actually shown right now | A user can hide a populated, enabled section without it ceasing to exist or ceasing to count for compatibility                  |

For capabilities already backed by their own relation (Lead Capture ↔ `Form`, Ad Monetization ↔ `LandingPageAdSlot`), the relation's existence doubles as "enabled" — there's no meaningful "enabled but not attached" state distinct from "not enabled" for those two. For content-only capabilities (Gallery, Social Proof, Product Catalog, Live Event Data) an explicit enabled flag is needed, since "enabled but empty" is a real and useful state per the table above — a lightweight `LandingPage.enabledCapabilities` field (a lightweight page-instance record, not a new piece of the catalog-level compatibility graph — see §4.1 on not growing that graph). Compatibility checks (§3.3) run against **enabled capabilities ∪ populated slot groups**, deliberately ignoring current visibility — hiding something is reversible and shouldn't affect whether a switch is judged safe.

### 3.2 Contract data — three tables, no more added until proven necessary

- `PageTypeCapability(pageType, capability) → REQUIRED | RECOMMENDED | ALLOWED`
- `PageLayoutCapability(layout, capability) → REQUIRED | SUPPORTED | UNSUPPORTED`
- `PageLayoutSlotSupport(layout, slotGroup) → REQUIRED | SUPPORTED | UNSUPPORTED`

These three are sufficient to express the whole graph (Page Type ↔ Capability ↔ Layout ↔ Slot). Resist adding further relationship tables until a real case proves these three insufficient — the risk with a compatibility model is the table count creeping up per new nuance; the discipline is keeping the graph this small on purpose.

### 3.3 `isCompatible()` — one evaluator, one return shape, three callers

Not a boolean. One shared shape reused everywhere it's asked:

```ts
type CompatibilityResult = {
  compatible: boolean
  blockers: Array<{ kind: 'capability' | 'slot'; key: string; reason: string }>
  warnings: Array<{ kind: 'capability' | 'slot'; key: string; reason: string }>
  supportedLayouts: string[] // populated for a Page-Type-level check: which specific Layouts qualify
}
```

- **`blockers`** — something in the page's enabled-capabilities-∪-populated-slots set is `UNSUPPORTED` by the target. Non-empty blockers ⇒ `compatible: false`; each blocker names the specific capability/slot and why, so the UI never has to guess what to say.
- **`warnings`** — something `ALLOWED`/`RECOMMENDED` on the current side won't carry forward (the target doesn't declare it `REQUIRED`/`SUPPORTED`) but nothing is actually lost yet (data stays stored regardless, per §1.2) — surfaced as an explicit "this won't show up here" notice rather than a silent drop.
- **`supportedLayouts`** — for a Page-Type-level call, which Layouts inside that type actually qualify, so a single call answers both "can I convert" and "to which Layouts."

**The three callers, all consuming this one shape:**

1. **Layout switch** (within a Page Type) — call per candidate Layout in the current Page Type; render blockers/warnings inline per option before commit.
2. **Page Type conversion** — call at the Page-Type level; `compatible: true` if `supportedLayouts` is non-empty. Blockers explain exactly why a misclassified page can't convert yet; this is what makes conversion a real, safe feature rather than the earlier draft's "fixed at creation" rule.
3. **Creation flow** — the same call, run against an empty/default page state per Page Type, drives which capabilities are pre-checked vs. optional and which Layouts are offered.

Because the contract is data plus one pure function, adding a Booking capability, a new Page Type, or a future non-landing-page catalog asset later is registering rows, not writing new integration code — creation, switching, and conversion all pick it up through the same call.

### 3.4 Invariant: catalog metadata never enters compatibility

Genre (§2.4), style tags, and any other marketing/browsing metadata must never appear as an input to `isCompatible()`, anywhere in `PageTypeCapability`/`PageLayoutCapability`/`PageLayoutSlotSupport`, or in `blockers`/`warnings` reasoning. This is enforced at the type level, not by convention or review discipline: `isCompatible()`'s input type carries only `enabledCapabilities` and `populatedSlotGroups` (§3.1) plus a target descriptor (a Layout or Page Type id) — there is no field on that type for genre or style tags to occupy, so passing them is a compile error, not a lint warning to be missed later. A catalog entry is free to carry rich genre/marketing metadata for browsing and recommendation; none of it is visible to the function that decides what's safe.

## 4. Concrete changes

### 4.1 Data model

- `Capability` and `Genre` — new small, governed **shared** lookup tables (pure vocabulary: `id`/`key`/`label`/`description`, no Page-specific columns or FKs), built in Phase 0 ahead of the rest of this list so they're available to the Advertisements catalog later with no extraction migration. See `docs/strategy/pages-and-ads-shared-catalog-boundary.md` for why these two specifically are shared while everything else below stays Page-domain. `Capability` seeds with the six in §2.2 to start; growth is a deliberate, reviewed addition.
- `PageType` — new governed enum/table, Page-domain: `HOME`, `LANDING`, `STUDIO`, `EMAIL_CAPTURE`, `STORE`, `EVENT`.
- `PageTypeCapability`, `PageLayoutCapability`, `PageLayoutSlotSupport` — the three contract tables from §3.2, Page-domain, each referencing the shared `Capability` table from the outside rather than owning it. No further catalog-level relationship tables planned.
- `PageLayoutGenre` — join table to the shared `Genre` table, same parallel-FK idiom already used by `RiverPost`/`LandingPageAdSlotAssignment` for Page↔Ad cross-references.
- `LandingPage.enabledCapabilities` — the one page-instance addition from §3.1, for capabilities not already carried by an existing relation. Not part of the compatibility graph itself.
- `LandingPageTemplate` gains `pageType` (replacing `category`'s abandoned use as a semantic field) plus its own rows in the two `PageLayout*` tables.
- `PageThemePreset` decomposes into three independent, always-universal axis tables (palette / typography / shape), still resolving to the same flat CSS-token map `themeFromPreset` already produces. Motion/density are **not** added here — they're per-Layout metadata (§2.5), consulted only when the active Layout declares support.

### 4.2 Frontend / IA (not built in the milestone below — sequenced after it, §6)

- **Creation flow:** pick Page Type → capability checklist pre-filled from required/recommended → Layout choice filtered to `supportedLayouts` → style axes (bundles offered first).
- **In-editor Layout switcher:** every candidate annotated compatible / compatible-with-warnings / incompatible, with blockers/warnings shown inline.
- **Page Type conversion:** a distinct, clearly-labeled action from layout switching; runs the Page-Type-level check and shows the specific blocker when nothing qualifies.
- **`LandingPageTemplatesPage.tsx`** (currently an unbuilt JSON stub) gets built for the first time along this structure.
- **Style controls** split into palette/typography/shape, presets offered as bundles; motion/density appear only when the active Layout declares support.

## 5. Sequencing — the render engine does not move until the model is proven

Regrouping `renderLandingPageSections.ts`'s conditional ladder by Page Type stays deferred, optional, and unscheduled. Restructuring 681 lines of working render code around category boundaries that might still shift is wasted, risky effort until the taxonomy and contract have been run against the real catalog and held up.

## 6. Phased roadmap

**Phase 0 — small, shared, precedes everything below.** Create `Capability` and `Genre` as shared, pure-vocabulary lookup tables (§4.1) — no Page-specific columns or FKs on either. Two lookup tables and their seed rows, not a redesign; see the companion note for why these two specifically are built shared rather than Page-scoped.

**Phase 1 — narrow, backend-only, decision-gated. No UI changes.**

Introduce the six Page Types and six governed Capabilities (the latter seeded into Phase 0's shared table), build the three Page-domain contract tables and the `isCompatible()` evaluator, then map every one of the seven existing templates/Layouts into it — this mapping _is_ bringing the existing, well-liked designs into the new system as its initial catalog, not a migration chore to get past.

Then run the evaluator against **every existing page** in the current catalog (not just the seven templates) and produce a per-page compatibility matrix — the actual proof artifact for this phase, not a summary statistic. One row per existing page:

| Column                       | Source                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Current Page Type            | the page's own (backfilled) `pageType`                                                                                             |
| Enabled capabilities         | `LandingPage.enabledCapabilities` ∪ relation-backed capabilities (§3.1)                                                            |
| Populated slots              | which `PageContent` slot groups currently hold real data                                                                           |
| Current Layout               | `LandingPage.templateId` → `renderer`                                                                                              |
| Compatible Layouts           | every Layout across the **full catalog** (not just the page's current Page Type) where `isCompatible()` returns `compatible: true` |
| Compatible target Page Types | every Page Type with a non-empty `supportedLayouts` for this page's state                                                          |
| Blockers                     | union of `blockers[]` across every Layout/Page Type evaluated for this page                                                        |
| Warnings                     | union of `warnings[]` across the same                                                                                              |

Checking Compatible Layouts/Page Types against the _whole_ catalog, not just the page's own current Page Type, is deliberate — it surfaces both directions of exception at once: a page whose own current Layout doesn't come back compatible with itself (a real modeling bug, not a migration nuisance), and a page that turns out to fit a different Page Type better than the one it happened to be created under (useful signal, not a bug). Email Capture's two current renderers are the likely first source of real disagreement and worth a targeted content audit either way.

This is an explicit decision gate, not a formality: if the matrix shows widespread exceptions — especially pages incompatible with their own current Layout — that's a signal to revise the Page Type/Capability boundaries before anything user-facing is built on top of them. If it maps cleanly, proceed to Phase 2. Either outcome is useful; neither should be skipped.

**Phase 2 — real catalog + creation flow**, built against the contract validated in Phase 1: Page Type → capability checklist → compatible Layout → style bundle/axes. First user-visible change; directly addresses the reported confusion, and is where the seven existing Layouts get presented as the premium starting catalog.

**Phase 3 — in-editor Layout switcher with compatibility annotations, and Page Type conversion** as a distinct, contract-checked action.

**Phase 4 — style axis UI**: palette/typography/shape picker, bundles kept, motion/density surfaced only where a Layout declares support. Independent of Phases 2–3; can run in parallel.

**Phase 5 (deferred, optional) — renderer engine regroup.** Not scheduled until Phases 1–4 have shipped and the taxonomy has held up against real pages.

**Phase 6 — catalog growth.** New Page Types, new capabilities (reviewed and added deliberately), new Layouts, and eventually non-landing-page Pages assets, all registered against the same three contract tables rather than another one-off renderer.

## 7. Non-goals (unchanged from current product scope)

- No drag-and-drop / freeform builder. Page Types, capabilities, and Layouts remain a closed, structured catalog.
- No change to publish immutability, form-snapshot behavior, ad-slot behavior, or the hosted-page render path.
- No change to the "Formerly" external-template-catalog parking-lot item, though this taxonomy is a reasonable prerequisite for it whenever that's picked back up.
- The initial capability catalog is intentionally small (six, §2.2); additions are a deliberate, reviewed product decision, not something end users or templates extend themselves.
- Genre (§2.4) is explicitly out of the compatibility graph — no `RestaurantRenderer`/`PhotographerRenderer`-shaped work is in scope anywhere in this plan.

## 8. Open questions for the user

- Should Phase 1's compatibility report be reviewed before Phase 2 is scoped in detail, or is a "clean enough" heuristic (e.g. fewer than N exceptions) good enough to greenlight moving on without a separate review checkpoint?
- Is Booking worth stubbing into the Capability catalog now (declared, `UNSUPPORTED` everywhere) so the contract shape doesn't need a migration the day it actually ships, or is that premature ahead of six being proven out?
- Should Page Type conversion be fully self-serve from day one, or gated behind a confirmation step surfacing `warnings` before committing — leaning toward the latter, since it's an irreversible-feeling action even though no data is actually destroyed.

## 9. Revision (2026-09-10, after Phase 4 shipped) — Layout stops crossing renderers; the old master renderers move up into Page Type

**The problem this fixes:** Studio and Portfolio shared one Page Type (`STUDIO`), so the in-editor "Layout" switcher's primary, same-Page-Type mode could swap a page's entire renderer (`studio` ↔ `portfolio` — genuinely different CSS/markup systems) while technically staying "the same Page Type." That's exactly the flat-choice confusion this whole roadmap exists to remove, just one layer down. User-reported directly: _"that box should no longer be changing our entire page."_

**The fix — two concepts, cleanly separated, not a mechanical 1:1 renderer migration:**

- **Page Type** = what kind of page this is (unchanged in spirit, grown in membership): `HOME`, `LANDING`, `STUDIO`, `PORTFOLIO` (new — split out of `STUDIO`, see below), `EMAIL_CAPTURE`, `STORE`, `EVENT`, `GENERAL` (new — a genuinely blank/unopinionated starting point, not a variant of any existing purpose).
- **Layout** = how content is arranged _within_ one Page Type. Can reorder sections, show/hide them, and — this is new — swap which section _variant_ fills a slot (e.g. a split hero instead of a centered hero for a Home page), as long as the Page Type's purpose is preserved. The one hard invariant: **a Layout must never change which Page Type a page belongs to, and must never swap the page's underlying renderer identity.** Content that a Layout doesn't use stays dormant, never deleted — same discipline §3.1's active/dormant model already established, just applied at the right scope now.

**Why Portfolio splits from Studio, specifically:** not because "every renderer becomes its own type" — most don't (Email Capture's two renderers, `standard`/split-capture and `email-outreach`, deliberately stay one Page Type; they're both genuinely "collect an email," just different visual weight, which is exactly what Layout-level variance is for). Portfolio splits because it already failed the _new_ invariant under the _old_ grouping: real §6 Phase 1 evidence showed Portfolio has no `gallery` section at all and serves a materially different intent (personal/freelance showcase) than Studio (brand-forward agency site) — the two were only ever "one Page Type" as an artifact of sharing render code, the exact reasoning §2.1 already warned against trusting. Splitting them is the direct fix, not a new judgment call.

**What doesn't need to change:** the compatibility contract's three tables (`PageTypeCapability`/`PageLayoutCapability`/`PageLayoutSlotSupport`) and the `isCompatible()`-shaped evaluator (`PageCompatibilityService.ts`) are reused as-is, re-scoped to a narrower domain — they already return `{compatible, blockers, warnings, supportedLayouts}` and already distinguish active from dormant content, which is precisely the mechanism "existing authored content preserved where possible, anything unused becomes dormant not deleted, warnings explain what stops rendering" calls for. `LayoutSwitcher.tsx`'s primary "Switch layout" mode was _already_ filtered to same-Page-Type candidates only (`sameTypeLayouts = layouts.filter(l => l.pageType === currentPageType)`) — it was correct code operating on a taxonomy that hadn't yet drawn the Portfolio/Studio line in the right place. Fixing the data (Portfolio's own `pageType`) fixes the behavior with no evaluator change.

**What's deliberately NOT being built in this pass:** "Layout can swap which section variant fills a slot" (e.g. hero vs. split-capture as a Layout-level choice, not a fixed property of the renderer) is a real, larger change to the render engine (`packages/page-renderer`) — today a slot's section _type_ is fixed by the Layout row's own schema, not independently selectable per Layout-within-a-Page-Type. Building that properly needs `renderLandingPage.ts`/`renderLandingPageSections.ts` to support declaring more than one section-type option per slot, which is exactly the kind of renderer-engine work §5's deferred regroup was scoped to wait for real evidence before touching. This revision's immediate, shipped scope is: split Portfolio into its own Page Type, add the General Page Type, and fix the creation-flow UI (below) — the deeper per-slot variant system is a named, tracked follow-up, not silently folded in.

**Creation flow, also revised this pass:** the "New page" toggle-reveal button is removed — the Page Type/Layout picker is now always visible inline on the Pages list, not hidden behind a click. Generic icon+label tiles are replaced with real screenshots of each system Layout's own actual starter content, using the already-built (but previously unwired-to-any-URL) `PageThumbnail` `SYSTEM_LAYOUT` capture pipeline (`PageThumbnailService.regenerateAllSystemLayouts()`) — synced onto `LandingPageTemplate.previewImageUrl`, which the API already exposed but nothing had ever populated.
