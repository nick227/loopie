# Ads: catalog and rendition model — situation analysis & proposal

**Status:** proposal, not started. Written 2026-09-10, immediately after the approved Pages taxonomy work; revised same day to confirm no compatibility evaluator is needed for Ads (§7) and to stop assuming Genre's classification values, not just `Capability`'s, should default to Pages' own (§4). See the two companion docs below, which this one deliberately does not resemble in shape.
**Companion docs:** `docs/strategy/pages-page-types-and-style-axes-roadmap.md` (the Pages model — read for what NOT to replicate here), `docs/strategy/pages-and-ads-shared-catalog-boundary.md` (the shared `Capability`/`Genre` vocabulary seam already shipped in Phase 0 — this doc revisits and narrows what Ads actually needs from it).

## TL;DR

Pages needed a compatibility graph because a Page is a multi-section document that accumulates content over many edits, and switching its Layout can silently strand content with nowhere to render. **An ad creative is not that.** Today's `Advertisement` model is already one small, self-contained composition — image, a few lines of copy, a CTA — rendered through exactly one shared template (`renderAdCreativeFragment`) parameterized by a closed design vocabulary (format, text placement, font scale, overlay, CTA placement, media focal point). There is no orphaned-content problem to solve because there is nowhere for content to get orphaned: one Advertisement, one shape, always fully populated or not created. Mirroring Pages' `PageType → Capability Contract → Compatible Layouts` architecture onto Ads would be solving a problem Ads doesn't have.

What Ads actually lacks is **variety of fixed composition**, not compatibility bookkeeping. Today there is exactly one visual shape (headline/body/media/CTA, three aspect-ratio presets) wearing six style knobs. A testimonial ad wants a quote+author+role shape; a product spotlight wants name+price+image; an event promo wants a date/time. That's a content-shape problem, and the right fix is a small library of distinct fixed compositions — **Ad Types** — not a bigger version of the Pages contract graph.

The other real finding: **LOOPIE already has a working, generic HTML-to-image pipeline** (`PageThumbnailService` + `pageThumbnailCapture.ts`, Playwright-based, checksum-driven, async-queued) and it is completely unused by Ads today — no `AdThumbnail`-equivalent table exists anywhere in the schema. That pipeline's actual screenshot primitive (`capture(html): Promise<{buffer, widthPx, heightPx}>`) is already HTML-agnostic; the only Page-specific part is _which function builds the HTML string_ (`renderLandingPageHtml` vs. the already-existing `renderAdCreativeFragment`/`renderAdCreativeDocument`). This is the concrete foundation for "LOOPIE renders its own finished ad images" — not a new subsystem, an extension of one that already works.

Proposed model:

```
Ad Type  →  Creative Layout  →  Style  →  Output Rendition
                                              ↓
                                  deployment/channel metadata (unchanged)
```

## 1. Situation analysis

### 1.1 The creative entity — `Advertisement` (`packages/db/prisma/schema.prisma:827`)

Already a clean, small model: `name`/`primaryText`/`ctaLabel`/`destinationUrl` (the original Feed Ad POC fields) plus, from the 2026-09-03 "Ad Designer" pass, a fully closed design vocabulary — `format: AdCreativeFormat` (`POSTER | STORY | FEED_POST`), `headline`, `textPlacement`, `fontScale`, `textAlign`, `overlay`, `ctaPlacement`, `mediaFocal`, and `destinationType: LANDING_PAGE | EXTERNAL_URL` with `destinationLandingPageId`. Every design field is nullable, with per-format preset defaults applied by `AdvertisementService` — the schema comment is explicit: "there is deliberately no 'arbitrary' positioning value, only these closed vocabularies." **This is already the right discipline for what the user is now asking for** — no freeform x/y, no drag-and-drop canvas. The gap isn't rigor, it's variety: three formats (really just aspect ratios) and one shared layout, not a library of distinct compositions.

`Advertisement.destinationLandingPageId` already lets an Ad target a Page as a destination without being a Page — the exact cross-reference shape the Pages/Ads boundary doc recommended generalizing; nothing to add here.

### 1.2 The creative renderer — `packages/ad-renderer`

