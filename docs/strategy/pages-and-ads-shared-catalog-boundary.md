# Pages ↔ Advertisements: shared catalog boundary — pressure-test note

**Status:** review complete, no implementation yet. Written 2026-09-10, before opening the Pages Phase 1 migration approved in `pages-page-types-and-style-axes-roadmap.md`.
**Purpose:** confirm the approved Pages architecture won't produce schema names or relationships that get regretted once Advertisements adopts a parallel catalog model, without building that Ads model now.

## Bottom line

The Pages compatibility-contract design (`isCompatible()`, its return shape, the required/recommended/allowed + required/supported/unsupported vocabulary) needs **no change** — nothing in the existing Ads architecture contradicts it, and it's already domain-neutral as an algorithm. What needs a small adjustment before migration is narrower: **two lookup tables should be built shared instead of Page-scoped, and two junction table names should carry an explicit `Page` prefix.** Everything else in the approved Phase 1 plan proceeds as written.

This isn't a hypothetical concern. The existing Ads schema already demonstrates the exact discipline this review is checking for — `AdRunStatus` (LOOPIE's own order lifecycle), `ProviderDeliveryState` (platform-reported truth), and `PublishedAdvertisementVersion` (creative publish/freeze state) are three deliberately unmerged status axes on the same entity, with a schema comment on `ProviderDeliveryState` reading "these must never be collapsed into one status field." Ads has already had, and already resolved, this exact design question once. The task here is to make sure Pages' new layer doesn't quietly violate the same principle from the other side.

## 1. What the current Ads architecture actually looks like

| Concept                 | Model                              | Notes                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creative                | `Advertisement`                    | Name, copy, format (`AdCreativeFormat`: `POSTER`/`STORY`/`FEED_POST` — closed preset vocab, no catalog table), design fields (text placement, overlay, CTA placement — all closed enums), destination (`destinationType`: `LANDING_PAGE` \| `EXTERNAL_URL`, `destinationLandingPageId` when the former) |
| Creative publish/freeze | `PublishedAdvertisementVersion`    | `creativeSnapshot` + `assetIds` frozen at publish, same discipline as `PublishedPageVersion`                                                                                                                                                                                                            |
| Deployment/execution    | `AdRun`                            | Per (Advertisement, platform, placement); `AdRunStatus`: `PENDING/READY/ACTIVE/PAUSED/ENDED/VALIDATION_FAILED/PROVISIONING_FAILED` — this is Ads' real analog to the "draft/ready/scheduled/running/paused/ended" lifecycle named in the brief                                                          |
| Platform truth          | `ProviderDeliveryState` on `AdRun` | Explicitly a separate axis from `AdRunStatus` — a run can be locally `PENDING` while genuinely `LIVE` if a human activated it directly in the platform's own manager                                                                                                                                    |
| Authorization record    | `MediaOrderRevision`               | Immutable, numbered, hashed — the record an `AdRun` was actually sent against                                                                                                                                                                                                                           |
| Media                   | `AdvertisementAsset` → `Asset`     | Same shared `Asset` model Pages already uses — the one primitive that's already genuinely shared today                                                                                                                                                                                                  |
| Legacy                  | `Creative`/`Deployment`/`Campaign` | `@deprecated in favor of Advertisement`/`Advertisement + AdRun` — explicitly superseded, kept only so old FKs compile; not a design input here                                                                                                                                                          |

**What does not exist today:** no `AdvertisementTemplate`/catalog table analogous to `LandingPageTemplate`. `format` is a closed enum with per-format preset defaults applied in `AdvertisementService`, not a catalog row with a schema manifest. No `genre`/`industry`/`vertical` field anywhere on `Advertisement`, `AdRun`, or `LandingPageTemplate` — the only existing freeform industry-ish field in the whole schema is `Business.industry` (the business's own self-described industry, deliberately freeform — "no controlled vocabulary yet" is an explicit, on-record decision, echoed once more on `GoalIdeaTemplate`'s loosely-matched `industryKeywords`). Nothing here is a taxonomy of catalog entries; both existing instances are freeform business-description fields, not governed vocabulary — worth naming because the Pages/Ads Capability and Genre concepts below are the first place this codebase would introduce a genuinely _governed_ vocabulary, not an extension of the existing freeform pattern.

