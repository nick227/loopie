# External Ad Monitoring Contract (2026-08-29)

## Purpose and Status

Scoped in response to `docs/strategy/03-product-principles.md`'s Ownership Rule ("external platforms remain authoritative; LOOPIE's starting posture is connect/monitor/attribute") — that doc explicitly left the `AdRun` data-model and UI rework as "a real follow-up pass, not decided here." This is that pass, but **only the first half of it**: the six questions the rework was asked to answer, grounded in the actual schema and connector code, not a redesign. Per explicit instruction, this doc does not touch the UI — it defines the contract; making the Advertisements detail page read against it (monitoring-first, mutation demoted) is separate, follow-on work.

**Headline finding, stated up front because it changes the shape of the follow-on work**: the authority contract this doc was asked to define **already exists in the schema and the connector interface**, in close to the exact shape the product-principles doc's proposed invariant wants. This is not a schema migration. The gap is almost entirely about which parts of an already-correct data model the _UI_ treats as primary — a UI-sequencing decision, not a data-model rework. Section by section below shows the receipts.

## Question 1 — What is the minimal external-ad object LOOPIE needs to monitor Meta/Google?

Already defined, and it's `AdRun` as it exists today minus its mutation surface. The monitoring-relevant fields, all already on the schema (`packages/api-spec/openapi.yaml`'s `AdRun`):

```text
Identity/linking    id, advertisementId, platform, externalCampaignId, externalAdSetId,
                     externalAdId, trackedUrl, previewUrl, managerUrl
Platform-reported   providerState, providerStateRaw, providerIssues, spend, impressions,
  (read-only)        reach, clicks, conversions, effectiveBudget, effectiveStartDate,
                     effectiveEndDate, effectiveCountry, effectiveLocationNote,
                     effectiveRadiusMiles
Sync bookkeeping     syncHealth, syncError, lastSyncedAt
LOOPIE attribution   leads, sales, revenue (live-computed from Lead/Sale via sourceAdRunId —
  (read-only,         see Question 5 — never platform-reported, never editable)
   not platform)
```

That's the whole monitoring object. Nothing needs to be added to the schema to build a monitoring-first view — it can be built today by simply not rendering the mutation affordances (below) as primary.

## Question 2 — Which fields are authoritative from the platform vs. owned by LOOPIE?

The schema already encodes this as a **naming convention**, consistently applied, not something this doc has to invent:

| Category                               | Fields                                                                                                                                                                                                                                            | Who writes them                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What LOOPIE requested**              | `budget`, `startDate`, `endDate`, `country`, `locationNote`, `radiusMiles`                                                                                                                                                                        | LOOPIE, at send time (frozen per-send in `orderSnapshot`/`mediaOrderRevision` — see Question 6)                                                                                                                                                               |
| **What the platform actually reports** | `effectiveBudget`, `effectiveStartDate`, `effectiveEndDate`, `effectiveCountry`, `effectiveLocationNote`, `effectiveRadiusMiles`, `providerState`, `providerStateRaw`, `providerIssues`, `spend`, `impressions`, `reach`, `clicks`, `conversions` | The platform, via `AdRunSyncService`'s pull sync — **never writable by any LOOPIE UI action**, confirmed by reading `AdRunSyncService.ts`: the only write path to any `effective*`/`providerState`/`spend`/etc. field is inside `_sync()`'s `db.adRun.update` |
| **LOOPIE's own attribution layer**     | `leads`, `sales`, `revenue`                                                                                                                                                                                                                       | LOOPIE's own Lead/Sale pipeline, keyed by `sourceAdRunId` — not platform-reported at all, structurally can't drift against a platform value because there isn't one to compare against                                                                        |
| **Linking/reference**                  | `externalCampaignId`, `externalAdSetId`, `externalAdId`, `trackedUrl`, `previewUrl`, `managerUrl`                                                                                                                                                 | Set once at creation (`pushDraft`'s result), then read-only                                                                                                                                                                                                   |

The "requested vs. effective" split already _is_ the "authoritative from platform vs. owned by LOOPIE" split the question asks for — it was built for a slightly different stated purpose (showing drift) but is the identical distinction.

## Question 3 — Which fields stay editable for first-party ads only?

This question assumes `AdUnit` (first-party) and `AdRun` (external) are siblings under one parent that differ only in editability. **They're not siblings today, and that's a real gap worth flagging, not fixing here.** `AdUnit` (`packages/api-spec/openapi.yaml`) still belongs to the _legacy_ `Campaign`/`Creative` model (`campaignId`, `creativeId` — not `advertisementId`), not the `Advertisement` model `AdRun` belongs to. This is a known, previously-documented state, not a new discovery — CLAUDE.md's "Media/Advertisement/AdRun Migration Audit" explicitly scoped `AdUnit` as "deliberately separate" and out of that migration's reach.

Practically, this doesn't block the monitoring-contract work — `AdUnit` has no platform/sync concept at all (`status: DRAFT|ACTIVE|PAUSED|ENDED`, fully LOOPIE-controlled, no `provider*`/`effective*`/`sync*` fields exist on it because there's no external platform in the loop), so "First-party AdUnit = LOOPIE-owned mutable state" is already true by construction. What's incomplete is the _parent_ relationship — `AdUnit` should arguably hang off `Advertisement` the way `AdRun` does, for the invariant to be structurally clean rather than true-by-accident. **Not resolved here** — a real decision (migrate `AdUnit` onto `Advertisement`, or accept the two staying under different parents indefinitely) that's bigger than this contract pass and shouldn't be bundled into it.