Four files, 388 lines total. `renderAdCreativeFragment()` (`renderAdCreative.ts:46`) is, per its own comment, "the one renderer every surface calls... no surface may hand-roll its own layout for a creative." Confirmed real call sites: `apps/ad-server/src/services/EmbedServingService.ts` (the live embed iframe) and `apps/server/src/services/RiverPostService.ts` (a River `AD`-type post). **Ads are delivered live as server-rendered HTML today, not as pre-rendered static images** — there is no existing "export this ad as a PNG" path anywhere.

`resolveAdCreativeDesign()` + `presets.ts` (132 lines) supply per-format defaults for the six design axes. This is genuinely one generic template (headline/text/media/CTA in a single `<a>` element) with parametric styling — not multiple distinct compositions. `AdCreativeInput`'s content shape (`headline`, `primaryText`, `ctaLabel`, `mediaUrl`, `mediaAlt`, `clickUrl`) has no room for a testimonial's `quote`/`author`/`role`, a product spotlight's `price`, or an event promo's `date` — confirming the content-shape gap is real, not assumed.

### 1.3 The deployment/execution entity — `AdRun` (`schema.prisma:1117`)

Already correctly separated from creative and from itself, on three independent axes — this is the part of the existing Ads architecture that's already doing what Pages had to learn to do:

- `AdRunStatus` (`PENDING/READY/ACTIVE/PAUSED/ENDED/VALIDATION_FAILED/PROVISIONING_FAILED`) — LOOPIE's own order lifecycle.
- `ProviderDeliveryState` — the platform's own reported truth, explicitly never collapsed into the above (see the enum's own doc comment, `schema.prisma:806`).
- `PublishedAdvertisementVersion` (`schema.prisma:3055`) — a third axis again: the creative's own draft→immutable-snapshot discipline, structurally identical to `PublishedPageVersion` (`creativeSnapshot`, `checksum`, `archivedAt`).

**None of this needs to change.** Whatever Ad Type/Creative Layout model gets built, it plugs in underneath `Advertisement`/`PublishedAdvertisementVersion` exactly where the design fields already sit — `AdRun` and its budget/schedule/targeting/sync machinery are untouched by this proposal entirely.

### 1.4 The reusable asset — thumbnailing (`apps/server/src/services/PageThumbnailService.ts`, `apps/server/src/lib/pageThumbnailCapture.ts`)

Real, working, and Page-only today (confirmed — no `AdThumbnail`/`adThumbnail` reference exists anywhere in `apps`/`packages`). What it actually does:

- `PageThumbnail` (`schema.prisma:2025`) — an async job queue row: `kind` (`PUBLISHED_VERSION | SYSTEM_LAYOUT | COMMUNITY_TEMPLATE`), `sourceChecksum` (drives staleness — a thumbnail only regenerates when its source content actually changed), `status` (`PENDING/READY/FAILED`), `url`, `widthPx`/`heightPx`.
- `PageThumbnailService.processPending()` pulls PENDING rows, opens one Playwright session, and for each row builds real HTML (`htmlForPublishedVersion` calls the _exact same_ `renderLandingPageHtml()` the live `/p/{slug}` route uses; `htmlForSystemLayout` builds a template+theme preview with no real page behind it at all — i.e. **a catalog-preview rendition with no live entity**, which is precisely the shape an Ad Type × Style catalog preview would need) then calls `capture(html)`.
- `capture()` (`pageThumbnailCapture.ts`) is a generic `(html: string) => Promise<{buffer, mimeType: 'image/jpeg', widthPx, heightPx}>` — fixed viewport (1280×800 at 0.5 scale → 640×400 output), JPEG quality 72, an animation-freezing "capture mode" head injection, and an allowlisted-host guard against untrusted network requests during capture. Nothing about the capture step itself is Page-specific.
- Output is persisted via `saveThumbnailFile` (`apps/server/src/lib/mediaStorage.ts`) to a URL, same storage path presumably usable for any generated image.

**The only genuinely Page-specific code in this whole pipeline is `htmlForRow()`'s two branches** — which HTML-building function to call. Everything else (the job queue shape, the checksum-staleness logic, the Playwright capture primitive, the storage write) is already domain-agnostic in practice, just domain-owned by Pages in naming and schema placement today.

### 1.5 Explicitly out of scope: `HouseAd`/`HouseAdPlacement` (`schema.prisma:3988`)

A distinct feature — internal house-ad inventory served into fixed placement zones, its own `AdStatus` enum (`ACTIVE/PAUSED`), `weight`-based rotation. Not a creative-composition concern and not touched by anything below.