**Cross-referencing between Pages and Ads already exists, and the pattern is exactly right — extend it, don't replace it:**

- `Advertisement.destinationLandingPageId` / `destinationType` — an Ad points at a Page as a destination without being a Page. This is the answer to the brief's "must not simply become a boolean/meta flag on a Page" requirement — it's already satisfied today, by a typed nullable FK plus a discriminant enum, not a flag.
- `RiverPost.advertisementId`/`publishedAdvertisementVersionId` alongside `RiverPost.landingPageId`/`publishedPageVersionId` — parallel, independently-nullable typed FKs to both domains on one shared surface, each frozen against its own domain's own immutable snapshot. The schema comment is explicit: "mirrors the AD fields above exactly." This is the reusable pattern, not a one-off.
- `LandingPageAdSlotAssignment.adRunId`/`advertisementId` — same parallel-nullable-FK shape again, this time the other direction (a Page slot referencing an Ad).

Three independent places in the existing schema already chose "parallel typed FKs on the shared surface, each domain's row frozen at its own immutable snapshot" over "one polymorphic pointer" or "merge the two entities." That's not incidental — it's the schema's own established idiom for exactly this problem, and the recommendation below (§4) is to keep using it, not invent something new.

## 2. Answering the six questions

### Q1 — Do `PageType`, `Capability`, `PageTypeCapability`, `LayoutCapability`, `LayoutSlotSupport` stay Page-domain, or generalize?

Split answer, concept by concept:

- **`PageType` stays Page-domain, unchanged.** It encodes _page purpose_ (Home/Landing/Studio/Email Capture/Store/Event). Ads' closest analog — creative format/channel shape (`AdCreativeFormat`, or a future channel/placement axis) — is a different dimension entirely, not a renamed copy of the same one. Forcing these into one shared "PropertyType" would be the premature abstraction the brief warns against: Page Type governs _content requirements_ (slot groups); an Ad's format governs _creative constraints_ (dimensions, platform specs), a genuinely different kind of thing.
- **`PageTypeCapability` stays Page-domain, unchanged** (already correctly named — no ambiguity risk).
- **`LayoutCapability` and `LayoutSlotSupport` should be renamed to `PageLayoutCapability` and `PageLayoutSlotSupport` before migration.** Not a redesign — a two-table rename. "Layout" alone is exactly the word Ads will also want for its own creative-format-support concept once it builds its own contract graph; leaving the Page version unprefixed now means either a collision later or an inconsistent retrofit. Cheap to fix before any code references these names; expensive to fix after.
- **`Capability` should be built as a shared, pure-vocabulary table from the start** — see Q2. This is the one real generalization the review surfaces: not because Pages needs it to be shared to function, but because building it Page-scoped now and extracting it later is exactly the kind of rework this review exists to prevent, and building it shared costs nothing extra today.

### Q2 — Smallest shared catalog foundation, without premature abstraction

Two small, pure-vocabulary lookup tables, built now, with **zero domain-specific columns or logic on either one**:

- **`Capability`** — `id`, `key`, `label`, `description`. Nothing else. The six Page capabilities already approved (Lead Capture, Gallery/Media Showcase, Social Proof, Product Catalog, Live Event Data, Ad Monetization) populate it as rows exactly as planned — this changes where the table lives, not what it contains or how Pages uses it. Several of these are plausibly real Ad capabilities too later (Lead Capture via a Meta lead-form ad; Product Catalog via dynamic product ads; Social Proof via a testimonial creative) — sharing the vocabulary means "Lead Capture" is one concept product-wide, not reinvented with a drifting name the day Ads needs it. Ad Monetization plausibly never applies _to_ an Ad itself (an Ad is the monetization instrument, not a thing that "has" the capability) — that's fine; an unused row in a shared vocabulary costs nothing, whereas a duplicated near-identical concept in two separate tables is the actual cost this avoids.
- **`Genre`** — `id`, `key`, `label`, `description`. Already scoped as metadata-only, outside the compatibility graph, in the approved Pages roadmap (§2.4 there) — it was always going to be a pure tag table. Building it shared from day one, rather than as a column on `LandingPageTemplate`, is free right now and saves an extraction later, since a "Restaurant" or "Photographer" tag is exactly as meaningful on a future Ad creative template as it is on a Page layout.

Both tables carry **no FK back to `PageType`/Layout/Advertisement** — they are referenced _from_ domain-specific join tables (§4), never the reverse. That asymmetry is what keeps them safely shared: a pure vocabulary table can't accidentally couple the two domains' compatibility logic together, because it doesn't participate in either domain's compatibility graph at all — only the domain-specific junction tables do, and those stay separate (Q3).

Everything else — `Asset` (already shared today) plus these two new tables — is the complete shared foundation. No shared "CatalogEntry" supertype, no shared compatibility evaluator instance, no shared status/lifecycle model. That's deliberately the whole list.

### Q3 — What must stay separate even if the UI later merges