## Question 4 — What does sync import?

Exactly what `SyncSnapshot` (`apps/server/src/lib/platforms/types.ts`) declares, and exactly what `AdRunSyncService._sync()` writes from it — both already real, both already the same list:

```text
providerState, providerStateRaw, issues → providerIssues
spend, impressions, reach, clicks, conversions
effectiveDailyBudget → effectiveBudget
effectiveStartAt/effectiveEndAt → effectiveStartDate/effectiveEndDate
effectiveCountry, effectiveLocationNote, effectiveRadiusMiles
```

Campaign/ad-set/ad **IDs** are not part of the sync payload — they're set once at creation (`pushDraft`'s result: `externalCampaignId`/`externalAdSetId`/`externalAdId`) and never re-pulled, which is correct: an ID isn't something that "drifts," it's the identity the sync call is keyed on. Budget/schedule/targeting/creative metadata as _requests_ aren't synced either — only their `effective*` counterparts are; the requested values are LOOPIE's own record of what was asked for (see Question 6's `orderSnapshot`/`mediaOrderRevision`).

**One real, load-bearing caveat**: only Meta has an actual connector (`apps/server/src/lib/platforms/registry.ts` registers exactly one, `META`). `GOOGLE` and `TIKTOK` are real enum values on `AdRun.platform` with zero implementation — any `AdRun` created against either would resolve `tryGetConnector` to `null` and permanently read `syncHealth: DISCONNECTED`. Worth being precise about this going forward: "Meta/Google" in casual conversation should not imply both are equally real today.

## Question 5 — How do external ads connect to LOOPIE attribution?

Already fully wired, not something to design. `sourceAdRunId` is a first-class field on `Lead`, `Sale`, and `Interaction` (all three, confirmed directly in the schema), alongside a `sourceType` enum value `AD_RUN` sitting next to the legacy `DEPLOYMENT`/`AD_UNIT`/`MESSAGE` values. The chain, end to end:

```text
GET /r/adrun/{adRunId} (tracked click, mirrors the legacy deployment-click redirect)
  → session cookie
  → landing page visit / form submission
  → identityResolution.ts resolves/creates Contact + Lead, stamping sourceAdRunId + sourceType: AD_RUN
  → SaleService.create() copies sourceAdRunId from the Lead onto the Sale
  → AdRun.leads/sales/revenue (on the DTO) are live-computed by summing Lead/Sale rows filtered
    on sourceAdRunId — not denormalized, not platform-reported, always current
```

This is the actual "ad → visit → lead → customer → revenue" chain the question asks about, and it's the same shared identity-resolution/attribution spine every other acquisition source (Deployment, AdUnit, Message) already uses — `AdRun` didn't get a special-cased attribution mechanism, it plugged into the existing one. Nothing to build here either.

## Question 6 — What survives from the current push-ready provisioning path without exposing it as the default UX yet?

**All of it, unchanged, at the code level — the connector contract is already structured to make this a UI decision, not a code decision.** `AdPlatformConnector`'s methods are individually optional and individually capability-gated:

```text
pushDraft            gated by capabilities.pushDraft   — creation
updateRemoteStatus    gated by activate/pause/end        — status mutation
updateBudget          gated by capabilities.editBudget    — budget mutation
updateSchedule        gated by capabilities.editSchedule  — schedule mutation
updateTargeting       gated by capabilities.editAudience  — targeting mutation
pullSync              gated by capabilities.pullStatus    — monitoring (the part staying primary)
```

Meta's connector currently declares every one of these `true` and implements all of them — so the mutation path isn't hypothetical or half-built, it's real and working (as real as it can be without a configured OAuth app in this environment — see the Shared Database / integrations session note about local dev having no live OAuth credentials, which is a deployment-config gap, not a code gap). Nothing here needs to be deleted, disabled, or feature-flagged off to make monitoring the default UX — it only needs to stop being what the UI reaches for first. `orderSnapshot`/`mediaOrderRevision` (the frozen, numbered, immutable record of what was actually requested at send time) also survives untouched — it's LOOPIE's own audit trail of its asks, independent of whether the UI currently invites the business to make more of them.

## The Invariant, Confirmed

**External `AdRun` = linked platform state + LOOPIE attribution state. First-party `AdUnit` = LOOPIE-owned mutable advertising state.**

Confirmed true of `AdRun` today: strip away the mutation affordances (which the connector contract already keeps structurally separate — Question 6) and what's left genuinely is "linked platform state" (`provider*`/`effective*`/`spend`/`impressions`/etc., all pull-only) plus "LOOPIE attribution state" (`leads`/`sales`/`revenue`, computed from the shared attribution spine, never platform-reported). Confirmed true of `AdUnit` by construction (Question 3) — it has no platform link at all, so everything on it is inherently LOOPIE-owned and mutable. The one asterisk: `AdUnit` sits under the wrong parent model to make the invariant _structurally_ clean (still `Campaign`, not `Advertisement`) — true in spirit, not yet true in shape. That's the one open architectural question this pass surfaces rather than resolves.

## What This Doc Does Not Do

- Does not change any schema, connector, or service code — everything above is a description of what already exists, cited by file, not a proposal.
- Does not resolve whether/when `AdUnit` migrates onto `Advertisement` — flagged (Question 3) as a real, separate, bigger decision.
- Does not address `GOOGLE`/`TIKTOK` having no real connector — flagged (Question 4) as a fact to be honest about, not a gap this pass closes.

## Follow-on: Monitoring-First UI (2026-08-29, later same day)

The field groupings above became the actual layout of `AdDestinationRow.tsx`'s `PaidRunRow` (the external-`AdRun` detail row) — implemented, not just planned:

- **Elevated outcomes tier** (new): Leads, Sales, Revenue, and a newly-computed ROAS (`revenue / spend`), in their own bordered/tinted block, reading first and boldest — the "attribution is LOOPIE's differentiator" instruction from Question 5, made literal.
- **Platform metrics tier**: Budget (now showing the platform's `effective` value once synced, falling back to the requested value only pre-sync), Spend, Reach, Clicks — read-only, secondary to outcomes.
- **Requested-vs-effective**: now conditional on the existing drift booleans (`budgetDrifted`/`scheduleDrifted`/`targetingDrifted`) instead of always rendering — "only when LOOPIE actually initiated a change," per instruction, reusing the exact signal `AdRunSyncService` already computes server-side for its own drift notifications.
- **Mutation moved behind a `Manage` action** (a `Modal`, not inline): budget/schedule/targeting edit triggers, pause/resume/end, replace creative/destination, and the stale-relaunch prompt all live there now. The trigger itself only renders when `canManage` is true (any real capability exists) — a platform with no connector (Google/TikTok today) or no granted capability collapses straight to "View only until {brand} can be updated from LOOPIE," which is the Question 9 honesty requirement enforced structurally rather than by copy alone.
- Nothing was deleted — every editor component (`BudgetEditor`/`ScheduleEditor`/`TargetingEditor`/`ReplaceDestinationPicker`) is unchanged, just triggered from inside Manage instead of inline.