## 2. The proposed model

```
Ad Type  →  Creative Layout  →  Style  →  Output Rendition
```

### 2.1 Ad Type — the fixed composition, and the layer that's actually missing

An Ad Type is a purpose-built content shape and visual arrangement, analogous in spirit to a Page's slot groups but scoped to one small composition instead of a multi-section document: **Testimonial Ad**, **Product Spotlight**, **Event Promo**, **Quote Card**, **Offer Banner**, **Cinematic Poster**, **Real-Estate Listing**, **Restaurant Special**, plus a **Generic** type that _is_ today's existing headline/body/media/CTA shape (so nothing currently working needs to be retired — Generic becomes Ad Type #1, not a special case).

Each Ad Type declares its own content fields (a real, small, typed shape per type — `TestimonialAdContent = { quote, author, role?, avatarUrl? }`, `ProductSpotlightContent = { productName, price, badge?, mediaUrl }`, etc.) the same way `packages/db/src/content.ts` declares Page slot-group shapes — but there is no shared canonical "slot group" vocabulary across Ad Types the way there is across Page Layouts, because there's no cross-Ad-Type content reuse to protect (a Page's `hero` slot is deliberately shared across seven Layouts; a Testimonial Ad's `quote` field has no equivalent need to be readable by a Product Spotlight).

### 2.2 Creative Layout — the rendering implementation of one Ad Type

What `renderAdCreativeFragment()` already is for the one Ad Type that exists today (Generic). Each new Ad Type gets its own Creative Layout — a new render function alongside the existing one, following the exact pattern `renderAdCreative.ts` already establishes (one function per composition, called from every surface, never hand-rolled per caller).

**Confirmed: one Creative Layout per Ad Type, picked at creation time, not swappable afterward.** Unlike Pages, where "the same purpose, several looks" (Studio vs. Portfolio) was a real, common case with a real need to switch Layout on an existing page, an ad's whole point is one specific, proven composition — a Testimonial Ad doesn't later become a Product Spotlight the way a Page's purpose can drift. There is no in-place Creative Layout switch to support, and therefore nothing to evaluate compatibility for (see §7). If a second Creative Layout for one Ad Type is ever wanted (e.g. two Quote Card treatments), it's a second, independent Ad Type-shaped entry a business picks between at creation, not a switch on an existing Advertisement.

### 2.3 Style — thin, and reused from Pages, not reinvented

Palette and typography should be the _same_ tokens a business already picked for Pages (`PAGE_THEME_PRESETS`-shaped), not a parallel Ad-specific preset list — a business's brand colors are one concept, not two. Shape (radius) likely reuses too. This is explicitly **not** a place for Ads to grow its own taxonomy: if a business's brand palette changes, it should change once, for both Pages and Ads.

This is a different question from _style classification_ (a tag like "Bold" or "Minimal" used to browse/organize the catalog) — see §4's Genre bullet. Style tokens are one business's own real design choice, reused as-is across surfaces like their logo would be; a classification tag is a judgment call about _which values are meaningful groupings_, and Ads may reasonably want its own vocabulary there even while sharing the underlying color/font values.

### 2.4 Output Rendition — new, and where the thumbnail pipeline plugs in

A specific rendered output of one (Advertisement, Style) pair: an aspect ratio/dimension/file-format combination (square social, portrait story, landscape banner — the user's own examples), generated by extending the thumbnail capture pipeline to call `renderAdCreativeDocument()` instead of `renderLandingPageHtml()`. **Deliberately separated from Ad Type**, per the explicit instruction: one Testimonial Ad creative concept can produce several Output Renditions without being several Ad Types. This is also where "publish/export/deploy" lands — an Output Rendition is a static image asset (PNG/JPG/WebP) that can be downloaded, attached to an `AdRun`'s creative payload for a platform send, or embedded directly.

### 2.5 Deployment/channel metadata — unchanged

`AdRun`, `MediaOrderRevision`, `Platform`/`placement` attach to an `Advertisement` (or, once Output Renditions exist, to a specific rendition) exactly as they do today. Nothing in this proposal touches that layer.

## 3. Concretely reusing the thumbnail pipeline

1. Extract the genuinely generic piece — `capture(html)` plus the capture-mode head injection and host-allowlist guard from `pageThumbnailCapture.ts` — into a domain-neutral location (e.g. `apps/server/src/lib/htmlCapture.ts`), leaving `PageThumbnailService` as its first, unchanged caller.
2. Add a parallel `AdRendition` table (own name, own ownership — **not** a shared `PageThumbnail` row reused across domains, matching the Pages/Ads boundary doc's own "parallel typed tables, never one polymorphic supertype" precedent), structurally copying `PageThumbnail`'s shape: `kind` (`PUBLISHED_CREATIVE | CATALOG_PREVIEW`), `sourceChecksum`, `status`, `url`, `widthPx`/`heightPx`, plus an output-format field (aspect ratio / file type) that `PageThumbnail` doesn't need.
3. A new `htmlForAdRendition()` (mirroring `htmlForPublishedVersion`/`htmlForSystemLayout`) calls `renderAdCreativeDocument()` with the Advertisement's real content/design, at whatever viewport the target rendition's aspect ratio calls for — `capture()` already accepts arbitrary HTML, so this is additive, not a rewrite. `THUMB_VIEWPORT`/`THUMB_DEVICE_SCALE`/`THUMB_JPEG_QUALITY` (`pageThumbnailCapture.ts`) are fixed constants tuned for list-card previews specifically; an ad rendition needs its own per-format viewport/quality (a 1080×1080 social square is not a 640×400 preview card), so these become parameters, not shared constants.
4. A second poller (matching this codebase's existing precedent — Automation, Calendar reminders, Affiliate payouts, and Page thumbnails already each run their own dedicated `worker.ts` poller) processes `AdRendition` the same way `processPendingPageThumbnails` does today.

This is a small, real, checkable first slice: one new Ad Type (say, Quote Card), one new Creative Layout, rendered through the extracted capture primitive to a real stored image — proof before catalog breadth, the same discipline the Pages Phase 1 gate used.

## 4. Shared vs. Ad-specific — revised from the earlier boundary review

The Pages/Ads boundary doc (written before this simplification) guessed `Capability` would likely be reused by Ads, and leaned toward assuming Genre would be too. Having now looked at what Ads actually needs, neither guess should stand as a default — both get the same honest treatment below rather than one being nodded through while the other gets scrutinized:

- **Genre — share the _mechanism_, not necessarily the _values_, by default.** A governed lookup table for genre-like classification (the shape `Genre` already is) is worth reusing as a pattern — Ads shouldn't invent its own parallel mechanism for "a tag that classifies a catalog entry." But Pages and Ads don't automatically need the _same_ classification values: a Page Layout's "Restaurant" framing (business-vertical, drives which starter content/copy fits) and an Ad Type's own useful groupings (which could as easily be composition-shaped — "testimonial-style," "urgency-driven" — as vertical-shaped) aren't guaranteed to be the same axis just because both are called "genre." Recommend starting with Ads free to define its own classification values (own rows, whether in the same `Genre` table or a parallel Ad-scoped one is a small implementation choice, not a taxonomy commitment), and only merging vocabularies with Pages if real usage shows the same values genuinely apply to both — proven by overlap, not assumed by symmetry. This is the same discipline §4's `Capability` finding already applied; Genre shouldn't get a pass just because it's the vocabulary Phase 0 happened to build first.
- **`Asset` (media library)** — already shared today (`AdvertisementAsset`/`CreativeAsset` both reference the one `Asset` model). Nothing to add.
- **Style tokens (palette/typography/shape)** — should become genuinely shared, reusing the Pages token shape directly rather than a parallel system (§2.3). This is new shared surface, not something already built.
- **`Capability` — likely _not_ needed by Ads at all under this model.** The six rows that exist (`LEAD_CAPTURE`, `GALLERY`, `SOCIAL_PROOF`, `PRODUCT_CATALOG`, `LIVE_EVENT_DATA`, `AD_MONETIZATION`) describe _what a Page can do_; an Ad Type's content shape is a much smaller, self-contained thing with no compatibility-contract problem to solve (§0/TL;DR). `AD_MONETIZATION` in particular describes a Page hosting ad slots, not a property of the Ad itself. Recommend: don't force Ads onto the `Capability` table; if a genuine cross-domain "what can this do" concept emerges later (e.g. "this Ad Type/Page Layout both support a countdown timer"), that's a new, deliberate decision, not a default inherited from Phase 0's guess.
- **Starter creative/content** — Ad-domain-owned data, following the same _pattern_ Pages already uses (`SYSTEM_TEMPLATE_STARTER_CONTENT`-shaped), not shared rows.
- **Page-specific, confirmed untouched:** `PageType`, the full `PageTypeCapability`/`PageLayoutCapability`/`PageLayoutSlotSupport` contract graph, `PageCompatibilityService`.
- **Ad-specific, to design:** `AdType`, `CreativeLayout`, `AdRendition`/output-format metadata — the Ad Type↔Creative Layout registry is a plain one-to-one mapping, no evaluator, confirmed (§7).

## 5. Recommended first milestone

Mirroring how Pages Phase 1 was scoped — prove the smallest real slice before committing schema — but the shape of "prove it" differs, because there's no existing multi-Ad-Type inventory to audit (today there is exactly one universal shape, not seven layouts already carrying real content):

1. **Name the initial Ad Type catalog as content, no schema yet** — a short, real list (the user's own examples are already a strong starting eight) with each type's content-field shape sketched the way `content.ts` sketches Page slot shapes. This is a design/audit step, not a build step.
2. **Extract the generic capture primitive** (§3 step 1) and prove it against exactly one new Ad Type end-to-end — real HTML composition → real screenshot → real stored image — before building anything else. This is the smallest possible proof that "LOOPIE renders its own ad images" actually works, and it's genuinely cheap given how much of the pipeline already exists.
3. **Only then** add `AdType`/`CreativeLayout`/`AdRendition` schema for real, seeded from step 1's catalog, and wire the extracted capture primitive into a proper `AdRendition` poller (§3 steps 2–4).
4. **Confirmed: no Pages-style compatibility evaluator for Ads, not even a lightweight one — this is not deferred, it's decided.** One Creative Layout per Ad Type, picked at creation, not swapped afterward (§2.2) means there is no layout-switching requirement and nothing for an evaluator to protect. Nothing in `AdType`/`CreativeLayout`/`AdRendition` should carry a `PageTypeCapability`-shaped contract table, a required/supported/unsupported vocabulary, or a `PageCompatibilityService`-style function — that entire machinery has no analog here and should not be built speculatively.

## 6. Non-goals

- Freeform/drag-and-drop positioning — stays out of scope, same as Pages' own "no freeform builder" discipline; the whole value of "a limited Canva, not a blank canvas" (the Ad Designer's own framing) is preserved, just with more compositions to choose from, not more positioning freedom within one.
- Live platform image upload/sync back to Meta/Google/TikTok — already a V1 parking-lot item (`docs/../CLAUDE.md`'s "Live Meta/Google/TikTok API connectors" line); an `AdRendition` is a LOOPIE-hosted asset, not a synced platform creative, until that parking-lot item is picked up separately.
- `HouseAd`/`HouseAdPlacement` — untouched, unrelated feature.
- Any change to `AdRun`, `MediaOrderRevision`, `AdRunStatus`, `ProviderDeliveryState`, or the sync/budget/targeting machinery — all already correctly designed and out of this proposal's scope entirely.

## 7. Resolved: no compatibility evaluator

The previous draft of this doc left "does Ad Type↔Creative Layout need a compatibility contract" as an open question. It's now settled: **no.** Pages needed a real evaluator because a Page accumulates content across many edits and Layout switches; an ad creative is created essentially once per campaign concept and doesn't migrate between fundamentally different compositions after the fact (§2.2). The entire `PageTypeCapability`-shaped machinery — required/recommended/allowed, required/supported/unsupported, blockers/warnings, a `PageCompatibilityService`-style evaluator — has no analog on the Ads side. Ad Type/Creative Layout stays a plain, ungoverned mapping (one Ad Type → one Creative Layout, chosen at creation), smaller and simpler than anything else proposed in this doc, and this is the accepted answer, not a placeholder pending further confirmation.

## 8. Open question for the user

**Does real usage ever show Pages' and Ads' genre-like classifications should share the same vocabulary values, or should each domain's classification stay independent by default (§4)?** Recommend starting independent — Ads free to define its own values, sharing only the lookup-table _pattern_ — and revisiting only if a concrete case of real overlap shows up (e.g. a "Restaurant" business consistently wants the same tag driving both a Page Layout suggestion and an Ad Type suggestion). Not a blocker for the milestone in §5; the schema cost of merging two independent classification tables later is small compared to the cost of prematurely coupling Pages' and Ads' taxonomies now.