- **Compatibility contract graphs.** `PageTypeCapability`/`PageLayoutCapability`/`PageLayoutSlotSupport` (Pages) vs. whatever Ads' own future junction tables are named (not designed here) — both may reference the shared `Capability` table, but the graphs themselves, and the `isCompatible()` call sites that walk them, stay per-domain. A Page being "compatible" with a capability and an Ad creative being "compatible" with the same capability are evaluated by two separate calls against two separate tables; nothing forces them to agree, because there's no reason they should.
- **Status/lifecycle models.** `PageStatus` (`DRAFT/PUBLISHED/ARCHIVED`) + `PublishedPageVersion` for Pages; `AdRunStatus` + `ProviderDeliveryState` + `PublishedAdvertisementVersion` for Ads (already three axes, already correctly unmerged, per §1). Nothing in this review touches either.
- **Content/creative shape.** `PageContent`'s canonical slot-group model (Page-specific) vs. `Advertisement`'s closed design-field vocabulary (`AdCreativeFormat` + text/overlay/CTA placement enums, Ad-specific). These aren't the same kind of "content" — one is a structured document, the other is a bounded creative-composition space — and shouldn't be forced through one shape.
- **Render/serve paths.** `packages/page-renderer` vs. `@project/ad-renderer` — already separate packages today; no change implied.
- **Entity identity.** `LandingPage`/`PublishedPageVersion` vs. `Advertisement`/`AdRun`/`PublishedAdvertisementVersion` remain distinct tables, cross-referenced per §4, never merged into one polymorphic "DigitalProperty" row — a unified _management surface_ (the brief's stated eventual goal) reads across both via query, it doesn't require one underlying table.

### Q4 — Cross-referencing without coupling lifecycles

Already answered by what's shipped (§1) — the recommendation is to keep using the established idiom, not invent a new one:

- **Ad → Page targeting**: already correct (`Advertisement.destinationType`/`destinationLandingPageId`). No change.
- **Shared media**: already correct (`Asset`, referenced by both `AdvertisementAsset` and Page content/asset references). No change.
- **Genre/style classification**: new, built per §2 as parallel typed join tables — `PageLayoutGenre(layoutId, genreId)` now; an equivalent `AdTemplateGenre`-shaped table whenever Ads builds its own catalog layer — both pointing at the one shared `Genre` table. Same shape `RiverPost`/`LandingPageAdSlotAssignment` already use for Page↔Ad references, just applied to catalog metadata instead of runtime entities.
- **Capability vocabulary**: shared table (§2), domain-specific junction tables (§3) — same pattern again.
- **Campaign/starter sets** (a Page layout + an Ad template bundled as a matched starting point — not in the brief's must-have list, but a natural next question given "campaign starter sets" was named): explicitly **not built now**. If and when it's wanted, it's one more small join table (`StarterBundle` or similar, referencing a Page Layout id and an Ad template id, both nullable/optional) — the same parallel-FK idiom again, not a reason to couple the two domains' core models today.

### Q5 — Would starting the Page Phase 1 migration now create regrettable names/relationships?

Mostly no — the approved design already scopes things appropriately. Two concrete, cheap adjustments, both naming/placement rather than redesign:

1. Build `Capability` (and the new `Genre` table) with no FK to anything Page-specific, in a schema location/section that reads as shared infrastructure, not under the Pages models — so it's visibly available to Ads later without an extraction migration.
2. Rename `LayoutCapability` → `PageLayoutCapability` and `LayoutSlotSupport` → `PageLayoutSlotSupport` before any code references them.

Nothing else in the approved plan needs to change. `PageType`, `PageTypeCapability`, `LandingPageTemplate.pageType`, `LandingPage.enabledCapabilities`, and the `isCompatible()` evaluator's shape (`{ compatible, blockers[], warnings[], supportedLayouts[] }`) are all already correctly scoped to Pages and require no adjustment for this review.

### Q6 — Revised implementation sequence

Smallest safe adjustment: one tiny phase inserted before the already-approved Phase 1, not a new framework.

**Phase 0 (new, small — precedes everything below):** create `Capability` and `Genre` as shared, pure-vocabulary tables (no domain FKs on either). This is two lookup tables and their seed rows — not a redesign of anything already approved.

**Phase 1 (Pages — as approved, two renames applied):** `PageType`, `PageTypeCapability`, `PageLayoutCapability` (renamed), `PageLayoutSlotSupport` (renamed), `LandingPageTemplate.pageType`, `LandingPage.enabledCapabilities`, `PageLayoutGenre` join — all exactly as scoped in `pages-page-types-and-style-axes-roadmap.md`, now referencing the shared Phase 0 tables instead of Page-local ones. The Phase 1 compatibility matrix (per-page: current Page Type, enabled capabilities, populated slots, current Layout, compatible Layouts, compatible target Page Types, blockers, warnings) proceeds exactly as already specified — this review changes nothing about what that matrix measures or why it's a decision gate.

**Phases 2–6 (Pages UI, editor, style axes, deferred engine regroup, catalog growth):** unchanged from the approved roadmap.

**Ads' own catalog work (creative-format taxonomy, its own capability-support junction tables, its own evaluator call sites) is explicitly out of scope here** — not designed, not scheduled, not blocking Pages Phase 1. It's future work that Phase 0's two shared tables exist to make cheap when it comes, not something to build speculatively now.

## 3. On the compatibility evaluator specifically

No change. `isCompatible()`'s signature, its `{ compatible, blockers, warnings, supportedLayouts }` return shape, and the required/recommended/allowed + required/supported/unsupported vocabulary are all domain-neutral as designed — nothing about them assumes Pages, and nothing in the Ads architecture contradicts the pattern. The only thing this review changes is _what table `Capability` rows live in_ and _what two junction tables are named_ — both invisible to the evaluator's own logic.

## 4. Non-goals of this review

- No Ads catalog/taxonomy design (Ad Type, Ad capability-support tables, Ad-side compatibility evaluator) — flagged as future work only.
- No unified "digital properties" table or polymorphic catalog-entry model — the brief explicitly rejects this, and nothing found in either domain's architecture argues for it.
- No change to `AdRunStatus`, `ProviderDeliveryState`, `PublishedAdvertisementVersion`, or any other Ads runtime/lifecycle model — all already correctly separated from each other and from Pages' own `PageStatus`/`PublishedPageVersion`.
- No `StarterBundle`/campaign-starter-set implementation — named as a plausible future use of the same cross-reference idiom, not built here.
